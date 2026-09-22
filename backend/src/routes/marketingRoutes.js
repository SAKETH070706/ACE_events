import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import dataUpload from "../middleware/dataUploadMiddleware.js";
import {
    previewRecipients,
    sendMarketingEmails,
    sendTestEmail,
    saveMarketingTemplate,
} from "../controllers/marketingController.js";
import {
    adminOnly
} from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.post(
    "/preview/:eventId",
    protect,
    dataUpload.single("file"),
    previewRecipients
);

router.post("/test/:eventId", protect, sendTestEmail);

router.post(
    "/send/:eventId",
    protect,
    dataUpload.single("file"),
    sendMarketingEmails
);

router.put("/:eventId/template", protect, saveMarketingTemplate);

export default router;
