/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferSchemaType, model, Model, Schema, startSession } from "mongoose";
import { errorMessage } from "../../controllers/errorController/error.controller";
import UserAuth from "../gamerAuth/model";
import { createGorbaganaWallet, generateRandomLetters, mailHandler } from "../../utils/helperFunctions";

// Assuming redis is defined globally for caching
declare const redis: any;

// Cache configuration
const CACHE_CONFIG = {
  TTL: 600, // Cache TTL in seconds (10 minutes)
  PREFIXES: {
    DEAL_LIST: 'deals:list:',
    DEAL_DETAIL: 'deals:detail:',
    SELLER_DEALS: 'deals:seller:',
    USER_DEALS: 'deals:user:'
  }
};

const playerSchema =  new Schema({
    pubkey: { 
        type: String, 
        required: true, 
        trim: true // Prevent whitespace attacks
    },
    playerName: { 
        type: String, 
        required: true, 
        trim: true // Prevent whitespace attacks
    },
    playerScore: { 
        type: Number, 
        default: 0,
        min: 0 // Ensure score is not negative
    },
    profilePicture: { 
        type: String, 
    },
    isPlayed: { 
        type: Boolean, 
        default: false,
    },
    isHost: { 
        type: Boolean, 
    },
    isPayed: { 
        type: Boolean, 
    }
})

const addressSchema = new Schema({
    pubKey: {
        type: String,
        required: true,
        trim: true
    },
    privateKey: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });

const gameSchema = new Schema(
    {
        host: { 
            type: String, 
            required: [true, "No hostId found"],
            trim: true  // Prevent whitespace attacks
        },
        gameType: {
            type: String,
            required: [true, "Please select a game type for your deal"],
        },
        title: {
            type: String,
            index: true,
            trim: true,
            minlength: [10, "Title must be at least 10 characters"],
            maxlength: [20, "Title cannot exceed 100 characters"]
        },
        duration: { 
            type: String, 
            required: [true, "please add a duration"],
            trim: true 
        },
        reward: { 
            type: Number, 
            trim: true
        },
        currency: {
            type: String,
            required: [true, "select currency"],
            default:"GOR",
            enum: {
                values: ["GOR", "USDT", "SOL"], // Add more currencies as needed
                message: "Currency {VALUE} is not supported"
            },
            uppercase: true
        },
        stake: { 
            type: Number,
            trim: true  // Prevent whitespace attacks
        },
        letters:{ 
            type:{},
            trim: true
        },
        gameCode:{ 
            type: String,
            trim: true,
            required:[true, "please enter game code"]
        },
        players:{ 
            type: [playerSchema],
        },
        gameStatus:{
            type: String,
            default: "pending",
            enum: {
                values: ["pending", "ongoing", "ended"], 
                message: "enter valide status"
            },
        },
        hostPayed:{
            type: Boolean,
            default: false,
        },
         address: {
            type: addressSchema,
            required: false // Only required for non-solo games
        }
    },
    { 
        timestamps: true,
        toJSON: { 
            transform: function(doc, ret) {
                // Remove sensitive data or unnecessary fields when converting to JSON
                delete ret.__v;
                return ret;
            }
        }
    }
);

type IGame = InferSchemaType<typeof gameSchema>;

interface IGameModel extends Model<IGame> {
    createGame(dealData: any): Promise<any>;
    getGame(gameCode: string): Promise<any>;
    deleteGame(gameCode: string, hostPubkey: string): Promise<any>;
    updateGameDetails(gameCode: string, hostPubkey: string, updateData: any): Promise<any>;
    addPlayerToGame(gameCode: string, playerData: any): Promise<any>;
}

gameSchema.statics.clearDealCache = async function(patterns?: string[]) {
    try {
        // If specific patterns are provided, clear only those
        if (patterns && patterns.length > 0) {
            for (const pattern of patterns) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(keys);
                }
            }
            return;
        }

        // Otherwise clear all deal-related caches
        const allPatterns = [
            `${CACHE_CONFIG.PREFIXES.DEAL_LIST}*`,
            `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}*`,
            `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}*`,
            `${CACHE_CONFIG.PREFIXES.USER_DEALS}*`
        ];

        for (const pattern of allPatterns) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
            }
        }
    } catch (error) {
        console.error('Failed to clear deal cache:', error);
        // Continue without failing - cache clearing is not critical
    }
};


