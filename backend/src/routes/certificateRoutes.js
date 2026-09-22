import express from "express";
import { previewCertificate } from "../controllers/certificateController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
    adminOnly
} from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.post("/preview", protect, previewCertificate);

export default router;