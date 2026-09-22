import Event from "../models/Event.js";
import CheckIn from "../models/CheckIn.js";

import {
    createCheckInsForParticipants,
    generateParticipantQr,
    processCheckIn,
    processManualCheckIn,
} from "../services/checkInService.js";

import { getRecipients } from "../services/recipientService.js";

/*
 * Initialize Check-In records for all participants.
 *
 * The participants can come from:
 * CSV
 * Excel
 * Google Sheet
 */
export const initializeCheckIn = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found.",
            });
        }

        if (!event.checkIn?.enabled) {
            return res.status(400).json({
                success: false,
                message: "Check-In is not enabled for this event.",
            });
        }

        /*
         * Get the participant source.
         *
         * CSV / Excel come through multipart upload.
         * Google Sheet comes from event/source configuration.
         */
        const source =
            event.checkIn?.participantSource ||
            req.body?.source;

        const sourceConfig =
            event.checkIn?.sourceConfig ||
            {};

        const file = req.file;

        const participants = await getRecipients({
            source,
            event,
            sourceConfig,
            file,
            forCheckIn: true,
        });

        if (!participants.length) {
            return res.status(400).json({
                success: false,
                message: "No valid participants found.",
            });
        }

        const result =
            await createCheckInsForParticipants({
                event,
                participants,
            });

        return res.status(200).json({
            success: true,
            message: "Check-In records initialized successfully.",
            totalParticipants: participants.length,
            created: result.created.length,
            existing: result.existing.length,
            failed: result.failed.length,
            failures: result.failed,
        });
    } catch (error) {
        console.error(
            "Initialize Check-In error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to initialize Check-In.",
        });
    }
};


/*
 * Get all Check-In records for an event.
 */
export const getEventCheckIns = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }

        const checkIns = await CheckIn.find({
            eventId,
        }).sort({
            name: 1,
        });

        return res.status(200).json({
            success: true,
            count: checkIns.length,
            checkIns,
        });
    } catch (error) {
        console.error(
            "Get Check-Ins error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to load Check-In records.",
        });
    }
};


/*
 * Get a participant's QR image.
 *
 * The QR token is stored in the CheckIn record. Looked up by
 * participantId (the universal identity), not aceId — a non-ACE
 * participant has no aceId at all, so keying this lookup on aceId
 * would make QR generation impossible for them.
 */
export const getParticipantQr = async (req, res) => {
    try {
        const { eventId, participantId: rawParticipantId } = req.params;

        if (!eventId || !rawParticipantId) {
            return res.status(400).json({
                success: false,
                message:
                    "Event ID and participant ID are required.",
            });
        }

        // Same normalization rule as processManualCheckIn() —
        // email-shaped input is lowercased, ACE IDs are uppercased —
        // so this lookup isn't vulnerable to the same case-mismatch
        // issue manual check-in had.
        const trimmed = String(rawParticipantId).trim();
        const participantId = trimmed.includes("@")
            ? trimmed.toLowerCase()
            : trimmed.toUpperCase();

        const checkIn = await CheckIn.findOne({
            eventId,
            participantId,
        });

        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message:
                    "Participant Check-In record not found.",
            });
        }

        const qr = await generateParticipantQr({
            eventId,
            qrToken: checkIn.qrToken,
        });

        res.set("Content-Type", "image/png");

        return res.send(qr.buffer);
    } catch (error) {
        console.error(
            "Generate participant QR error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to generate QR code.",
        });
    }
};


/*
 * Process QR scanner result.
 *
 * IMPORTANT:
 * This endpoint should be protected by
 * staff/admin authentication.
 */
export const scanCheckIn = async (req, res) => {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({
                success: false,
                message: "QR token is required.",
            });
        }

        const result = await processCheckIn({
            qrToken,
        });

        /*
         * Business failures are returned as
         * controlled responses rather than
         * server errors.
         */
        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "QR Check-In error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to process QR check-in.",
        });
    }
};


/*
 * Manual Check-In fallback.
 *
 * Uses participantId (the universal identity), NOT aceId — a
 * non-ACE participant has no aceId, so requiring it here would make
 * manual check-in impossible for them. This also fixes a mismatch
 * with processManualCheckIn(), which has always expected
 * participantId as its parameter name; this controller was
 * previously passing `aceId` under that name, so participantId was
 * always undefined and manual check-in failed for every participant.
 */
export const manualCheckIn = async (req, res) => {
    try {
        const {
            eventId,
            participantId,
            sessionId,
        } = req.body;

        if (!eventId || !participantId || !sessionId) {
            return res.status(400).json({
                success: false,
                message:
                    "Event ID, participant ID and session ID are required.",
            });
        }

        const result =
            await processManualCheckIn({
                eventId,
                participantId,
                sessionId,
            });

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Manual Check-In error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to process manual check-in.",
        });
    }
};