import mongoose from "mongoose";

const sessionAttendanceSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
        },

        date: {
            type: String,
            required: true,
        },

        sessionName: {
            type: String,
            required: true,
        },

        checkedIn: {
            type: Boolean,
            default: false,
        },

        checkedInAt: {
            type: Date,
            default: null,
        },

        method: {
            type: String,
            enum: ["qr", "manual"],
            default: "qr",
        },
    },
    { _id: false }
);

const checkInSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true,
        },

        /*
         * Universal participant identifier.
         *
         * ACE member:
         *     participantId = ACE ID
         *
         * Non-ACE participant:
         *     participantId = email
         */
        participantId: {
            type: String,
            required: true,
            trim: true,
        },

        /*
         * ACE ID is optional because
         * non-ACE participants do not have one.
         */
        aceId: {
            type: String,
            default: null,
            trim: true,
        },

        /*
         * Helps us know which type of participant this is.
         */
        memberType: {
            type: String,
            enum: ["ace", "non-ace"],
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        qrToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        sessions: {
            type: [sessionAttendanceSchema],
            default: [],
        },

        totalSessions: {
            type: Number,
            default: 0,
        },

        attendedSessions: {
            type: Number,
            default: 0,
        },

        attendancePercentage: {
            type: Number,
            default: 0,
        },

        eligible: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

/*
 * A participant can appear only once
 * for a particular event.
 *
 * ACE:
 *   eventId + ACE123
 *
 * Non-ACE:
 *   eventId + person@email.com
 */
checkInSchema.index(
    {
        eventId: 1,
        participantId: 1,
    },
    {
        unique: true,
    }
);

const CheckIn = mongoose.model("CheckIn", checkInSchema);

export default CheckIn;