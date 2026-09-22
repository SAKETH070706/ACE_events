import sheets from "../config/googleSheets.js";


import {
    UNIFIED_HEADER_ALIASES,
    normalizeHeader,
    findColumnIndex,
} from "./csvService.js";
export const getParticipants = async (
    spreadsheetId,
    sheetName = "Form Responses 1"
) => {
    try {

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName
        });

        const rows = response.data.values || [];

        if (rows.length === 0) {
            return [];
        }

        const headers = rows[0];

        const columnIndex = {
            aceId: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.aceId),
            name: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.name),
            email: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.email),
            branch: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.branch),
            section: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.section),
            phone: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.phone),
            certificateSent: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.certificateSent),
            status: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.status),
            sentAt: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.sentAt)
        };

        const participants = rows.slice(1).map((row, index) => ({

            rowNumber: index + 2,

            aceId:
                columnIndex.aceId !== -1
                    ? row[columnIndex.aceId] || ""
                    : "",

            name:
                columnIndex.name !== -1
                    ? row[columnIndex.name] || ""
                    : "",

            email:
                columnIndex.email !== -1
                    ? row[columnIndex.email] || ""
                    : "",

            branch:
                columnIndex.branch !== -1
                    ? row[columnIndex.branch] || ""
                    : "",

            section:
                columnIndex.section !== -1
                    ? row[columnIndex.section] || ""
                    : "",

            phone:
                columnIndex.phone !== -1
                    ? row[columnIndex.phone] || ""
                    : "",

            certificateSent:
                columnIndex.certificateSent !== -1
                    ? row[columnIndex.certificateSent] || ""
                    : "",

            status:
                columnIndex.status !== -1
                    ? row[columnIndex.status] || ""
                    : "",

            sentAt:
                columnIndex.sentAt !== -1
                    ? row[columnIndex.sentAt] || ""
                    : ""

        }));

        return participants;

    } catch (error) {
        throw new Error(
            `Failed to fetch participants: ${error.message}`
        );
    }
};

export const updateParticipantStatus = async (
    spreadsheetId,
    rowNumber,
    updates,
    sheetName = "Form Responses 1"
) => {
    try {

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values || [];

        if (rows.length === 0) {
            throw new Error("Sheet is empty");
        }

        const headers = rows[0];

        const getColumnLetter = (column) => {
            let letter = "";

            while (column >= 0) {
                letter = String.fromCharCode((column % 26) + 65) + letter;
                column = Math.floor(column / 26) - 1;
            }

            return letter;
        };

        const columnIndex = {
            certificateSent: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.certificateSent),
            status: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.status),
            sentAt: findColumnIndex(headers, UNIFIED_HEADER_ALIASES.sentAt),
        };

        const values = [];

        if (columnIndex.certificateSent !== -1) {
            values.push({
                range: `${sheetName}!${getColumnLetter(columnIndex.certificateSent)}${rowNumber}`,
                values: [[updates.certificateSent]]
            });
        }

        if (columnIndex.status !== -1) {
            values.push({
                range: `${sheetName}!${getColumnLetter(columnIndex.status)}${rowNumber}`,
                values: [[updates.status]]
            });
        }

        if (columnIndex.sentAt !== -1) {
            values.push({
                range: `${sheetName}!${getColumnLetter(columnIndex.sentAt)}${rowNumber}`,
                values: [[updates.sentAt]]
            });
        }
        
        if (values.length === 0) {
    throw new Error(
        'Required columns (Certificate Sent, Status, Sent At) were not found in the Google Sheet.'
    );
}

        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
                valueInputOption: "USER_ENTERED",
                data: values,
            },
        });

        return true;

    } catch (error) {
        throw new Error(`Failed to update participant: ${error.message}`);
    }
};

// Check if required columns exist in the Google Sheet
export const checkGoogleSheetColumns = async (
    spreadsheetId,
    sheetName = "Form Responses 1"
) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName
        });

        const rows = response.data.values || [];

        if (rows.length === 0) {
            throw new Error("Google Sheet is empty or not accessible");
        }

        const headers = rows[0];

        const certificateSentIndex = findColumnIndex(headers, UNIFIED_HEADER_ALIASES.certificateSent);
        const statusIndex = findColumnIndex(headers, UNIFIED_HEADER_ALIASES.status);
        const sentAtIndex = findColumnIndex(headers, UNIFIED_HEADER_ALIASES.sentAt);

        const missingColumns = [];

        if (certificateSentIndex === -1) {
            missingColumns.push("Certificate Sent");
        }
        if (statusIndex === -1) {
            missingColumns.push("Status");
        }
        if (sentAtIndex === -1) {
            missingColumns.push("Sent At");
        }

        if (missingColumns.length > 0) {
            throw new Error(
                `Required columns not found in Google Sheet: ${missingColumns.join(", ")}. ` +
                `Please ensure your sheet has columns with headers like: "Certificate Sent", "Status", and "Sent At"`
            );
        }

        return true;

    } catch (error) {
        if (error.message.includes("Required columns")) {
            throw error;
        }
        throw new Error(`Failed to validate Google Sheet columns: ${error.message}`);
    }
};
