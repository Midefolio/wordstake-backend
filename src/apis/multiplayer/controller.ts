/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler, Request } from "express";
import Game from "./model"; // Assuming this is your Game model

declare module "express-serve-static-core" {
    interface Request {
        user?: string; // Adjust the type of 'user' as needed
    }
}

/**
 * Create a new Game
 */
const createGame: RequestHandler = async (req, res) => {
    const gameData = req.body;
    try {
        // Ensure host is set from authenticated user if not provided
        if (!gameData.host && req.user) {
            gameData.host = req.user;
        }
        
        const result = await Game.createGame(gameData);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Get a game by game code
 */
const getPendingGameByHost: RequestHandler = async (req, res) => {
    const { pubKey } = req.body;
    try {
        const result = await Game.getPendingGameByHost(pubKey);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};


const playGame: RequestHandler = async (req, res) => {
    const { gameCode, pubKey } = req.body;
    try {
        const result = await Game.playGame(gameCode, pubKey);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};


const getGame: RequestHandler = async (req, res) => {
    const { gameCode } = req.body;
    try {
        if (!gameCode) {
            return res.status(400).json({ error: "Game code is required" });
        }
        
        const result = await Game.getGame(gameCode);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Delete a game
 */
const deleteGame: RequestHandler = async (req, res) => {
    const { hostPubkey, gameCode } = req.body;
    try {
        // If hostPubkey is not provided, use the authenticated user's pubkey
        const hostIdentifier = hostPubkey || req.user;
        
        if (!hostIdentifier) {
            return res.status(400).json({ error: "Host pubkey is required" });
        }
        
        if (!gameCode) {
            return res.status(400).json({ error: "Game code is required" });
        }
        
        const result = await Game.deleteGame(gameCode, hostIdentifier);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Update game details
 */
const updatePlayerDetails: RequestHandler = async (req, res) => {
    const { updateData, gameCode, playerPubKey } = req.body;
    try {
        const result = await Game.updatePlayerDetails(gameCode, playerPubKey, updateData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Update game details
 */
const updateGameDetails: RequestHandler = async (req, res) => {
    const { gameCode, hostPubkey, updateData } = req.body;
    try {
        const result = await Game.updateGameDetails(gameCode, hostPubkey, updateData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Add a player to a game
 */
const addPlayerToGame: RequestHandler = async (req, res) => {
    const {gameCode, playerData} = req.body;
    try {
        if (!gameCode) {
            return res.status(400).json({ error: "Game code is required" });
        }
        
        // Ensure pubkey is set from authenticated user if not provided
        if (!playerData.pubkey && req.user) {
            playerData.pubkey = req.user;
        }
        
        if (!playerData.pubkey || !playerData.playerName) {
            return res.status(400).json({ error: "Player pubkey and playerName are required" });
        }
        
        const result = await Game.addPlayerToGame(gameCode, playerData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Get games for a host (similar to getSellerGames)
 */
const getHostGames: RequestHandler = async (req, res) => {
    const { hostPubkey, page = 1, limit = 10 } = req.query;
    try {
        // If hostPubkey is not provided, use the authenticated user's pubkey
        const hostIdentifier = (hostPubkey as string) || req.user;
        
        if (!hostIdentifier) {
            return res.status(400).json({ error: "Host pubkey is required" });
        }
        
        // Since this method doesn't exist in your statics, you might want to add it
        // For now, using a simple find query
        const games = await Game.find({ host: hostIdentifier })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 });
        
        // Remove sensitive data from all games
        const sanitizedGames = games.map(game => {
            const gameObj = game.toObject();
            delete gameObj.letters;
            return gameObj;
        });
        
        res.status(200).json({
            message: "Host games retrieved successfully",
            data: sanitizedGames,
            pagination: {
                currentPage: Number(page),
                limit: Number(limit),
                totalGames: await Game.countDocuments({ host: hostIdentifier })
            }
        });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Get games for a player (games where user is in players array)
 */
const getPlayerGames: RequestHandler = async (req, res) => {
    const { playerPubkey, page = 1, limit = 10 } = req.query;
    try {
        // If playerPubkey is not provided, use the authenticated user's pubkey
        const playerIdentifier = (playerPubkey as string) || req.user;
        
        if (!playerIdentifier) {
            return res.status(400).json({ error: "Player pubkey is required" });
        }
        
        // Find games where the user is in the players array
        const games = await Game.find({ "players.pubkey": playerIdentifier })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 });
        
        // Remove sensitive data from all games
        const sanitizedGames = games.map(game => {
            const gameObj = game.toObject();
            delete gameObj.letters;
            return gameObj;
        });
        
        res.status(200).json({
            message: "Player games retrieved successfully",
            data: sanitizedGames,
            pagination: {
                currentPage: Number(page),
                limit: Number(limit),
                totalGames: await Game.countDocuments({ "players.pubkey": playerIdentifier })
            }
        });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

/**
 * Remove a player from a game
 */
const removePlayerFromGame: RequestHandler = async (req, res) => {
    const { gameCode } = req.params;
    const { playerPubkey, hostPubkey } = req.body;
    try {
        if (!gameCode) {
            return res.status(400).json({ error: "Game code is required" });
        }
        
        // If hostPubkey is not provided, use the authenticated user's pubkey
        const hostIdentifier = hostPubkey || req.user;
        
        if (!hostIdentifier) {
            return res.status(400).json({ error: "Host pubkey is required" });
        }
        
        if (!playerPubkey) {
            return res.status(400).json({ error: "Player pubkey is required" });
        }
        
        // Find the game and verify the host
        const game = await Game.findOne({ 
            gameCode: gameCode, 
            host: hostIdentifier 
        });
        
        if (!game) {
            return res.status(404).json({ error: "Game not found or you're not authorized" });
        }
        
        // Check if game is still pending
        if (game.gameStatus !== "pending") {
            return res.status(400).json({ error: "Cannot remove players from non-pending games" });
        }
        
        // Remove player from game
        const updatedGame = await Game.findOneAndUpdate(
            { gameCode: gameCode },
            { $pull: { players: { pubkey: playerPubkey } } },
            { new: true }
        );
        
        // Remove sensitive data from response
        const sanitizedGame = updatedGame?.toObject();
        if (sanitizedGame) {
            delete sanitizedGame.letters;
        }
        
        res.status(200).json({
            message: "Player removed from game successfully",
            data: sanitizedGame
        });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};

export {
    createGame,
    getGame,
    deleteGame,
    updateGameDetails,
    addPlayerToGame,
    getHostGames,
    getPlayerGames,
    removePlayerFromGame,
    updatePlayerDetails,
    getPendingGameByHost,
    playGame
};