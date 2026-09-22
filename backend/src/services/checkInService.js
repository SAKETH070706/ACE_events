import crypto from "crypto";
import QRCode from "qrcode";
import mongoose from "mongoose";
import CheckIn from "../models/CheckIn.js";
import Event from "../models/Event.js";


// ============================================================
// QR TOKEN
// ============================================================

const generateQrToken = () => {
    return crypto.randomBytes(32).toString("hex");
};


// ============================================================
// PARTICIPANT IDENTITY
// ============================================================

/*
 * Determine the universal participant identity.
 *
 * ACE member:
 *     participantId = ACE ID
 *     aceId = ACE ID
 *     memberType = "ace"
 *
 * Non-ACE participant:
 *     participantId = email
 *     aceId = null
 *     memberType = "non-ace"
 */
const getParticipantIdentity = (participant = {}) => {
    const email = String(participant.email || "")
        .trim()
        .toLowerCase();

    if (!email) {
        throw new Error("Participant email is required.");
    }

    // Must match recipientService.normalizePeople()'s normalization
    // exactly (uppercase), or a CheckIn created through one code path
    // won't be found by a lookup computed through the other.
    const aceId = String(participant.aceId || "").trim().toUpperCase();

    if (aceId) {
        return {
            participantId: aceId,
            aceId,
            memberType: "ace",
        };
    }

    return {
        participantId: email,
        aceId: null,
        memberType: "non-ace",
    };
};


// ============================================================
// TIME HELPERS
// ============================================================

/*
 * Convert HH:MM into minutes from midnight.
 *
 * "09:30" -> 570
 * "13:30" -> 810
 */
const timeToMinutes = (time = "") => {
    const [hours, minutes] = String(time)
        .split(":")
        .map(Number);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return hours * 60 + minutes;
};


// ============================================================
// IST DATE / TIME
// ============================================================

/*
 * Get today's date in YYYY-MM-DD format.
 *
 * Application currently assumes IST.
 */
const getCurrentDateIST = () => {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
    }).format(new Date());
};


/*
 * Get current time in IST as minutes from midnight.
 *
 * Example:
 * 10:30 AM -> 630
 */
const getCurrentTimeMinutesIST = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());

    const hour = Number(
        parts.find((part) => part.type === "hour")?.value
    );

    const minute = Number(
        parts.find((part) => part.type === "minute")?.value
    );

    return hour * 60 + minute;
};


// ============================================================
// CURRENT SESSION
// ============================================================

/*
 * Find the session that is currently active.
 */
export const getCurrentSession = (event) => {
    const sessions = event?.checkIn?.sessions || [];

    if (!sessions.length) {
        return null;
    }

    const currentDate = getCurrentDateIST();
    const currentMinutes = getCurrentTimeMinutesIST();

    return (
        sessions.find((session) => {
            if (session.date !== currentDate) {
                return false;
            }

            const startMinutes = timeToMinutes(
                session.startTime
            );

            const endMinutes = timeToMinutes(
                session.endTime
            );

            if (
                startMinutes === null ||
                endMinutes === null
            ) {
                return false;
            }

            return (
                currentMinutes >= startMinutes &&
                currentMinutes < endMinutes
            );
        }) || null
    );
};


// ============================================================
// CREATE CHECK-IN FOR ONE PARTICIPANT
// ============================================================

/*
 * Create or retrieve a CheckIn record for one participant.
 *
 * One participant gets ONE QR token for the entire event.
 */