gameSchema.statics.createGame = async function (gameData: any) {
    const session = await startSession();
    session.startTransaction();
    try {
        const sanitizedData = Object.entries(gameData).reduce((acc: any, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value.trim();
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        const letters  = generateRandomLetters(); // generate letters
        const { host, gameType, title, duration, reward, currency, stake, players, gameCode } = sanitizedData;
        
        // Verify host exists
        const existingHost = await UserAuth.findOne({ pubkey: host }).session(session);
        if (!existingHost) errorMessage(404, "Host not found");

        // Check if gameCode already exists
        const existingGame = await this.findOne({ gameCode }).session(session);
        if (existingGame) errorMessage(400, "Game code already exists. Please use a unique game code.");

        let gameDetails = { ...sanitizedData, letters };

        // Create wallet only if gameType is not "solo play"
        if (gameType.toLowerCase() !== "solo play") {
            try {
                // Assuming you have a createGorbaganaWallet function in helperFunctions
                const walletData = await createGorbaganaWallet();
                
                if (!walletData || !walletData.pubKey || !walletData.privateKey) {
                    throw new Error("Failed to create wallet - invalid wallet data");
                }

                gameDetails.address = {
                    pubKey: walletData.pubKey,
                    privateKey: walletData.privateKey
                };
            } catch (walletError: any) {
                errorMessage(500, `Failed to create game wallet: ${walletError.message}`);
            }
        }

        const newGame = await this.create([gameDetails], { session });
        
        const sanitizedGame = Array.isArray(newGame)
            ? newGame.map(game => {
                const gameObj = game.toObject ? game.toObject() : game;
                delete gameObj.letters;
                // Remove private key from response for security
                if (gameObj.address && gameObj.address.privateKey) {
                    delete gameObj.address.privateKey;
                }
                return gameObj;
            })
            : newGame;

        await session.commitTransaction();
        session.endSession();

        return {
            message: "Game created successfully",
            data: sanitizedGame
        };
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            errorMessage(400, `Validation error: ${messages.join(', ')}`);
        }
        throw error;
    }
};

gameSchema.statics.getGame = async function (gameCode: string) {
    try {
        if (!gameCode) {
            errorMessage(400, "Game code is required");
        }

        const game = await this.findOne({ gameCode: gameCode.trim() });
        
        if (!game) {
            errorMessage(404, "Game not found");
        }

        // Remove sensitive data (letters) from the response
        const sanitizedGame = game.toObject();
        delete sanitizedGame.letters;

        return {
            message: "Game retrieved successfully",
            data: sanitizedGame
        };
    } catch (error: any) {
        if (error.statusCode) {
            throw error; // Re-throw custom errors from errorMessage
        }
        throw error;
    }
};

gameSchema.statics.deleteGame = async function (gameCode: string, hostPubkey: string) {
    const session = await startSession();
    session.startTransaction();
    
    try {
        if (!gameCode || !hostPubkey) {
            errorMessage(400, "Game code and host pubkey are required");
        }

        // Find the game and verify the host
        const game = await this.findOne({ 
            gameCode: gameCode.trim(), 
            host: hostPubkey.trim() 
        }).session(session);

        if (!game) {
            errorMessage(404, "Game not found or you're not authorized to delete this game");
        }

        // Only allow deletion if game is pending or ended
        if (game.gameStatus === "ongoing") {
            errorMessage(400, "Cannot delete an ongoing game");
        }

        await this.deleteOne({ 
            gameCode: gameCode.trim(), 
            host: hostPubkey.trim() 
        }).session(session);

        // Clear any related cache
        // await this.clearDealCache([
        //     `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${gameCode}*`,
        //     `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${hostPubkey}*`
        // ]);

        await session.commitTransaction();
        session.endSession();

        return {
            message: "Game deleted successfully"
        };
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (error.statusCode) {
            throw error; // Re-throw custom errors from errorMessage
        }
        throw error;
    }
};

gameSchema.statics.updateGameDetails = async function (gameCode: string, hostPubkey: string, updateData: any) {
    const session = await startSession();
    session.startTransaction();

    try {
        if (!gameCode || !hostPubkey) {
            errorMessage(400, "Game code and host pubkey are required");
        }

        // Find the game and verify the host
        const existingGame = await this.findOne({ 
            gameCode: gameCode.trim(), 
            host: hostPubkey.trim() 
        }).session(session);

        if (!existingGame) {
            errorMessage(404, "Game not found or you're not authorized to update this game");
        }

        // Prevent updating if game is ongoing or ended
        if (existingGame.gameStatus !== "pending") {
            errorMessage(400, "Can only update pending games");
        }

        // Sanitize update data
        const sanitizedUpdateData = Object.entries(updateData).reduce((acc: any, [key, value]) => {
            // Don't allow updating certain fields
            const protectedFields = ['_id', 'host', 'gameCode', 'letters', 'createdAt', 'updatedAt'];
            if (protectedFields.includes(key)) {
                return acc;
            }
            
            if (typeof value === 'string') {
                acc[key] = value.trim();
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        const updatedGame = await this.findOneAndUpdate(
            { gameCode: gameCode.trim(), host: hostPubkey.trim() },
            sanitizedUpdateData,
            { new: true, runValidators: true, session }
        );

        // Remove sensitive data from response
        const sanitizedGame = updatedGame.toObject();
        delete sanitizedGame.letters;

        // Clear related cache
        // await this.clearDealCache([
        //     `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${gameCode}*`,
        //     `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${hostPubkey}*`
        // ]);

        await session.commitTransaction();
        session.endSession();

        return {
            message: "Game updated successfully",
            data: sanitizedGame
        };
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            errorMessage(400, `Validation error: ${messages.join(', ')}`);
        }

        if (error.statusCode) {
            throw error; // Re-throw custom errors from errorMessage
        }
        throw error;
    }
};

gameSchema.statics.addPlayerToGame = async function (gameCode: string, playerData: any) {
    const session = await startSession();
    session.startTransaction();

    try {
        if (!gameCode || !playerData) {
            errorMessage(400, "Game code and player data are required");
        }

        // Validate required player fields
        const { pubkey, playerName } = playerData;
        if (!pubkey || !playerName) {
            errorMessage(400, "Player pubkey and playerName are required");
        }

        // Find the game
        const game = await this.findOne({ gameCode: gameCode.trim() }).session(session);
        
        if (!game) {
            errorMessage(404, "Game not found");
        }

        // Check if game is still accepting players
        if (game.gameStatus !== "pending") {
            errorMessage(400, "Cannot join a game that is not pending");
        }

        // Check if player is already in the game
        const existingPlayer = game.players.find((player:any) => player.pubkey === pubkey.trim());
        if (existingPlayer) {
            errorMessage(400, "Player is already in this game");
        }

        // Verify the player exists in UserAuth
        const existingUser = await UserAuth.findOne({ pubkey: pubkey.trim() }).session(session);
        if (!existingUser) {
            errorMessage(404, "Player not found in system");
        }

        // Sanitize player data
        const sanitizedPlayerData = {
            pubkey: pubkey.trim(),
            playerName: playerName.trim(),
            playerScore: playerData.playerScore || 0,
            profilePicture: playerData.profilePicture || '',
            isPlayed: false,
            isHost: pubkey.trim() === game.host
        };

        // Add player to game
        const updatedGame = await this.findOneAndUpdate(
            { gameCode: gameCode.trim() },
            { $push: { players: sanitizedPlayerData } },
            { new: true, runValidators: true, session }
        );

        // Remove sensitive data from response
        const sanitizedGame = updatedGame.toObject();
        delete sanitizedGame.letters;

        // Clear related cache
        // await this.clearDealCache([
        //     `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${gameCode}*`,
        //     `${CACHE_CONFIG.PREFIXES.USER_DEALS}${pubkey}*`
        // ]);

        await session.commitTransaction();
        session.endSession();

        return {
            message: "Player added to game successfully",
            data: sanitizedGame
        };
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            errorMessage(400, `Validation error: ${messages.join(', ')}`);
        }

        if (error.statusCode) {
            throw error; // Re-throw custom errors from errorMessage
        }
        throw error;
    }
};




const Game = model<IGame, IGameModel>("game", gameSchema);

export default Game;