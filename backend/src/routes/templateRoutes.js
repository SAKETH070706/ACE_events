import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {uploadTemplate,updateTemplateSettings} from "../controllers/templateController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
    "/upload",
    protect,
    adminOnly,
    upload.single("template"),
    uploadTemplate
);
router.put(
    "/:id/template",
    protect,
    adminOnly,
    updateTemplateSettings
);

export default router;