import {
    parseCsvBuffer,
    rowsToObjects,
    isValidEmail,
    findColumnIndex,
    UNIFIED_HEADER_ALIASES,
    validateRequiredColumns,
    validateCheckInColumns,
} from "./csvService.js";

import { parseExcelBuffer } from "./excelService.js";

import { getParticipants } from "./googleSheetService.js";

import sheets from "../config/googleSheets.js";

import { extractGoogleId } from "../utils/eventHelpers.js";


// --------------------------------------------------
// Normalize field names
// --------------------------------------------------

const normalizeKey = (key = "") =>
    String(key)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();


// --------------------------------------------------
// Find a field using aliases
// --------------------------------------------------

const findField = (record, aliases) => {
    const entries = Object.entries(record);

    for (const alias of aliases) {
        const normalizedAlias = normalizeKey(alias);

        const match = entries.find(([key]) => {
            const normalized = normalizeKey(key);

            return (
                normalized === normalizedAlias ||
                normalized.startsWith(`${normalizedAlias} `)
            );
        });

        if (match && match[1] !== undefined && match[1] !== null) {
            return String(match[1]).trim();
        }
    }

    return "";
};


// --------------------------------------------------
// Normalize people from any source
// --------------------------------------------------

export const normalizePeople = (records = []) => {

    const seen = new Set();

    const people = [];

    for (const record of records) {

        const aceId = findField(
            record,
            UNIFIED_HEADER_ALIASES.aceId
        );

        const name = findField(
            record,
            UNIFIED_HEADER_ALIASES.name
        );

        const email = findField(
            record,
            UNIFIED_HEADER_ALIASES.email
        ).toLowerCase();

        const branch = findField(
            record,
            UNIFIED_HEADER_ALIASES.branch
        );

        const emailStatus = findField(
            record,
            UNIFIED_HEADER_ALIASES.emailStatus
        );


        // ------------------------------------------
        // Ignore invalid or duplicate emails
        // ------------------------------------------

        if (
            !email ||
            !isValidEmail(email) ||
            seen.has(email)
        ) {
            continue;
        }

        seen.add(email);


        // ------------------------------------------
        // Universal participant identity (Check-In).
        //
        // ACE member (ACE ID present):
        //     participantId = ACE ID
        //     memberType = "ace"
        //
        // Non-ACE member (no ACE ID):
        //     participantId = normalized email
        //     memberType = "non-ace"
        //
        // ACE IDs are normalized to uppercase here so they match
        // however a staff member types them during manual check-in
        // (see checkInService.processManualCheckIn, which applies the
        // same uppercase normalization to its input before querying —
        // both must stay in sync or manual check-in silently fails on
        // any case mismatch).
        // ------------------------------------------

        const normalizedAceId = String(aceId || "").trim().toUpperCase();

        const memberType = normalizedAceId ? "ace" : "non-ace";

        const participantId = normalizedAceId ? normalizedAceId : email;


        // ------------------------------------------
        // Store normalized participant
        // ------------------------------------------

        people.push({
            participantId,

            aceId: normalizedAceId || null,

            memberType,

            name: name || email.split("@")[0],

            email,

            branch,

            emailStatus,

            rowNumber: record.rowNumber,
        });
    }

    return people;
};


// --------------------------------------------------
// Resolve Google Sheet
// --------------------------------------------------

export const resolveGoogleSheet = async (
    event,
    sourceConfig = {}
) => {

    const sheetUrl =
        sourceConfig.googleSheetUrl ||
        event.googleSheet?.url ||
        "";


    const sheetId =
        sourceConfig.sheetId ||
        extractGoogleId(sheetUrl) ||
        event.googleSheet?.sheetId ||
        "";


    if (!sheetId) {
        throw new Error(
            "A linked Google Sheet URL is required. Google Form responses are read from the linked response sheet."
        );
    }


    let sheetName =
        sourceConfig.sheetName ||
        event.googleSheet?.sheetName ||
        "";


    // If sheet name is not provided,
    // use the first sheet in the spreadsheet.

    if (!sheetName) {

        const spreadsheet =
            await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            });

        sheetName =
            spreadsheet.data.sheets[0]
                .properties.title;
    }


    return {
        sheetId,
        sheetName,
        sheetUrl,
    };
};


// --------------------------------------------------
// Get recipients
// --------------------------------------------------

export const getRecipients = async ({
    source,
    event,
    sourceConfig = {},
    file,
    forCheckIn = false,
}) => {

    const resolvedSource =
        source || "googleForm";

    // Handle checkIn participants source
    if (resolvedSource === "checkIn" || resolvedSource === "checkInParticipants" || resolvedSource === "checkin") {
        const CheckIn = (await import("../models/CheckIn.js")).default;
        const checkIns = await CheckIn.find({ eventId: event._id }).sort({ name: 1 });
        if (!checkIns.length) {
            throw new Error("Check-In participants are not initialized for this event.");
        }
        return checkIns.map((doc, index) => ({
            participantId: doc.participantId,
            aceId: doc.aceId || null,
            memberType: doc.memberType,
            name: doc.name,
            email: doc.email,
            branch: "",
            emailStatus: "Pending",
            rowNumber: index + 2,
        }));
    }

    // Check-In participant files are validated with the lighter
    // Name+Email (ACE ID optional) rules instead of the strict
    // EBMS 5-column set used by marketing/automation. This flag is
    // opt-in and defaults to false, so every existing caller
    // (marketingService, automationController/automationService)
    // keeps its current EBMS-validated behavior unchanged.
    const validateColumns = forCheckIn
        ? validateCheckInColumns
        : validateRequiredColumns;


    // ==================================================
    // CSV
    // ==================================================

    if (resolvedSource === "csv") {

        if (!file?.buffer) {
            throw new Error(
                "CSV file is required."
            );
        }


        const rows =
            parseCsvBuffer(file.buffer);


        if (!rows.length) {
            throw new Error(
                "CSV file is empty."
            );
        }


        // ----------------------------------------------
        // Validate CSV structure (EBMS or Check-In rules)
        // ----------------------------------------------

        validateColumns(
            rows[0]
        );


        // ----------------------------------------------
        // Convert rows to objects
        // ----------------------------------------------

        const records =
            rowsToObjects(rows);


        // ----------------------------------------------
        // Normalize participants
        // ----------------------------------------------

        return normalizePeople(records);
    }


    // ==================================================
    // Excel
    // ==================================================

    if (resolvedSource === "excel") {

        if (!file?.buffer) {
            throw new Error(
                "Excel file is required."
            );
        }


        const rows =
            parseExcelBuffer(file.buffer);


        // ----------------------------------------------
        // Validate Excel structure (EBMS or Check-In rules)
        // ----------------------------------------------

        validateColumns(
            rows[0]
        );


        const records =
            rowsToObjects(rows);


        return normalizePeople(records);
    }


    // ==================================================
    // Google Sheet / Google Form
    // ==================================================

    const {
        sheetId,
        sheetName,
    } = await resolveGoogleSheet(
        event,
        {
            ...sourceConfig,

            googleSheetUrl:
                sourceConfig.googleSheetUrl ||
                event.preEvent?.sourceConfig
                    ?.googleSheetUrl ||
                event.googleSheet?.url,
        }
    );


    const participants =
        await getParticipants(
            sheetId,
            sheetName
        );


    return normalizePeople(
        participants
    );
};