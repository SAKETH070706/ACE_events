import fs from "fs/promises";

import Event from "../models/Event.js";
import { downloadTemplate } from "../utils/downloadTemplate.js";
import { generateCertificate } from "../services/certificateService.js";

export const previewCertificate = async (req, res) => {
    let templatePath = "";
    let pdfPath = "";

    try {
        const { eventId } = req.body;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        templatePath = await downloadTemplate(event.template.url);

        pdfPath = await generateCertificate(
            templatePath,
            "Saketh",
    "9999999999",
            event.template
        );

        // Delete downloaded template
        await fs.unlink(templatePath);

        // Send the PDF and delete it AFTER sending
        return res.sendFile(pdfPath, async (err) => {

            if (err) {
                console.error(err);
            }

            try {
                await fs.unlink(pdfPath);
            } catch (error) {
                console.error(
                    "Failed to delete preview PDF:",
                    error.message
                );
            }

        });

    } catch (err) {

        if (templatePath) {
            try {
                await fs.unlink(templatePath);
            } catch {}
        }

        if (pdfPath) {
            try {
                await fs.unlink(pdfPath);
            } catch {}
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};