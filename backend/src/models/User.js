import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            trim: true,
            lowercase: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },
        altPassword: {
            type: String
        },
        alternatePhone: {
            type: String
        },
        _dummy: {
            type: String,
            required: true,
            minlength: 6
        },

        role: {
            type: String,
            enum: ["admin", "scanner"],
            default: "scanner"
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;