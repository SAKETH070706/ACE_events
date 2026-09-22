import {
    registerUser,
    loginUser
} from "../services/authService.js";

export const register = async (req, res) => {

    try {

        const result = await registerUser(req.body);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            ...result
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

export const login = async (req, res) => {

    try {

        const result = await loginUser(req.body);

        res.status(200).json({
            success: true,
            message: "Login successful",
            ...result
        });

    } catch (error) {

        res.status(401).json({
            success: false,
            message: error.message
        });

    }

};