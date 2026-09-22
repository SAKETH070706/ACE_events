import cloudinary from "../config/cloudinary.js";

export const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);

        return result;
    } catch (error) {
        throw new Error("Failed to delete image from Cloudinary.");
    }
};