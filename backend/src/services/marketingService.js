import Event from "../models/Event.js";
import { getRecipients } from "./recipientService.js";
import { sendTemplatedEmail } from "./emailService.js";
import { buildEventVariables, renderTemplate } from "./emailTemplateService.js";
import {
    DEFAULT_MARKETING_HTML,
    DEFAULT_MARKETING_SUBJECT,
} from "../utils/defaultTemplates.js";

const getSourceFromEvent = (event, overrideSource) =>
    overrideSource || event.preEvent?.recipientSource || "googleForm";

export const previewMarketingRecipients = async (eventId, { source, sourceConfig, file }) => {
    const event = await Event.findById(eventId);

    if (!event) {
        throw new Error("Event not found");
    }

    const recipients = await getRecipients({
        source: getSourceFromEvent(event, source),
        event,
        sourceConfig: {
            ...event.preEvent?.sourceConfig?.toObject?.() || event.preEvent?.sourceConfig,
            ...sourceConfig,
        },
        file,
    });

    return {
        total: recipients.length,
        recipients: recipients.map(({ aceId, name, email, branch, emailStatus }) => ({
            aceId,
            name,
            email,
            branch,
            emailStatus,
        })),
    };
};

export const sendTestMarketingEmail = async (eventId, testEmail) => {
    const event = await Event.findById(eventId);

    if (!event) {
        throw new Error("Event not found");
    }

    if (!testEmail) {
        throw new Error("Test email is required.");
    }

    const htmlTemplate =
        event.preEvent?.emailTemplate?.html || DEFAULT_MARKETING_HTML;
    const subjectTemplate =
        event.preEvent?.emailTemplate?.subject || DEFAULT_MARKETING_SUBJECT;

    const variables = buildEventVariables(event, {
        recipientName: "Test Recipient",
    });

    await sendTemplatedEmail({
        to: testEmail,
        subject: renderTemplate(subjectTemplate, variables),
        html: renderTemplate(htmlTemplate, variables),
    });

    return { success: true, message: `Test email sent to ${testEmail}` };
};

export const runMarketingService = async (eventId, { source, sourceConfig, file, resendAll }) => {
    const event = await Event.findOneAndUpdate(
        {
            _id: eventId,
            "preEvent.status": { $ne: "Running" },
        },
        {
            $set: {
                "preEvent.status": "Running",
                "preEvent.startedAt": new Date(),
                "preEvent.completedAt": null,
            },
        },
        { new: true }
    );

    if (!event) {
        const exists = await Event.exists({ _id: eventId });

        if (exists) {
            throw new Error("Marketing emails are already being sent.");
        }

        throw new Error("Event not found");
    }

    try {
        const recipients = await getRecipients({
            source: getSourceFromEvent(event, source),
            event,
            sourceConfig: {
                ...(event.preEvent?.sourceConfig?.toObject?.() || event.preEvent?.sourceConfig),
                ...sourceConfig,
            },
            file,
        });

        if (!event.preEvent) {
            event.preEvent = {};
        }
        if (!Array.isArray(event.preEvent.sentEmails)) {
            event.preEvent.sentEmails = [];
        }

        const sentEmails = event.preEvent.sentEmails || [];
        const pending = resendAll
            ? recipients
            : recipients.filter(
                  (recipient) => !sentEmails.includes(recipient.email)
              );

        event.preEvent.totalRecipients = recipients.length;
        event.preEvent.sent = recipients.length - pending.length;
        event.preEvent.failed = 0;
        await event.save();

        const htmlTemplate =
            event.preEvent?.emailTemplate?.html || DEFAULT_MARKETING_HTML;
        const subjectTemplate =
            event.preEvent?.emailTemplate?.subject || DEFAULT_MARKETING_SUBJECT;

        for (const recipient of pending) {
            try {
                const variables = buildEventVariables(event, {
                    recipientName: recipient.name,
                });

                await sendTemplatedEmail({
                    to: recipient.email,
                    subject: renderTemplate(subjectTemplate, variables),
                    html: renderTemplate(htmlTemplate, variables),
                });

                if (!event.preEvent.sentEmails.includes(recipient.email)) {
                    event.preEvent.sentEmails.push(recipient.email);
                }

                event.preEvent.sent++;
            } catch (error) {
                console.error(
                    `Marketing email failed for ${recipient.email}:`,
                    error.message
                );
                event.preEvent.failed++;
            } finally {
                await event.save();
            }
        }

        event.preEvent.status =
            event.preEvent.failed > 0 ? "Failed" : "Completed";
        event.preEvent.completedAt = new Date();
        await event.save();

        return {
            success: true,
            message: "Marketing emails completed.",
            total: event.preEvent.totalRecipients,
            sent: event.preEvent.sent,
            failed: event.preEvent.failed,
        };
    } catch (error) {
        event.preEvent.status = "Failed";
        event.preEvent.completedAt = new Date();

        try {
            await event.save();
        } catch (saveError) {
            console.error("Failed to save marketing status:", saveError.message);
        }

        throw error;
    }
};
