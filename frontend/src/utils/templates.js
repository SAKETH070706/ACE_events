export const getLifecycleStatus = (eventDate) => {
    if (!eventDate) return "upcoming";

    const eventKey = new Date(eventDate).toISOString().slice(0, 10);
    const todayKey = new Date().toISOString().slice(0, 10);

    if (eventKey > todayKey) return "upcoming";
    if (eventKey === todayKey) return "ongoing";
    return "completed";
};

export const renderTemplate = (template = "", variables = {}) =>
    String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        const value = variables[key];
        return value == null ? "" : String(value);
    });

export const buildPreviewVariables = (event = {}, extra = {}) => ({
    recipientName: extra.recipientName || "Alex Kumar",
    participantName: extra.participantName || "Alex Kumar",
    eventName: event.eventName || "",
    eventDate: event.eventDate
        ? new Date(event.eventDate).toLocaleDateString()
        : "",
    eventTime: event.eventTime || "",
    venue: event.venue || "",
    description: event.description || "",
    registrationLink: event.googleForm?.url || "",
    certificateName: event.eventName || "",
    ...extra,
});
