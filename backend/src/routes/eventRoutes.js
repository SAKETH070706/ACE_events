import express from "express";

import upload from "../middleware/uploadMiddleware.js";

import {
    createEvent,
    getAllEvents,
    configureCheckIn,
    getEventById,
    updateEvent,
    archiveEvent,
    deleteEvent,
} from "../controllers/eventController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly, scannerAccess } from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
 * Everything under /api/events is protected by authentication.
 *
 * Scanner users can get events and details to facilitate manual check-in dropdowns,
 * but must NOT be able to create, edit, delete, archive or configure check-in.
 */
router.use(protect);

/*
 * GET /api/events
 *
 * Get all events
 */
router.get(
    "/",
    scannerAccess,
    getAllEvents
);


/*
 * GET /api/events/:id
 *
 * Get one event
 */
router.get(
    "/:id",
    scannerAccess,
    getEventById
);


/*
 * POST /api/events
 *
 * Create event
 */
router.post(
    "/",
    adminOnly,
    upload.single("template"),
    createEvent
);


/*
 * PUT /api/events/:eventId/checkin
 *
 * Configure Check-In
 */
router.put(
    "/:eventId/checkin",
    adminOnly,
    configureCheckIn
);


/*
 * PUT /api/events/:id
 *
 * Update event
 */
router.put(
    "/:id",
    adminOnly,
    upload.single("template"),
    updateEvent
);


/*
 * PUT /api/events/:id/archive
 *
 * Archive / restore event
 */
router.put(
    "/:id/archive",
    adminOnly,
    archiveEvent
);


/*
 * DELETE /api/events/:id
 *
 * Delete event
 */
router.delete(
    "/:id",
    adminOnly,
    deleteEvent
);

export default router;