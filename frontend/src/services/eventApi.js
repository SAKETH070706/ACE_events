import api from "./api";

export const getEvents = async (page = 1, limit = 10, filter = "all") => {
    const response = await api.get(
        `/events?page=${page}&limit=${limit}&filter=${filter}`
    );
    return response.data;
};

export const createEvent = async (formData) => {
    // The shared `api` instance below defaults to Content-Type:
    // application/json. For a FormData payload we must explicitly
    // clear that per-call (setting it to undefined removes the
    // instance default) — otherwise axios treats this as a JSON
    // request and stringifies the FormData instead of sending a real
    // multipart body, and the file never reaches multer on the
    // backend. We do NOT set it to "multipart/form-data" ourselves
    // either, since that value would be missing the required
    // boundary parameter — only the browser can generate that
    // correctly, and only if we don't set the header at all.
    const response = await api.post("/events", formData, {
        headers: { "Content-Type": undefined },
    });

    return response.data;
};

export const getEventById = async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
};

export const updateEvent = async (id, formData) => {
    // See the note in createEvent above.
    const response = await api.put(`/events/${id}`, formData, {
        headers: { "Content-Type": undefined },
    });

    return response.data;
};

export const updateEventSettings = async (id, data) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
};

export const archiveEvent = async (id, archived = true) => {
    const response = await api.put(`/events/${id}/archive`, { archived });
    return response.data;
};

export const deleteEvent = async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
};

export const configureCheckIn = async (eventId, data) => {
    const response = await api.put(`/events/${eventId}/checkin`, data);
    return response.data;
};