export const createCheckInForParticipant = async ({
    event,
    participant,
}) => {
    if (!event?._id) {
        throw new Error("Event is required.");
    }

    const {
        participantId,
        aceId,
        memberType,
    } = getParticipantIdentity(participant);


    const normalizedEmail = String(
        participant.email
    )
        .trim()
        .toLowerCase();


    /*
     * Participant identity is:
     *
     * ACE:
     *     eventId + ACE ID
     *
     * Non-ACE:
     *     eventId + email
     */
    let checkIn = await CheckIn.findOne({
        eventId: event._id,
        participantId,
    });


    /*
     * Return existing record.
     */
    if (checkIn) {
        return checkIn;
    }


    /*
     * Create one QR token for the participant.
     */
    const qrToken = generateQrToken();


    /*
     * Snapshot the event sessions into
     * the participant's attendance record.
     */
    const sessions = (
        event.checkIn?.sessions || []
    ).map((session) => ({
        sessionId: session.sessionId,

        date: session.date,

        sessionName: session.name,

        checkedIn: false,

        checkedInAt: null,

        method: "qr",
    }));


    /*
     * Create CheckIn record.
     */
    checkIn = await CheckIn.create({
        eventId: event._id,

        participantId,

        aceId,

        memberType,

        name:
            participant.name ||
            normalizedEmail.split("@")[0],

        email: normalizedEmail,

        qrToken,

        sessions,

        totalSessions: sessions.length,

        attendedSessions: 0,

        attendancePercentage: 0,

        eligible: false,
    });


    return checkIn;
};


// ============================================================
// CREATE CHECK-IN RECORDS FOR ALL PARTICIPANTS
// ============================================================

export const createCheckInsForParticipants = async ({
    event,
    participants = [],
}) => {
    if (!event?._id) {
        throw new Error("Event is required.");
    }

    if (!event.checkIn?.enabled) {
        throw new Error(
            "Check-In is not enabled for this event."
        );
    }

    if (!participants.length) {
        throw new Error("No participants found.");
    }


    const results = {
        created: [],
        existing: [],
        failed: [],
    };


    for (const participant of participants) {
        try {

            const {
                participantId,
            } = getParticipantIdentity(
                participant
            );


            /*
             * Check using the universal participant ID.
             */
            const existing =
                await CheckIn.findOne({
                    eventId: event._id,
                    participantId,
                });


            if (existing) {
                results.existing.push(existing);
                continue;
            }


            const checkIn =
                await createCheckInForParticipant({
                    event,
                    participant,
                });


            results.created.push(checkIn);

        } catch (error) {

            results.failed.push({
                participantId:
                    participant?.participantId ||
                    participant?.aceId ||
                    participant?.email ||
                    "",

                aceId:
                    participant?.aceId || null,

                email:
                    participant?.email || "",

                error: error.message,
            });
        }
    }


    return results;
};


// ============================================================
// GENERATE PARTICIPANT QR
// ============================================================

/*
 * Generate the QR image.
 *
 * QR contains the frontend scanner URL.
 *
 * Scanning it does NOT directly mark attendance.
 */
export const generateParticipantQr = async ({
    eventId,
    qrToken,
}) => {
    if (!eventId) {
        throw new Error("Event ID is required.");
    }

    if (!qrToken) {
        throw new Error("QR token is required.");
    }

    if (!process.env.FRONTEND_URL) {
        throw new Error(
            "FRONTEND_URL is not configured."
        );
    }


    const checkInUrl =
        `${process.env.FRONTEND_URL}/checkin/scan/${qrToken}`;


    const qrBuffer = await QRCode.toBuffer(
        checkInUrl,
        {
            type: "png",

            errorCorrectionLevel: "H",

            width: 600,

            margin: 2,
        }
    );


    return {
        buffer: qrBuffer,
        url: checkInUrl,
    };
};


// ============================================================
// RECALCULATE ATTENDANCE
// ============================================================

export const recalculateAttendance = async (
    checkIn,
    event
) => {
    const totalSessions =
        checkIn.sessions.length;


    const attendedSessions =
        checkIn.sessions.filter(
            (session) =>
                session.checkedIn === true
        ).length;


    const attendancePercentage =
        totalSessions > 0
            ? Math.round(
                  (attendedSessions /
                      totalSessions) *
                      100
              )
            : 0;


    const requiredAttendance =
        event.checkIn?.attendanceRequired ?? 75;


    checkIn.totalSessions =
        totalSessions;

    checkIn.attendedSessions =
        attendedSessions;

    checkIn.attendancePercentage =
        attendancePercentage;

    checkIn.eligible =
        attendancePercentage >=
        requiredAttendance;


    await checkIn.save();


    return checkIn;
};


// ============================================================
// QR CHECK-IN
// ============================================================

/*
 * Process a QR check-in.
 *
 * This is the MAIN attendance function.
 */
