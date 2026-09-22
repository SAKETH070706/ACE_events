import {
    previewMarketingRecipients,
    runMarketingService,
    sendTestMarketingEmail,
} from "../services/marketingService.js";
import Event from "../models/Event.js";
import { normalizeEvent } from "../utils/eventHelpers.js";

const parseSourceConfig = (body = {}) => ({
    googleFormUrl: body.googleFormUrl,
    googleSheetUrl: body.googleSheetUrl,
    sheetId: body.sheetId,
    sheetName: body.sheetName,
});

export const previewRecipients = async (req, res) => {
    try {
        const result = await previewMarketingRecipients(req.params.eventId, {
            source: req.body.source || req.body.recipientSource,
            sourceConfig: parseSourceConfig(req.body),
            file: req.file,
        });

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        const statusCode = error.message === "Event not found" ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message,
        });
    }
};

export const sendTestEmail = async (req, res) => {
    try {
        const result = await sendTestMarketingEmail(
            req.params.eventId,
            req.body.testEmail || req.body.email
        );

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        const statusCode = error.message === "Event not found" ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message,
        });
    }
};

export const sendMarketingEmails = async (req, res) => {
    try {
        const result = await runMarketingService(req.params.eventId, {
            source: req.body.source || req.body.recipientSource,
            sourceConfig: parseSourceConfig(req.body),
            file: req.file,
            resendAll: req.body.resendAll === true || req.body.resendAll === "true",
        });

        res.status(200).json({
            success: true,
            result,
        });
    } catch (error) {
        let statusCode = 500;

        if (error.message === "Event not found") {
            statusCode = 404;
        } else if (error.message === "Marketing emails are already being sent.") {
            statusCode = 409;
        } else if (error.message) {
            statusCode = 400;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message,
        });
    }
};

export const saveMarketingTemplate = async (req, res, next) => {
    try {
        let event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        // Normalize event to handle old documents
        const normalizedEvent = normalizeEvent(event);
        Object.assign(event, normalizedEvent);

        if (req.body.recipientSource) {
            event.preEvent.recipientSource = req.body.recipientSource;
        }

        if (req.body.googleFormUrl !== undefined) {
            event.preEvent.sourceConfig.googleFormUrl = req.body.googleFormUrl;
        }

        if (req.body.googleSheetUrl !== undefined) {
            event.preEvent.sourceConfig.googleSheetUrl = req.body.googleSheetUrl;
        }

        if (req.body.subject !== undefined) {
            event.preEvent.emailTemplate.subject = req.body.subject;
        }

        if (req.body.html !== undefined) {
            event.preEvent.emailTemplate.html = req.body.html;
        }

        await event.save();

        res.json({
            success: true,
            preEvent: event.preEvent,
        });
    } catch (error) {
        next(error);
    }
};
