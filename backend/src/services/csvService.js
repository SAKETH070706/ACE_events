const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email = "") =>
    EMAIL_REGEX.test(String(email).trim());


// --------------------------------------------------
// Normalize header
// --------------------------------------------------

export const normalizeHeader = (header = "") => {
    return String(header)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};


// --------------------------------------------------
// CSV Parser
// --------------------------------------------------

export const parseCsvBuffer = (buffer) => {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");

    const rows = [];

    let current = [];
    let field = "";
    let inQuotes = false;

    const pushField = () => {
        current.push(field);
        field = "";
    };

    const pushRow = () => {
        if (current.some((value) => String(value).trim() !== "")) {
            rows.push(current);
        }

        current = [];
    };

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        // Handle quotes
        if (char === '"') {
            if (inQuotes && next === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }

            continue;
        }

        // Handle commas
        if (char === "," && !inQuotes) {
            pushField();
            continue;
        }

        // Handle new lines
        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") {
                i++;
            }

            pushField();
            pushRow();

            continue;
        }

        field += char;
    }

    // Handle final field/row
    if (field.length || current.length) {
        pushField();
        pushRow();
    }

    return rows;
};


// --------------------------------------------------
// Convert rows → objects
// --------------------------------------------------

export const rowsToObjects = (rows = []) => {
    if (!rows.length) return [];

    const headers = rows[0].map((header) =>
        normalizeHeader(header)
    );

    return rows.slice(1).map((row, index) => {
        const record = {
            rowNumber: index + 2,
        };

        headers.forEach((header, columnIndex) => {
            if (!header) return;

            record[header] = row[columnIndex] ?? "";
        });

        return record;
    });
};


// --------------------------------------------------
// Unified header aliases
// --------------------------------------------------

export const UNIFIED_HEADER_ALIASES = {

    aceId: [
        "ace id",
        "aceid",
        "ace_id",
    ],

    name: [
        "name",
        "full name",
        "participant name",
        "participant",
        "full_name",
    ],

    email: [
        "email",
        "mail",
        "e-mail",
        "email address",
    ],

    branch: [
        "branch",
        "department",
        "dept",
        "team",
    ],

    emailStatus: [
        "email status",
        "email_status",
        "mail status",
        "mail_status",
    ],

    // Not part of the EBMS-required set above, but still consumed by
    // googleSheetService.js for participants pulled from a Google Sheet
    // (which isn't EBMS-controlled and doesn't follow the fixed EBMS
    // column layout). Keeping these here avoids findColumnIndex()
    // receiving `undefined` for these keys, which throws immediately.
    section: [
        "section",
        "class",
        "group",
        "batch",
    ],

    phone: [
        "phone",
        "mobile",
        "contact",
        "phone number",
        "mobile number",
    ],

    certificateSent: [
        "certificate sent",
        "cert sent",
        "certificate status",
        "cert status",
    ],

    status: [
        "status",
        "completion status",
    ],

    sentAt: [
        "sent at",
        "date sent",
        "time sent",
        "completion date",
    ],
};


// --------------------------------------------------
// Find column index
// --------------------------------------------------

export const findColumnIndex = (headers, aliases) => {

    return headers.findIndex((header) => {

        const normalized = normalizeHeader(header);

        return aliases.some((alias) => {

            const normalizedAlias = normalizeHeader(alias);

            return (
                normalized === normalizedAlias ||
                normalized.startsWith(`${normalizedAlias} `)
            );
        });
    });
};


// --------------------------------------------------
// Validate required columns
// --------------------------------------------------

export const validateRequiredColumns = (headers) => {

    const requiredColumns = {
        aceId: "ACE ID",
        name: "Name",
        email: "Email",
        branch: "Branch",
        emailStatus: "Email Status",
    };

    const missingColumns = [];

    for (const [key, displayName] of Object.entries(requiredColumns)) {

        const index = findColumnIndex(
            headers,
            UNIFIED_HEADER_ALIASES[key]
        );

        if (index === -1) {
            missingColumns.push(displayName);
        }
    }

    if (missingColumns.length > 0) {

        throw new Error(
            `Invalid file format. Missing required columns: ${missingColumns.join(
                ", "
            )}. Required columns are: ACE ID, Name, Email, Branch, Email Status.`
        );
    }

    return true;
};


// --------------------------------------------------
// Validate Check-In columns
// --------------------------------------------------
//
// Check-In participant files are NOT EBMS-controlled — they support
// BOTH ACE members (with an ACE ID) and non-ACE members (no ACE ID).
// Only Name and Email are required at the column level; ACE ID is
// optional and its presence/absence is what normalizePeople() uses
// to decide memberType ("ace" vs "non-ace"). This intentionally does
// NOT require Branch/Email Status/ACE ID the way validateRequiredColumns()
// (the EBMS validator used by marketing/automation) does — the two
// validators are kept separate so Check-In imports never inherit the
// unrelated EBMS structure, and so existing EBMS-based features are
// completely unaffected by this addition.

export const validateCheckInColumns = (headers) => {

    const requiredColumns = {
        name: "Name",
        email: "Email",
    };

    const missingColumns = [];

    for (const [key, displayName] of Object.entries(requiredColumns)) {

        const index = findColumnIndex(
            headers,
            UNIFIED_HEADER_ALIASES[key]
        );

        if (index === -1) {
            missingColumns.push(displayName);
        }
    }

    if (missingColumns.length > 0) {

        throw new Error(
            `Invalid Check-In file format. Missing required columns: ${missingColumns.join(
                ", "
            )}. Required columns are: Name, Email. ACE ID is optional.`
        );
    }

    return true;
};