export const processCheckIn = async ({
    qrToken,
}) => {
    if (!qrToken) {
        throw new Error("QR token is required.");
    }


    /*
     * 1. Find participant using QR token.
     */
    const checkIn =
        await CheckIn.findOne({
            qrToken,
        });


    if (!checkIn) {
        return {
            success: false,

            code: "INVALID_QR",

            message:
                "Invalid or unrecognized QR code.",
        };
    }


    /*
     * 2. Find event.
     */
    const event =
        await Event.findById(
            checkIn.eventId
        );


    if (!event) {
        return {
            success: false,

            code: "EVENT_NOT_FOUND",

            message:
                "Event associated with this QR was not found.",
        };
    }


    /*
     * 3. Check whether check-in is enabled.
     */
    if (!event.checkIn?.enabled) {
        return {
            success: false,

            code: "CHECKIN_DISABLED",

            message:
                "Check-in is not enabled for this event.",
        };
    }


    /*
     * 4. Determine active session.
     */
    const currentSession =
        getCurrentSession(event);


    if (!currentSession) {
        return {
            success: false,

            code: "NO_ACTIVE_SESSION",

            message:
                "There is no active check-in session right now.",
        };
    }


    /*
     * 5. Find or initialize matching participant session.
     */
    let attendanceSession =
        checkIn.sessions.find(
            (session) =>
                session.sessionId ===
                currentSession.sessionId
        );


    if (!attendanceSession) {
        attendanceSession = {
            sessionId: currentSession.sessionId,
            date: currentSession.date,
            sessionName: currentSession.name,
            checkedIn: false,
            checkedInAt: null,
            method: "qr",
        };
        checkIn.sessions.push(attendanceSession);
    }


    /*
     * 6. Prevent duplicate scanning.
     */
    if (attendanceSession.checkedIn) {
        return {
            success: false,

            code: "ALREADY_CHECKED_IN",

            message:
                "Participant is already checked in for this session.",

            participant: {
                participantId:
                    checkIn.participantId,

                aceId:
                    checkIn.aceId,

                memberType:
                    checkIn.memberType,

                name:
                    checkIn.name,

                email:
                    checkIn.email,
            },

            session: {
                sessionId:
                    currentSession.sessionId,

                name:
                    currentSession.name,

                date:
                    currentSession.date,
            },

            attendance: {
                attendedSessions:
                    checkIn.attendedSessions,

                totalSessions:
                    checkIn.totalSessions,

                percentage:
                    checkIn.attendancePercentage,

                eligible:
                    checkIn.eligible,
            },
        };
    }


    /*
     * 7. Record attendance.
     */
    attendanceSession.checkedIn = true;

    attendanceSession.checkedInAt =
        new Date();

    attendanceSession.method = "qr";


    /*
     * 8. Recalculate attendance.
     */
    await recalculateAttendance(
        checkIn,
        event
    );


    /*
     * 9. Return useful information
     *    to scanner UI.
     */
    return {
        success: true,

        code: "CHECKED_IN",

        message:
            "Participant checked in successfully.",

        participant: {
            participantId:
                checkIn.participantId,

            aceId:
                checkIn.aceId,

            memberType:
                checkIn.memberType,

            name:
                checkIn.name,

            email:
                checkIn.email,
        },

        session: {
            sessionId:
                currentSession.sessionId,

            name:
                currentSession.name,

            date:
                currentSession.date,

            startTime:
                currentSession.startTime,

            endTime:
                currentSession.endTime,
        },

        attendance: {
            attendedSessions:
                checkIn.attendedSessions,

            totalSessions:
                checkIn.totalSessions,

            percentage:
                checkIn.attendancePercentage,

            eligible:
                checkIn.eligible,
        },
    };
};


// ============================================================
// MANUAL CHECK-IN
// ============================================================

/*
 * Manual check-in.
 *
 * Supports both:
 *
 * ACE:
 *     participantId = ACE ID
 *
 * Non-ACE:
 *     participantId = email
 */
