import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "ACE/templates",
        allowed_formats: ["png", "jpg", "jpeg"],
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/png",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
            const err = new Error("Only PNG images are allowed.");
        err.statusCode = 400;
        cb(err, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

export default upload;