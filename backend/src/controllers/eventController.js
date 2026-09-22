import Event from "../models/Event.js";
import CheckIn from "../models/CheckIn.js";
import mongoose from "mongoose";
import { deleteImage } from "../services/cloudinaryService.js";
import sheets from "../config/googleSheets.js";
import { extractGoogleId, parseWorkflow, getLifecycleStatus, normalizeEvent } from "../utils/eventHelpers.js";
import {
    DEFAULT_CERTIFICATE_HTML,
    DEFAULT_CERTIFICATE_SUBJECT,
    DEFAULT_MARKETING_HTML,
    DEFAULT_MARKETING_SUBJECT,
} from "../utils/defaultTemplates.js";

const createEvent = async (req, res, next) => {
    try {
        const {
            eventName,
            description,
            eventDate,
            registrationSource,
            googleFormUrl,
            googleSheetUrl,
            venue,
            time,
            eventTime,
        } = req.body;

        if (!eventName || !eventDate) {
            const err = new Error("Event Name and Event Date are required.");
            err.statusCode = 400;
            throw err;
        }

        const workflow = parseWorkflow(req.body);

        if (workflow.postEvent && !req.file) {
            const err = new Error("Certificate template is required for post-event.");
            err.statusCode = 400;
            throw err;
        }

        let formId = "";
        let sheetId = "";
        let sheetName = "";

        if (registrationSource === "google" && (googleFormUrl || googleSheetUrl)) {
            if (googleFormUrl) {
                formId = extractGoogleId(googleFormUrl);
            }

            if (googleSheetUrl) {
                sheetId = extractGoogleId(googleSheetUrl);

                const spreadsheet = await sheets.spreadsheets.get({
                    spreadsheetId: sheetId,
                });

                sheetName = spreadsheet.data.sheets[0].properties.title;
            }
        }


        const event = await Event.create({
            eventName,
            description,
            eventDate,
            venue: venue || "",
            eventTime: time || eventTime || "",
            workflow,
            registrationSource: registrationSource || "google",

            googleForm: {
                url: googleFormUrl || "",
                formId,
            },

            googleSheet: {
                url: googleSheetUrl || "",
                sheetId,
                sheetName,
            },

            template: req.file
                ? {
                      url: req.file.path,
                      publicId: req.file.filename,
                  }
                : {},

            preEvent: {
                recipientSource: null,
                sourceConfig: {
                    googleFormUrl: googleFormUrl || "",
                    googleSheetUrl: googleSheetUrl || "",
                    sheetId,
                    sheetName,
                },
                emailTemplate: {
                    subject: DEFAULT_MARKETING_SUBJECT,
                    html: DEFAULT_MARKETING_HTML,
                },
                status: "Idle",
                totalRecipients: 0,
                sent: 0,
                failed: 0,
                sentEmails: [],
            },

            postEvent: {
                participantSource: null,
                sourceConfig: {},
                certificateEmailTemplate: {
                    subject: DEFAULT_CERTIFICATE_SUBJECT,
                    html: DEFAULT_CERTIFICATE_HTML,
                },
                status: "Idle",
                totalRecipients: 0,
                sent: 0,
                failed: 0,
                sentEmails: [],
            },

            automation: {
                status: "Idle",
                totalParticipants: 0,
                processed: 0,
                success: 0,
                failed: 0,
                currentParticipantIndex: 0,
                sentEmails: [],
            },
            
        });

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            event,
        });
    } catch (error) {
        if (req.file?.filename) {
            await deleteImage(req.file.filename);
        }
        next(error);
    }
};

