import api from "./api";

// See the note in automationApi.js — Content-Type must be explicitly
// cleared (not set to "multipart/form-data") for FormData requests.
const formDataConfig = { headers: { "Content-Type": undefined } };

export const previewRecipients = async (eventId, formData) => {
    const response = await api.post(
        `/marketing/preview/${eventId}`,
        formData,
        formDataConfig
    );

    return response.data;
};

export const sendTestMarketingEmail = async (eventId, testEmail) => {
    const response = await api.post(`/marketing/test/${eventId}`, { testEmail });
    return response.data;
};

export const sendMarketingEmails = async (eventId, formData) => {
    const response = await api.post(
        `/marketing/send/${eventId}`,
        formData,
        formDataConfig
    );

    return response.data;
};

export const saveMarketingTemplate = async (eventId, data) => {
    const response = await api.put(`/marketing/${eventId}/template`, data);
    return response.data;
};