export const processManualCheckIn = async ({
    eventId,
    participantId,
    sessionId,
}) => {
    if (!eventId) {
        return {
            success: false,
            code: "EVENT_NOT_FOUND",
            message: "Event ID is required.",
        };
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return {
            success: false,
            code: "EVENT_NOT_FOUND",
            message: "Invalid Event ID provided.",
        };
    }

    if (!participantId) {
        return {
            success: false,
            code: "PARTICIPANT_NOT_FOUND",
            message: "Participant ID is required.",
        };
    }

    if (!sessionId) {
        return {
            success: false,
            code: "SESSION_NOT_FOUND",
            message: "Session ID is required.",
        };
    }

    /*
     * 1. Find event.
     */
    const event = await Event.findById(eventId);

    if (!event) {
        return {
            success: false,
            code: "EVENT_NOT_FOUND",
            message: "Event was not found.",
        };
    }

    /*
     * 2. Check whether check-in is enabled.
     */
    if (!event.checkIn?.enabled) {
        return {
            success: false,
            code: "CHECKIN_DISABLED",
            message: "Check-in is not enabled for this event.",
        };
    }

    /*
     * 3. Find requested session.
     */
    const eventSession = event.checkIn?.sessions?.find(
        (session) => session.sessionId === sessionId
    );

    if (!eventSession) {
        return {
            success: false,
            code: "SESSION_NOT_FOUND",
            message: "Session was not found for this event.",
        };
    }

    const rawParticipantId = String(participantId).trim();

    // Same rule as recipientService.normalizePeople() /
    // getParticipantIdentity(): email-shaped input is lowercased,
    // everything else (an ACE ID) is uppercased.
    const normalizedParticipantId = rawParticipantId.includes("@")
        ? rawParticipantId.toLowerCase()
        : rawParticipantId.toUpperCase();

    /*
     * 4. Find participant using the
     * universal participant identity.
     */
    const checkIn = await CheckIn.findOne({
        eventId: event._id,
        participantId: normalizedParticipantId,
    });

    if (!checkIn) {
        return {
            success: false,
            code: "PARTICIPANT_NOT_FOUND",
            message: "Participant was not found for this event.",
        };
    }

    /*
     * 5. Find or initialize participant's attendance session.
     */
    let attendanceSession = checkIn.sessions.find(
        (session) => session.sessionId === sessionId
    );

    if (!attendanceSession) {
        attendanceSession = {
            sessionId: eventSession.sessionId,
            date: eventSession.date,
            sessionName: eventSession.name,
            checkedIn: false,
            checkedInAt: null,
            method: "manual",
        };
        checkIn.sessions.push(attendanceSession);
    }

    /*
     * 6. Prevent duplicate attendance.
     */
    if (attendanceSession.checkedIn) {
        return {
            success: false,
            code: "ALREADY_CHECKED_IN",
            message: "Participant is already checked in for this session.",
            participant: {
                participantId: checkIn.participantId,
                aceId: checkIn.aceId,
                memberType: checkIn.memberType,
                name: checkIn.name,
                email: checkIn.email,
            },
            session: {
                sessionId: eventSession.sessionId,
                name: eventSession.name,
                date: eventSession.date,
            },
            attendance: {
                attendedSessions: checkIn.attendedSessions,
                totalSessions: checkIn.totalSessions,
                percentage: checkIn.attendancePercentage,
                eligible: checkIn.eligible,
            },
        };
    }

    /*
     * 7. Mark manual attendance.
     */
    attendanceSession.checkedIn = true;
    attendanceSession.checkedInAt = new Date();
    attendanceSession.method = "manual";

    /*
     * 8. Recalculate attendance.
     */
    await recalculateAttendance(checkIn, event);

    return {
        success: true,
        code: "CHECKED_IN",
        message: "Participant manually checked in successfully.",
        participant: {
            participantId: checkIn.participantId,
            aceId: checkIn.aceId,
            memberType: checkIn.memberType,
            name: checkIn.name,
            email: checkIn.email,
        },
        session: {
            sessionId: eventSession.sessionId,
            name: eventSession.name,
            date: eventSession.date,
        },
        attendance: {
            attendedSessions: checkIn.attendedSessions,
            totalSessions: checkIn.totalSessions,
            percentage: checkIn.attendancePercentage,
            eligible: checkIn.eligible,
        },
    };
};