import multer from "multer";

const dataUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(csv|xlsx|xls)$/i.test(file.originalname);

        if (allowed) {
            cb(null, true);
            return;
        }

        const err = new Error("Only CSV and Excel files are allowed.");
        err.statusCode = 400;
        cb(err, false);
    },
});

export default dataUpload;
