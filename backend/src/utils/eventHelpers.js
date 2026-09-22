export const extractGoogleId = (url = "") =>
    url.match(/\/d\/([^/]+)/)?.[1] || "";

export const parseWorkflow = (body = {}) => {
    const raw = body.workflow || body.workflowType || "both";

    if (raw === "pre" || raw === "preEvent") {
        return { preEvent: true, postEvent: false };
    }

    if (raw === "post" || raw === "postEvent") {
        return { preEvent: false, postEvent: true };
    }

    if (typeof raw === "object") {
        return {
            preEvent: raw.preEvent !== false && raw.preEvent !== "false",
            postEvent: raw.postEvent !== false && raw.postEvent !== "false",
        };
    }

    return { preEvent: true, postEvent: true };
};

export const getDateKey = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
};

export const getLifecycleStatus = (eventDate) => {
    const eventKey = getDateKey(eventDate);
    const todayKey = getDateKey(new Date());

    if (!eventKey) return "upcoming";
    if (eventKey > todayKey) return "upcoming";
    if (eventKey === todayKey) return "ongoing";
    return "completed";
};

/**
 * Normalizes an event object to ensure all nested structures exist
 * and conform to the canonical schema. Handles backward compatibility
 * with old MongoDB documents.
 * 
 * Fixes:
 * - time → eventTime
 * - certificateEmail → postEvent.certificateEmailTemplate
 * - automation.participantSource → postEvent.participantSource
 * - Missing preEvent/postEvent structures
 * - Missing sentEmails arrays
 * - "google" source → "googleSheet"
 */
export const normalizeEvent = (event) => {
    if (!event) return null;

    const eventObj = event.toObject?.() || { ...event };

    // Fix time → eventTime for backward compatibility
    if (eventObj.time && !eventObj.eventTime) {
        eventObj.eventTime = eventObj.time;
    }
    if (!eventObj.eventTime) {
        eventObj.eventTime = "";
    }

    // Ensure preEvent structure exists
    if (!eventObj.preEvent) {
        eventObj.preEvent = {};
    }
    if (!eventObj.preEvent.emailTemplate) {
        eventObj.preEvent.emailTemplate = {
            subject: "",
            html: "",
        };
    }
    if (!eventObj.preEvent.sourceConfig) {
        eventObj.preEvent.sourceConfig = {};
    }
    if (!eventObj.preEvent.status) {
        eventObj.preEvent.status = "Idle";
    }
    if (!eventObj.preEvent.recipientSource) {
        eventObj.preEvent.recipientSource = "googleSheet";
    }
    if (!eventObj.preEvent.totalRecipients) {
        eventObj.preEvent.totalRecipients = 0;
    }
    if (!eventObj.preEvent.sent) {
        eventObj.preEvent.sent = 0;
    }
    if (!eventObj.preEvent.failed) {
        eventObj.preEvent.failed = 0;
    }
    if (!Array.isArray(eventObj.preEvent.sentEmails)) {
        eventObj.preEvent.sentEmails = [];
    }

    // Ensure postEvent structure exists
    if (!eventObj.postEvent) {
        eventObj.postEvent = {};
    }
    if (!eventObj.postEvent.certificateEmailTemplate) {
        // Try to migrate from old certificateEmail structure
        if (eventObj.certificateEmail) {
            eventObj.postEvent.certificateEmailTemplate = {
                subject: eventObj.certificateEmail.subject || "",
                html: eventObj.certificateEmail.html || "",
            };
        } else {
            eventObj.postEvent.certificateEmailTemplate = {
                subject: "",
                html: "",
            };
        }
    }
    if (!eventObj.postEvent.sourceConfig) {
        eventObj.postEvent.sourceConfig = {};
    }
    if (!eventObj.postEvent.status) {
        eventObj.postEvent.status = "Idle";
    }
    
    // Normalize participantSource: "google" → "googleSheet"
    let participantSource = eventObj.postEvent.participantSource;
    if (participantSource === "google") {
        eventObj.postEvent.participantSource = "googleSheet";
    }
    if (!eventObj.postEvent.participantSource) {
        eventObj.postEvent.participantSource = "googleSheet";
    }
    
    if (!eventObj.postEvent.totalRecipients) {
        eventObj.postEvent.totalRecipients = 0;
    }
    if (!eventObj.postEvent.sent) {
        eventObj.postEvent.sent = 0;
    }
    if (!eventObj.postEvent.failed) {
        eventObj.postEvent.failed = 0;
    }
    if (!Array.isArray(eventObj.postEvent.sentEmails)) {
        eventObj.postEvent.sentEmails = [];
    }

    // Ensure automation structure exists
    if (!eventObj.automation) {
        eventObj.automation = {};
    }
    if (!eventObj.automation.status) {
        eventObj.automation.status = "Idle";
    }
    if (!Array.isArray(eventObj.automation.sentEmails)) {
        eventObj.automation.sentEmails = [];
    }

    return eventObj;
};
