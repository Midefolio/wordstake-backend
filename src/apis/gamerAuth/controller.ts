/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler, Request } from "express";

declare module "express-serve-static-core" {
    interface Request {
        user?: string; // Adjust the type of 'user' as needed
    }
}
import GamerAuth from "./model";

const signUp: RequestHandler = async (req, res) => {
    const { email, password, username, isGoogleAuth} = req.body;
    
    try {
        const result = await GamerAuth.signUp(email, password, username, isGoogleAuth);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

const login: RequestHandler = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await GamerAuth.login(email, password);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

// Wallet Authentication (existing)
const Initialize: RequestHandler = async (req, res) => {
    const { pubkey } = req.body;
    
    try {
        const result = await GamerAuth.Initialize(pubkey);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

// User Management Controllers
const updateGamer: RequestHandler = async (req, res) => {
    const formData = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.updateGamer(userId, formData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

const getGamer: RequestHandler = async (req, res) => {
    const userId = req.user;
    try {
        const result = await GamerAuth.getGamer(userId);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

// Game Management Controllers
const startGame: RequestHandler = async (req, res) => {
    const formData = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.startGame(userId, formData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

const claimRewards: RequestHandler = async (req, res) => {
    const { rewardCoins } = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.claimRewards(userId, rewardCoins);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

const updateGameStatus: RequestHandler = async (req, res) => {
    const { isPlaying, currentGame } = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.updateGameStatus(userId, isPlaying, currentGame);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export {
    signUp,
    login,
    Initialize, 
    updateGamer,
    getGamer,
    startGame,
    claimRewards,
    updateGameStatus
};