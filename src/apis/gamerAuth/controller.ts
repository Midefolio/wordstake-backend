/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler, Request } from "express";

declare module "express-serve-static-core" {
    interface Request {
        user?: string; // Adjust the type of 'user' as needed
    }
}
import GamerAuth from "./model";

const Initialize: RequestHandler = async (req, res) => {
    const {pubkey} = req.body;
    try {
        const result = await GamerAuth.Initialize(pubkey);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const updateGamer: RequestHandler = async (req, res) => {
    const formData = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.updateGamer(userId, formData);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

const startGame: RequestHandler = async (req, res) => {
    const formData = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.startGame(userId, formData);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}
const claimRewards: RequestHandler = async (req, res) => {
    const { rewardCoins } = req.body;
    const userId = req.user;

    try {
        const result = await GamerAuth.claimRewards(userId, rewardCoins);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}


const getGamer: RequestHandler = async (req, res) => {
    const userId = req.user;
    try {
        const result = await GamerAuth.getGamer(userId);
        res.status(200).json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}

export {
    Initialize,
    updateGamer,
    getGamer,
    startGame,
    claimRewards
};