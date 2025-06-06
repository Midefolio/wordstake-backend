/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from "express";
import AdminAuth from "./model";

declare module "express-serve-static-core" {
    interface Request {
        user?: string; // Adjust the type of 'user' as needed
    }
}

const login: RequestHandler = async (req, res) => {
    const { email, password, googleAuth } = req.body;
    try {
        const result = await AdminAuth.login(email, googleAuth, password);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const addAdmin: RequestHandler = async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const result = await AdminAuth.addAdmin(email, password, role);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const forgotPassword: RequestHandler = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await AdminAuth.forgotPassword(email);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const updatePassword: RequestHandler = async (req, res) => {
    const { email, inputedCode, newPassword } = req.body;
    try {
        const result = await AdminAuth.updatePassword(email, inputedCode, newPassword);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const getAdmin: RequestHandler = async (req, res) => {
    const adminId = req.user;
    try {
        const result = await AdminAuth.getAdmin(adminId);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const logout: RequestHandler = async (req, res) => {
    const userId = req.user;
    try {
        const result = await AdminAuth.logout(userId);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

export {
    login,
    addAdmin,
    forgotPassword,
    updatePassword,
    getAdmin,
    logout
};