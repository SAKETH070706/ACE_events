import api from "./api";

const formDataConfig = { headers: { "Content-Type": undefined } };

/**
 * Configure Check-In settings for an event (Admin only).
 */
export const configureCheckIn = async (eventId, checkInData) => {
    const response = await api.put(`/events/${eventId}/checkin`, checkInData);
    return response.data;
};

/**
 * Initialize Check-In records for all participants (Admin only).
 * Accepts FormData (for CSV/Excel upload) or JSON (for Google Sheet source).
 */
export const initializeCheckIn = async (eventId, data) => {
    const isFormData = data instanceof FormData;
    const response = await api.post(
        `/checkin/${eventId}/initialize`,
        data,
        isFormData ? formDataConfig : undefined
    );
    return response.data;
};

/**
 * Get all Check-In records for an event (Admin only).
 */
export const getEventCheckIns = async (eventId) => {
    const response = await api.get(`/checkin/${eventId}`);
    return response.data;
};

/**
 * Get a participant's QR code image blob (Admin only).
 * Uses universal participantId (ACE ID or Email).
 */
export const getParticipantQr = async (eventId, participantId) => {
    const response = await api.get(
        `/checkin/${eventId}/qr/${encodeURIComponent(participantId)}`,
        {
            responseType: "blob",
        }
    );
    return response.data;
};

/**
 * Process a QR scanner token (Admin + Scanner).
 */
export const scanCheckIn = async (qrToken) => {
    const response = await api.post("/checkin/scan", { qrToken });
    return response.data;
};

/**
 * Manual participant Check-In fallback (Admin + Scanner).
 * Universal identifier: participantId (ACE ID or Email).
 */
export const manualCheckIn = async ({ eventId, participantId, sessionId }) => {
    const response = await api.post("/checkin/manual", {
        eventId,
        participantId: String(participantId).trim(),
        sessionId,
    });
    return response.data;
};
