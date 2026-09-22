import api from "./api";

export const updateTemplate = async (id, data) => {

    const response = await api.put(

        `/templates/${id}/template`,

        data

    );

    return response.data;

};

export const generatePreview = async (data) => {

    const response = await api.post(

        "/certificates/preview",

        data,

        {

            responseType: "blob"

        }

    );

    return response.data;

};