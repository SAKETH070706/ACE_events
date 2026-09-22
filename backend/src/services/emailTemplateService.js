export const renderTemplate = (template = "", variables = {}) => {
    return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        const value = variables[key];
        return value == null ? "" : String(value);
    });
};

export const formatEventDate = (eventDate) => {
    if (!eventDate) return "";
    const date = new Date(eventDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
};

export const buildEventVariables = (event = {}, extra = {}) => {
    const registrationLink =
        extra.registrationLink ||
        event.googleForm?.url ||
        "";

    return {
        eventName: event.eventName || "",
        eventDate: formatEventDate(event.eventDate),
        eventTime: event.eventTime || "",
        venue: event.venue || "",
        description: event.description || "",
        registrationLink,
        certificateName: extra.certificateName || event.eventName || "",
        ...extra,
    };
};
