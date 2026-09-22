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

    // ---------------------------------------------
    // IMPORTANT:
    // Normal registration can ONLY create scanner
    // accounts.
    // ---------------------------------------------

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
    password
}) => {

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        throw new Error("Invalid email or password");
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