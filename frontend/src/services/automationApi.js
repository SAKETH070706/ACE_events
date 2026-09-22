import api from "./api";

// The shared `api` instance defaults its Content-Type header to
// application/json. For FormData requests that must be explicitly
// cleared per-call (setting it to undefined removes the instance
// default) — otherwise axios stringifies the FormData as JSON instead
// of sending a real multipart body, and multer on the backend never
// sees a file at all. We also must NOT set Content-Type to
// "multipart/form-data" ourselves, since that value is missing the
// required boundary parameter that only the browser can generate,
// and only when we don't set the header at all.
//
// This was the actual root cause of CSV/Excel uploads finding "0
// participants" — the request body was malformed/misrouted before
// any of our CSV/Excel/Sheet parsing code ever ran.
const formDataConfig = { headers: { "Content-Type": undefined } };

export const runAutomation = async (eventId, formData) => {
    const response = await api.post(
        `/automation/run/${eventId}`,
        formData || {},
        formData ? formDataConfig : {}
    );

    return response.data;
};

export const previewParticipants = async (eventId, formData) => {
    const response = await api.post(
        `/automation/preview/${eventId}`,
        formData || {},
        formData ? formDataConfig : {}
    );

    return response.data;
};

