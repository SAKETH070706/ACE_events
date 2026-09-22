import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
try {
    await transporter.verify();
    console.log("Email service connected successfully.");
} catch (error) {
    console.error(
        "⚠️ Gmail connection failed:",
        error.message
    );

    console.error(
        "⚠️ Server will continue running, but certificate emails may fail."
    );
}

export const sendTemplatedEmail = async ({
    to,
    subject,
    html,
    attachments = [],
}) => {
    return transporter.sendMail({
        from: `"ACE Events" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments,
    });
};

export const sendCertificate = async (
    participantName,
    eventName,
    participantEmail,
    pdfPath,
    html,
    subject
) => {
    return sendTemplatedEmail({
        to: participantEmail,
        subject: subject || `Your Certificate for ${eventName}`,
        html: html || `
            <h2>Hello ${participantName},</h2>

            <p>Thank you for participating in <b>${eventName}</b>.</p>

            <p>Your participation certificate is attached to this email.</p>

            <p>We hope to see you again in our upcoming events.</p>

            <br>

            <b>Association of Computer Engineers (ACE)</b>
        `,
        attachments: [
            {
                filename: `${eventName}-${participantName}.pdf`,
                path: pdfPath
            }
        ]
    });
};