const getAllEvents = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const filter = req.query.filter || "all";

        const query = {};

        if (filter === "archived") {
            query.archived = true;
        } else {
            query.archived = { $ne: true };

            const todayKey = new Date().toISOString().slice(0, 10);
            const startOfToday = new Date(`${todayKey}T00:00:00.000Z`);
            const startOfTomorrow = new Date(startOfToday);
            startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

            if (filter === "upcoming") {
                query.eventDate = { $gte: startOfTomorrow };
            } else if (filter === "ongoing") {
                query.eventDate = { $gte: startOfToday, $lt: startOfTomorrow };
            } else if (filter === "completed") {
                query.eventDate = { $lt: startOfToday };
            }
        }

        const [events, totalEvents] = await Promise.all([
            Event.find(query)
                .select(
                    "eventName eventDate eventTime venue registrationSource status automation workflow archived archivedAt createdAt checkIn"
                )
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Event.countDocuments(query),
        ]);

        return res.json({
            success: true,
            page,
            totalPages: Math.ceil(totalEvents / limit),
            totalEvents,
            events: events.map((event) => {
                const normalized = normalizeEvent(event);
                return {
                    ...normalized,
                    lifecycleStatus: getLifecycleStatus(event.eventDate),
                };
            }),
        });
    } catch (error) {
        next(error);
    }
};

    const getEventById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const err = new Error("Invalid Event ID.");
            err.statusCode = 400;
            throw err;
        }

        const event = await Event.findById(id);

        if (!event) {
            const err = new Error("Event not found.");
            err.statusCode = 404;
            throw err;
        }

        const normalized = normalizeEvent(event);

        res.status(200).json({
            success: true,
            event: {
                ...normalized,
                lifecycleStatus: getLifecycleStatus(event.eventDate),
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const err = new Error("Invalid Event ID.");
            err.statusCode = 400;
            throw err;
        }

        let event = await Event.findById(id);

        if (!event) {
            const err = new Error("Event not found.");
            err.statusCode = 404;
            throw err;
        }

        // Normalize event to handle old documents
        const normalizedEvent = normalizeEvent(event);
        Object.assign(event, normalizedEvent);

        const oldTemplate = event.template;

        event.eventName = req.body.eventName || event.eventName;
        event.description =
            req.body.description !== undefined
                ? req.body.description
                : event.description;
        event.eventDate = req.body.eventDate || event.eventDate;
        event.venue = req.body.venue !== undefined ? req.body.venue : event.venue;
        event.eventTime =
            req.body.time !== undefined || req.body.eventTime !== undefined
                ? req.body.time || req.body.eventTime
                : event.eventTime;
        event.registrationSource =
            req.body.registrationSource || event.registrationSource;

        if (req.body.workflow || req.body.workflowType) {
            event.workflow = parseWorkflow(req.body);
        }

        if (req.body.googleFormUrl) {
            event.googleForm.url = req.body.googleFormUrl;
            event.googleForm.formId = extractGoogleId(req.body.googleFormUrl);
        }

        if (req.body.googleSheetUrl) {
            event.googleSheet.url = req.body.googleSheetUrl;
            event.googleSheet.sheetId = extractGoogleId(req.body.googleSheetUrl);

            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: event.googleSheet.sheetId,
            });

            event.googleSheet.sheetName =
                spreadsheet.data.sheets[0].properties.title;
        }

        if (req.body.participantSource) {
            event.postEvent.participantSource = req.body.participantSource;
        }

        if (req.body.recipientSource) {
            event.preEvent.recipientSource = req.body.recipientSource;
        }

        if (req.body.certificateEmailSubject !== undefined) {
            event.postEvent.certificateEmailTemplate.subject = req.body.certificateEmailSubject;
        }

        if (req.body.certificateEmailHtml !== undefined) {
            event.postEvent.certificateEmailTemplate.html = req.body.certificateEmailHtml;
        }

        if (req.body.marketingSubject !== undefined) {
            event.preEvent.emailTemplate.subject = req.body.marketingSubject;
        }

        if (req.body.marketingHtml !== undefined) {
            event.preEvent.emailTemplate.html = req.body.marketingHtml;
        }

        if (req.file) {
            event.template.url = req.file.path;
            event.template.publicId = req.file.filename;
        }

        await event.save();

        if (req.file && oldTemplate?.publicId) {
            await deleteImage(oldTemplate.publicId);
        }

        const normalized = normalizeEvent(event);

        res.status(200).json({
            success: true,
            message: "Event updated successfully",
            event: normalized,
        });
    } catch (error) {
        if (req.file?.filename) {
            await deleteImage(req.file.filename);
        }
        next(error);
    }
};

const archiveEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const err = new Error("Invalid Event ID.");
            err.statusCode = 400;
            throw err;
        }

        const event = await Event.findById(id);

        if (!event) {
            const err = new Error("Event not found.");
            err.statusCode = 404;
            throw err;
        }

        const archived =
            req.body.archived === false || req.body.archived === "false"
                ? false
                : true;

        event.archived = archived;
        event.archivedAt = archived ? new Date() : null;

        await event.save();

        res.status(200).json({
            success: true,
            message: archived ? "Event archived." : "Event restored.",
            event,
        });
    } catch (error) {
        next(error);
    }
};

const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const err = new Error("Invalid Event ID.");
            err.statusCode = 400;
            throw err;
        }

        const event = await Event.findById(id);

        if (!event) {
            const err = new Error("Event not found.");
            err.statusCode = 404;
            throw err;
        }

        if (event.template?.publicId) {
            await deleteImage(event.template.publicId);
        }

        await event.deleteOne();
        await CheckIn.deleteMany({ eventId: id }).catch(() => {});

        res.status(200).json({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};


const configureCheckIn = async (req, res) => {
    try {
        const { eventId } = req.params;

        const {
            enabled,
            participantSource,
            sourceConfig,
            sessions,
            attendanceRequired,
        } = req.body;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found.",
            });
        }

        event.checkIn.enabled = enabled ?? false;

        event.checkIn.participantSource =
            participantSource ?? null;

        event.checkIn.sourceConfig =
            sourceConfig ?? {};

        event.checkIn.sessions =
            sessions ?? [];

        event.checkIn.attendanceRequired =
            attendanceRequired ?? 75;

        await event.save();

        return res.status(200).json({
            success: true,
            message: "Check-In configuration saved successfully.",
            checkIn: event.checkIn,
        });

    } catch (error) {
        console.error("Configure Check-In error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to configure Check-In.",
        });
    }
};

export {
    createEvent,
    getAllEvents,
    getEventById,
    configureCheckIn,
    updateEvent,
    archiveEvent,
    deleteEvent,
};
