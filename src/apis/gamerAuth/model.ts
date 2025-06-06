/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferSchemaType, model, Model, Schema } from "mongoose";
import { errorMessage } from "../../controllers/errorController/error.controller";
import { createToken } from "../../utils/helperFunctions";

const CACHE_TTL = 3600;

const gamerSchema = new Schema(
    {
        pubkey:{type: String, required: true},
        username: {type:String, trim: true, maxlength: 10, index: true },
        email: {type: String},
        totalGames:{type: Number, default: 0, min:0},
        coins:{type: Number, default: 100, min:0},
        expo:{type: Number, default: 10, min:0},
        dictionary:{type: Number, default: 10, min:0},
        bestScore:{type: Number, default: 0, min:0},
        totalEarning:{type: Number, default: 0, min:0},
        weeklyRank:{type: Number, default: 0, min:0},
        isBlocked:{type: Boolean, default: false},
        profilePicture:{type: {}},
        isPlaying:{type: Boolean, default: false},
        currentGame:{type:{}, default:null},  //solo, dailyChallenge, multiplayer, weekly challenge
        lastActivity:{type: Date, default: Date.now},
        deviceCount:{type: Number, default: 0}
    },
    { timestamps: true }
);

type IGamerAuth = InferSchemaType<typeof gamerSchema>;

interface IGamerAuthModel extends Model<IGamerAuth> {
    Initialize(pubkey: any, socketManager?: any): Promise<any>;
    getGamer(_id: any): Promise<any>;
    updateGamer(gamerId:any, formData: any, socketManager?: any): Promise<any>;
    startGame(gamerId:any, formData: any, socketManager?: any): Promise<any>;
    claimRewards(userId: any, rewardCoins: number, socketManager?: any): Promise<any>;
    updateGameStatus(userId: any, isPlaying: boolean, currentGame: any, socketManager?: any): Promise<any>;
};

gamerSchema.statics.Initialize = async function (pubkey, socketManager = null) {
    if (!pubkey) { errorMessage(404, "Invalid form data")};
    const existingGamer = await this.findOne({ pubkey:pubkey});
    if(!existingGamer) {
        const newGamer = await this.create({ 
            pubkey: pubkey,
            lastActivity: new Date()
        });
        const jwt = await createToken(newGamer._id);  
        return {message:"done", data:{gamer:newGamer, jwt}} 
    }
    
    // Update last activity
    existingGamer.lastActivity = new Date();
    await existingGamer.save();
    
    const jwt = await createToken(existingGamer._id);  
    return {message:"done", data:{gamer:existingGamer, jwt}}
};

gamerSchema.statics.getGamer = async function (_id) {
    if (!_id) { errorMessage(404, "Invalid pubkey")};
    const existingGamer = await this.findOne({_id});
    if(!existingGamer) { 
     return {message:"done", data:'Gamer not found'} 
    }
    return {message:"done", data:existingGamer}
};

gamerSchema.statics.updateGamer = async function (userId, updateData, socketManager = null) {
    // Input validation
    if (!userId) {
        errorMessage(400, "User ID is required");
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
        errorMessage(400, "No update data provided");
    }
    
    try {
        // Prevent updating critical fields
        const protectedFields = ['password', 'email', 'isBlocked', 'pubkey', '_id'];
        const hasProtectedField = protectedFields.some(field => updateData.hasOwnProperty(field));
        
        if (hasProtectedField) {
            // Filter out protected fields from update
            protectedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    delete updateData[field];
                }
            });
            
            // If nothing left to update after removing protected fields
            if (Object.keys(updateData).length === 0) {
                errorMessage(400, "Cannot update protected fields through this method");
            }
        }
        
        // Add last activity update
        updateData.lastActivity = new Date();
        
        // Update user in database
        const updatedUser = await this.findByIdAndUpdate(
            userId, 
            { $set: updateData },
            { new: true, runValidators: true }
        )
        
        if (!updatedUser) {
            errorMessage(404, "User not found");
        }
        
        // Broadcast update to all user devices via WebSocket
        if (socketManager) {
            socketManager.broadcastToUserDevices(userId, 'sync_profile', {
                type: 'profile_update',
                data: updatedUser,
                timestamp: new Date()
            });
        }
        
        return {
            message: "User updated successfully",
            data: updatedUser
        };
    } catch (error) {
        // Handle invalid ID format
        if ((error as { name: string }).name === "CastError") {
            errorMessage(400, "Invalid user ID format");
        }
        
        // Handle validation errors
        if ((error as { name: string }).name === "ValidationError") {
            errorMessage(400, "Invalid update data");
        }
        
        // Re-throw other errors
        throw error;
    }
};

