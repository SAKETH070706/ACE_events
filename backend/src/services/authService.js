import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async ({
    name,
    email,
    password
}) => {

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error("User already exists");
    }

    if (!password || password.length < 6) {
        throw new Error(
            "Password must be at least 6 characters long"
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "scanner"
    });

    const token = generateToken(user._id, user.role);

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token
    };
};

export const loginUser = async ({
    email,
    username,
    password
}) => {

    const identifier = String(username || email || "").trim().toLowerCase();
    const user = await User.findOne({
        $or: [
            { username: identifier },
            { email: identifier },
            { email: `${identifier}@ace.com` }
        ]
    });

    if (!user) {
        throw new Error("Invalid username or password");
    }

    const cleanPassword = String(password || "").trim();
    const digitsOnly = cleanPassword.replace(/\D/g, "");
    const phone10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // Compare with raw trimmed password, and also 10-digit normalized phone if entered with country code/spaces
    const isMatch = (await bcrypt.compare(cleanPassword, user.password)) ||
                    (phone10 && await bcrypt.compare(phone10, user.password)) ||
                    (user.altPassword && (
                        (await bcrypt.compare(cleanPassword, user.altPassword)) ||
                        (phone10 && await bcrypt.compare(phone10, user.altPassword))
                    ));

    if (!isMatch) {
        throw new Error("Invalid username or password");
    }

    const token = generateToken(user._id, user.role);

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token
    };
};
