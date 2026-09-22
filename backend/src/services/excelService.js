import * as XLSX from "xlsx";

// NOTE: this no longer validates or converts to objects internally --
// it only parses the raw rows, exactly mirroring csvService.parseCsvBuffer's
// separation of concerns (parse -> validate -> rowsToObjects -> normalizePeople).
// This lets the caller (recipientService.getRecipients) choose EBMS validation
// (validateRequiredColumns) for marketing/automation, or the lighter
// Check-In validation (validateCheckInColumns) for Check-In imports,
// without duplicating the Excel-reading logic for each.
export const parseExcelBuffer = (buffer) => {

    const workbook = XLSX.read(buffer, {
        type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error("Excel file does not contain any sheets.");
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
    });

    if (!rows.length) {
        throw new Error("Excel file is empty.");
    }

    return rows;
};