gamerSchema.statics.startGame = async function (userId, updateData, socketManager = null) {
    // Input validation
    if (!userId) {
        errorMessage(400, "User ID is required");
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
        errorMessage(400, "No update data provided");
    }
    
    try {
        // First, check if user exists and get their current state
        const existingUser = await this.findById(userId);
        
        if (!existingUser) {
            errorMessage(404, "User not found");
        }
        
        // Check if user is already playing a game
        if (existingUser.isPlaying === true) {
            errorMessage(400, "Cannot start game - user still has a pending game somewhere");
        }
        
        // Prevent updating critical fields
        const protectedFields = ['password', 'email', 'isBlocked', 'pubkey', '_id'];
        const hasProtectedField = protectedFields.some(field => updateData.hasOwnProperty(field));
        
        if (hasProtectedField) {
            // Filter out protected fields from update
            protectedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    delete updateData[field];
                }
            });
            
            // If nothing left to update after removing protected fields
            if (Object.keys(updateData).length === 0) {
                errorMessage(400, "Cannot update protected fields through this method");
            }
        }
        
        // Ensure isPlaying is set to true when starting a game
        updateData.isPlaying = true;
        updateData.lastActivity = new Date();
        
        // Update user in database
        const updatedUser = await this.findByIdAndUpdate(
            userId, 
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            errorMessage(404, "User not found during update");
        }
        
        // Broadcast game start to all user devices via WebSocket
        if (socketManager) {
            socketManager.broadcastToUserDevices(userId, 'sync_game_state', {
                type: 'game_started',
                data: {
                    isPlaying: true,
                    currentGame: updatedUser.currentGame,
                    user: updatedUser
                },
                timestamp: new Date()
            });
        }
        
        return {
            message: "Game started successfully",
            data: updatedUser
        };
    } catch (error) {
        // Handle invalid ID format
        if ((error as { name: string }).name === "CastError") {
            errorMessage(400, "Invalid user ID format");
        }
        
        // Handle validation errors
        if ((error as { name: string }).name === "ValidationError") {
            errorMessage(400, "Invalid update data");
        }
        
        // Re-throw other errors
        throw error;
    }
};

gamerSchema.statics.claimRewards = async function (userId, rewardCoins = 0, socketManager = null) {
    // Input validation
    if (!userId) {
        errorMessage(400, "User ID is required");
    }
    
    if (rewardCoins < 0) {
        errorMessage(400, "Reward coins cannot be negative");
    }
    
    try {
        // First, check if user exists and get their current state
        const existingUser = await this.findById(userId);
        
        if (!existingUser) {
            errorMessage(404, "User not found");
        }
        
        // Check if user is not currently playing (rewards already claimed)
        if (existingUser.isPlaying === false) {
            return {
                message: "Rewards already claimed",
                data: existingUser
            };
        }
        
        // Update user: add rewards to coins, increment totalGames, set isPlaying to false
        const updatedUser = await this.findByIdAndUpdate(
            userId,
            {
                $inc: {
                    coins: rewardCoins,
                    totalGames: 1,
                    totalEarning: rewardCoins
                },
                $set: {
                    isPlaying: false,
                    currentGame: null,
                    lastActivity: new Date()
                }
            },
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            errorMessage(404, "User not found during update");
        }
        
        // Broadcast rewards claim to all user devices via WebSocket
        if (socketManager) {
            socketManager.broadcastToUserDevices(userId, 'sync_game_state', {
                type: 'rewards_claimed',
                data: {
                    isPlaying: false,
                    currentGame: null,
                    coins: updatedUser.coins,
                    totalGames: updatedUser.totalGames,
                    rewardsClaimed: rewardCoins,
                    user: updatedUser
                },
                timestamp: new Date()
            });
        }
        
        return {
            message: "Rewards claimed successfully",
            data: updatedUser,
            rewardsClaimed: rewardCoins
        };
    } catch (error) {
        // Handle invalid ID format
        if ((error as { name: string }).name === "CastError") {
            errorMessage(400, "Invalid user ID format");
        }
        
        // Handle validation errors
        if ((error as { name: string }).name === "ValidationError") {
            errorMessage(400, "Invalid update data");
        }
        
        // Re-throw other errors
        throw error;
    }
};

// New method to specifically update game status
gamerSchema.statics.updateGameStatus = async function (userId, isPlaying, currentGame = null, socketManager = null) {
    if (!userId) {
        errorMessage(400, "User ID is required");
    }
    
    try {
        const updatedUser = await this.findByIdAndUpdate(
            userId,
            {
                $set: {
                    isPlaying: isPlaying,
                    currentGame: currentGame,
                    lastActivity: new Date()
                }
            },
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            errorMessage(404, "User not found");
        }
        
        // Broadcast game status change to all user devices
        if (socketManager) {
            socketManager.broadcastToUserDevices(userId, 'sync_game_state', {
                type: 'game_status_changed',
                data: {
                    isPlaying: isPlaying,
                    currentGame: currentGame,
                    user: updatedUser
                },
                timestamp: new Date()
            });
        }
        
        return {
            message: "Game status updated successfully",
            data: updatedUser
        };
    } catch (error) {
        if ((error as { name: string }).name === "CastError") {
            errorMessage(400, "Invalid user ID format");
        }
        throw error;
    }
};

const GamerAuth = model<IGamerAuth, IGamerAuthModel>("Gamer", gamerSchema);

export default GamerAuth;