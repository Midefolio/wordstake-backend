/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler, Request } from "express";
import Deal from "./model";

declare module "express-serve-static-core" {
    interface Request {
        user?: string; // Adjust the type of 'user' as needed
    }
}

/**
 * Create a new Deal
 */
const createDeal: RequestHandler = async (req, res) => {
    const dealData = req.body;
    try {
        // Ensure userId is set from authenticated user if not provided
        if (!dealData.userId && req.user) {
            dealData.userId = req.user;
        }
        
        const result = await Deal.createDeal(dealData);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Accept or decline a deal request
 */
const acceptRequest: RequestHandler = async (req, res) => {
    const { secureId, dealId, status } = req.body;
    try {
        if (!['accepted', 'declined'].includes(status)) {
            return res.status(400).json({ error: "Status must be either 'accepted' or 'declined'" });
        }
        
        const result = await Deal.acceptRequest(secureId, dealId, status);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Delete a deal
 */
const deleteDeal: RequestHandler = async (req, res) => {
    const { userId, dealId } = req.body;
    try {
        // If userId is not provided, use the authenticated user's ID
        const userIdentifier = userId || req.user;
        
        if (!userIdentifier) {
            return res.status(400).json({ error: "User ID is required" });
        }
        
        const result = await Deal.deleteDeal(userIdentifier, dealId);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

const cancelDeal: RequestHandler = async (req, res) => {
    const { userId, dealId } = req.body;
    try {
        // If userId is not provided, use the authenticated user's ID
        const userIdentifier = userId || req.user;
        
        if (!userIdentifier) {
            return res.status(400).json({ error: "User ID is required" });
        }
        
        const result = await Deal.cancelDeal(userIdentifier, dealId);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Get deals for a seller
 */
const getSellerDeals: RequestHandler = async (req, res) => {
    const { secureId, page, limit } = req.body;
    try {
        if (!secureId) {
            return res.status(400).json({ error: "Secure ID is required" });
        }
        
        const result = await Deal.getSellerDeals(secureId, page, limit);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Get deals for a buyer
 */
const getUserDeals: RequestHandler = async (req, res) => {
    const { userId, secureId, page, limit } = req.body;
    try {
        // If userId is not provided, use the authenticated user's ID
        const userIdentifier = userId || req.user;
        
        if (!userIdentifier) {
            return res.status(400).json({ error: "User ID is required" });
        }
        
        const result = await Deal.getUserDeals(userIdentifier, secureId, page, limit);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

export {
    createDeal,
    acceptRequest,
    deleteDeal,
    getSellerDeals,
    getUserDeals,
    cancelDeal
}