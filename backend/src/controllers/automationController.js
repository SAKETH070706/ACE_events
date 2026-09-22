import { runAutomationService } from "../services/automationService.js";
import Event from "../models/Event.js";
import { getRecipients } from "../services/recipientService.js";
import { normalizeEvent } from "../utils/eventHelpers.js";

import { checkGoogleSheetColumns } from "../services/googleSheetService.js";
// Validate Google Sheet columns exist before running automation
export const validateGoogleSheetColumns = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        // Only validate if using Google Sheet as participant source
        if (event.postEvent?.participantSource !== "googleSheet") {
            return res.status(200).json({
                success: true,
                message: "Not using Google Sheet - validation skipped",
                columnsValid: true
            });
        }

        const sheetId = event.googleSheet?.sheetId;
        const sheetName = event.googleSheet?.sheetName || "Form Responses 1";

        if (!sheetId) {
            return res.status(400).json({
                success: false,
                message: "Google Sheet ID not found for this event",
            });
        }

        try {
            await checkGoogleSheetColumns(sheetId, sheetName);
            
            res.status(200).json({
                success: true,
                message: "All required columns exist in Google Sheet",
                columnsValid: true
            });
        } catch (colError) {
            res.status(400).json({
                success: false,
                message: colError.message,
                columnsValid: false
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const previewParticipants = async (req, res) => {
    try {
        let event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        // Normalize event to handle old documents
        const normalized = normalizeEvent(event);
        Object.assign(event, normalized);

        const participantSource =
            req.body.participantSource ||
            event.postEvent?.participantSource ||
            "googleSheet";

        const participants = await getRecipients({
            source: participantSource,
            event,
            sourceConfig: {
                googleSheetUrl: event.googleSheet?.url,
                sheetId: event.googleSheet?.sheetId,
                sheetName: event.googleSheet?.sheetName,
            },
            file: req.file,
        });

        res.status(200).json({
            success: true,
            total: participants.length,
            participants: participants.map(({ aceId, name, email, branch, emailStatus }) => ({
                aceId,
                name,
                email,
                branch,
                emailStatus,
            })),
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const runAutomation = async (req, res) => {

    try {

        if (req.body.participantSource) {
            await Event.findByIdAndUpdate(
                req.params.eventId,
                {
                    "postEvent.participantSource": req.body.participantSource,
                },
                { runValidators: true }
            );
        }

        const result = await runAutomationService(
            req.params.eventId,
            req.file
        );

        res.status(200).json({
            success: true,
            result
        });

    } catch (error) {

        let statusCode = 500;

        // Event does not exist
        if (error.message === "Event not found") {
            statusCode = 404;
        }

        // Another automation is already running
        else if (error.message === "Automation is already running.") {
            statusCode = 409;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }

};