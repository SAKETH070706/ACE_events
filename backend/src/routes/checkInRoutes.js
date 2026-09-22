import express from "express";

import {
    initializeCheckIn,
    getEventCheckIns,
    getParticipantQr,
    scanCheckIn,
    manualCheckIn,
} from "../controllers/checkInController.js";

import dataUpload from "../middleware/dataUploadMiddleware.js";

import {
    protect
} from "../middleware/authMiddleware.js";

import {
    adminOnly,
    scannerAccess
} from "../middleware/roleMiddleware.js";

const router = express.Router();


// ============================================
// ADMIN ONLY
// ============================================

router.post(
    "/:eventId/initialize",
    protect,
    adminOnly,
    dataUpload.single("file"),
    initializeCheckIn
);

router.get(
    "/:eventId",
    protect,
    adminOnly,
    getEventCheckIns
);

router.get(
    "/:eventId/qr/:participantId",
    protect,
    adminOnly,
    getParticipantQr
);


// ============================================
// ADMIN + SCANNER
// ============================================

router.post(
    "/scan",
    protect,
    scannerAccess,
    scanCheckIn
);

router.post(
    "/manual",
    protect,
    scannerAccess,
    manualCheckIn
);


export default router;