/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferSchemaType, model, Model, Schema, startSession } from "mongoose";
import { errorMessage } from "../../controllers/errorController/error.controller";
import UserAuth from "../gamerAuth/model";
import { mailHandler } from "../../utils/helperFunctions";

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

// Define Escrow schema
const DealSchema = new Schema(
    {
        userId: { 
            type: String, 
            required: [true, "No userId found"],
            trim: true  // Prevent whitespace attacks
        },
        title: {
            type: String,
            required: [true, "Please provide a title for your escrow link"],
            index: true,
            trim: true,
            minlength: [10, "Title must be at least 10 characters"],
            maxlength: [100, "Title cannot exceed 100 characters"]
        },
        duration: { 
            type: String, 
            required: [true, "please add a duration"],
            trim: true 
        },
        secureId: { 
            type: String, 
            required: [true, "secureId is required"],
            trim: true
        },
        price: {
            type: Number,
            required: [true, "Please enter price"],
            min: [0.01, "Price must be greater than 0"]
        },
        currency: {
            type: String,
            required: [true, "Please select currency for your deal"],
            enum: {
                values: ["USDC", "USDT", "SOL"], // Add more currencies as needed
                message: "Currency {VALUE} is not supported"
            },
            uppercase: true
        },
        description: {
            type: String,
            required: [true, "Please provide a description for your deal"],
            trim: true,
            minlength: [10, "Description must be at least 10 characters"],
            maxlength: [2000, "Description cannot exceed 2000 characters"]
        },
        images: { 
            type: [{}], 
            default: [],
            validate: {
                validator: function(arr: any[]) {
                    return arr.length <= 10; // Limit number of images
                },
                message: "Maximum 10 images allowed"
            }
        },
        files: { 
            type: [{}], 
            default: [],
            validate: {
                validator: function(arr: any[]) {
                    return arr.length <= 5; // Limit number of files
                },
                message: "Maximum 5 files allowed"
            }
        },
        deliverables: { 
            type: [{}], 
            default: [],
            validate: {
                validator: function(arr: any[]) {
                    return arr.length <= 20; // Limit number of deliverables
                },
                message: "Maximum 20 deliverables allowed"
            }
        },
        requestStatus: {
            type: String,
            enum: {
                values: ["awaiting approval", "accepted", "declined"],
                message: "Status {VALUE} is not supported"
            },
            default: "awaiting approval"   //awaiting seller approval
        },
        progressStatus: {
            type: String,
            enum: {
                values: ["awaiting approval", "declined", "awaiting payment", "in progress", "completed", "dispute", "canceled"],
                message: "Status {VALUE} is not supported"
            },
            default: "awaiting approval"
        },
        commencementDate: { type: String },
        requestExpiryDate: { type: Date },   // Added for tracking request expiration
        from: { type: String, trim: true },  //buyer
        to: { type: String, trim: true }  //sender
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

// Add index for search optimization
DealSchema.index({ title: 'text', description: 'text' });

type IProduct = InferSchemaType<typeof DealSchema>;

interface IProductModel extends Model<IProduct> {
    createDeal(dealData: any): Promise<any>;
    acceptRequest(secureId: string, dealId: string, status: 'accepted' | 'declined'): Promise<any>;
    deleteDeal(userId: string, dealId: string): Promise<any>;
    getSellerDeals(secureId: string, page?: number, limit?: number): Promise<any>;
    getUserDeals(userId: string, secureId:string, page?: number, limit?: number): Promise<any>;
    clearDealCache(patterns?: string[]): Promise<void>;
    cancelDeal(userId: string, dealId: string): Promise<any>;
}

/**
 * Clear deal-related cache entries based on patterns
 * @param patterns Array of cache key patterns to clear
 */

DealSchema.statics.clearDealCache = async function(patterns?: string[]) {
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

/**
 * Create a new deal
 * This function validates the deal, checks if the seller exists, and sends an email notification
 */
DealSchema.statics.createDeal = async function (dealData) {
    const session = await startSession();
    session.startTransaction();

    try {
        // Sanitize input data
        const sanitizedData = Object.entries(dealData).reduce((acc: any, [key, value]) => {
            // Convert strings to trimmed strings and sanitize
            if (typeof value === 'string') {
                acc[key] = value.trim();
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        // Validate buyer and seller are different
        if (sanitizedData.secureId === sanitizedData?.BuyersecureId) {
            await session.abortTransaction();
            session.endSession();
            errorMessage(400, "You cannot create a deal with yourself");
        }

        // Verify seller exists
        const seller = await UserAuth.findOne({secureId: sanitizedData.secureId });
        if (!seller) {
            await session.abortTransaction();
            session.endSession();
            errorMessage(404, "Invalid secureId - seller not found");
        }
    
        // Create and validate the new deal
        const newDeal = new this({
            ...sanitizedData,
            requestExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        
        await newDeal.validate(); // This will throw if validation fails
        const savedDeal = await newDeal.save({ session });

        // Email notification code commented out - to be implemented later

        await session.commitTransaction();
        session.endSession();
        
        // Clear relevant caches
        Deal.clearDealCache([
            `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${sanitizedData.secureId}:*`,
            `${CACHE_CONFIG.PREFIXES.USER_DEALS}${sanitizedData.userId}:*`
        ]);

        return {
            message: "Deal created successfully",
            data: savedDeal
        };

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            errorMessage(400, `Validation error: ${messages.join(', ')}`);
        }
        if (error.code === 11000) {
            errorMessage(409, "A deal with this title already exists");
        }
        throw error;
    }
};

/**
 * Accept or decline a deal request
 * This function handles the seller's response to a deal request
 */
DealSchema.statics.acceptRequest = async function (secureId, dealId, status) {
    try {
        // Input validation
        if (!secureId || !dealId) {
            errorMessage(400, "SecureId and dealId are required");
        }

        // Validate secureId and dealId format
        if (typeof secureId !== 'string' || typeof dealId !== 'string') {
            errorMessage(400, "Invalid secureId or dealId format");
        }
        
        // Sanitize inputs
        secureId = secureId.trim();
        dealId = dealId.trim();

        if (!['accepted', 'declined'].includes(status)) {
            errorMessage(400, "fe Error: Status must be either 'awaiting payment' or 'declined'");
        }

        // Find the deal
        const deal = await this.findOne({ _id: dealId, secureId });

        if (!deal) {
            errorMessage(404, "Deal not found or you don't have permission to update it");
        }

        // Check if request has expired
        if (new Date() > new Date(deal.requestExpiryDate)) {
            errorMessage(400, "Deal request has expired");
        }

        // Update the deal status
        const updatedDeal = await this.findByIdAndUpdate(
            dealId,
            {
                requestStatus: status,
                // If accepted, update progressStatus to "awaiting Payment"
                ...(status === 'accepted' ? { progressStatus: "awaiting payment" } : { progressStatus: "declined"})
            },
            { new: true, runValidators: true }
        );

        // Email notification code commented out - to be implemented later

        // Clear related caches
        Deal.clearDealCache([
            `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${dealId}`,
            `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${secureId}:*`,
            `${CACHE_CONFIG.PREFIXES.USER_DEALS}*` // Clear all user deals since we don't know which user
        ]);

        return {
            message: `Deal request ${status} successfully`,
            data: updatedDeal
        };

    } catch (error: any) {
        throw error;
    }
};

/**
 * Cancel a deal
 * This function allows a user to cancel their deal if they are the creator and it's in a cancellable state
 */
DealSchema.statics.cancelDeal = async function (userId, dealId) {
    try {
        // Input validation
        if (!userId || !dealId) {
            errorMessage(400, "UserId and dealId are required");
        }

        // Validate and sanitize inputs
        if (typeof userId !== 'string' || typeof dealId !== 'string') {
            errorMessage(400, "Invalid userId or dealId format");
        }
        
        userId = userId.trim();
        dealId = dealId.trim();

        // Find the deal without userId filter first to provide better error messages
        const deal = await this.findById(dealId);

        if (!deal) {
            errorMessage(404, "Deal not found");
        }

        // Verify the user is the creator of the deal
        if (deal.userId !== userId) {
            errorMessage(403, "You don't have permission to cancel this deal. Only the creator can cancel it.");
        }

        // Check if the deal can be canceled
        // Allow cancellation when progressStatus is "null" or "awaiting Payment"
        const allowedStatuses = ["awaiting approval", "awaiting payment"];
        if (!allowedStatuses.includes(deal.progressStatus)) {
            errorMessage(400, "Cannot cancel a deal that is in progress, completed, or in dispute");
        }

        // Update the deal status to "canceled"
        const updatedDeal = await this.findByIdAndUpdate(
            dealId,
            { progressStatus: "canceled" },
            { new: true, runValidators: true }
        );

        // Clear related caches
        Deal.clearDealCache([
            `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${dealId}`,
            `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${deal.secureId}:*`,
            `${CACHE_CONFIG.PREFIXES.USER_DEALS}${userId}:*`
        ]);

        return {
            message: "Deal canceled successfully",
            data: updatedDeal
        };

    } catch (error: any) {
        throw error;
    }
};

/**
 * cencel  a deal
 * This function allows a user to cancle their deal if it's not in progress
 */
DealSchema.statics.deleteDeal = async function (userId, dealId) {
    try {
        // Input validation
        if (!userId || !dealId) {
            errorMessage(400, "UserId and dealId are required");
        }

        // Validate and sanitize inputs
        if (typeof userId !== 'string' || typeof dealId !== 'string') {
            errorMessage(400, "Invalid userId or dealId format");
        }
        
        userId = userId.trim();
        dealId = dealId.trim();

        // Find the deal
        const deal = await this.findOne({ _id: dealId, userId });

        if (!deal) {
            errorMessage(404, "Deal not found or you don't have permission to delete it");
        }

        const allowedStatuses = ["awaiting approval", "awaiting payment", "declined", "canceled"];
        if (!allowedStatuses.includes(deal.progressStatus)) {
            errorMessage(400, "Cannot cancel a deal that is in progress, completed, or in dispute");
        }

        // Delete the deal
        await this.findByIdAndDelete(dealId);

        // Clear related caches
        Deal.clearDealCache([
            `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${dealId}`,
            `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${deal.secureId}:*`,
            `${CACHE_CONFIG.PREFIXES.USER_DEALS}${userId}:*`
        ]);

        return {
            message: "Deal deleted successfully"
        };

    } catch (error: any) {
        throw error;
    }
};

/**
 * Get all deals for a seller
 * This function retrieves all deals associated with a seller's secureId
 */
DealSchema.statics.getSellerDeals = async function (secureId, page = 1, limit = 10) {
    try {
        // Input validation
        if (!secureId) {
            errorMessage(400, "SecureId is required");
        }

        // Validate and sanitize inputs
        if (typeof secureId !== 'string') {
            errorMessage(400, "Invalid secureId format");
        }
        
        secureId = secureId.trim();
        
        // Validate pagination params
        page = Number(page);
        limit = Number(limit);
        
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

        const skip = (page - 1) * limit;
        
        // Create cache key
        const cacheKey = `${CACHE_CONFIG.PREFIXES.SELLER_DEALS}${secureId}:${page}:${limit}`;
        
        // Try to get from cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            const result = JSON.parse(cachedData);
            result.fromCache = true; // Indicate the data came from cache
            return result;
        }

        // Get total count
        const totalDeals = await this.countDocuments({ secureId });

        // Get deals with pagination
        const deals = await this.find({ secureId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const response = {
            message: "Seller deals retrieved successfully",
            data: {
                deals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalDeals / limit),
                    totalDeals,
                    limit
                }
            },
            fromCache: false
        };

        // Cache the response
        await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_CONFIG.TTL);

        return response;

    } catch (error: any) {
        throw error;
    }
};

/**
 * Get all deals for a buyer or by secureId
 * This function retrieves all deals associated with a buyer's userId or secureId
 */
DealSchema.statics.getUserDeals = async function (userId, secureId, page = 1, limit = 10) {
   
    // await this.deleteMany();
   
    try {
        // Input validation
        if (!userId && !secureId) {
            errorMessage(400, "Either userId or secureId is required");
        }
        
        // Sanitize inputs
        if (userId && typeof userId === 'string') userId = userId.trim();
        if (secureId && typeof secureId === 'string') secureId = secureId.trim();
        
        // Validate pagination params
        page = Number(page);
        limit = Number(limit);
        
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

        // Create a cache key based on parameters
        const cacheKey = `${CACHE_CONFIG.PREFIXES.USER_DEALS}${userId || ''}:${secureId || ''}:${page}:${limit}`;
        
        // Try to get data from Redis cache first
        const cachedData = await redis.get(cacheKey);
        
        // If cache exists, parse and return the data
        if (cachedData) {
            const result = JSON.parse(cachedData);
            result.fromCache = true; // Indicate the data came from cache
            // return result;
        }

        const skip = (page - 1) * limit;

        // Build query condition to match userId OR secureId
        // This looks for deals where:
        // 1. User is the creator (userId matches), OR
        // 2. User is the seller (secureId matches), OR
        // 3. User is the receiver (to field matches userId)
        const queryCondition: Record<string, any> = { $or: [] };
        
        if (userId) {
            queryCondition.$or.push({ userId });  // User is creator
            queryCondition.$or.push({ from: userId });  // User is buyer/sender
        }
        
        if (secureId) {
            queryCondition.$or.push({ secureId });  // User is seller
            queryCondition.$or.push({ to: secureId });  // User is receiver
        }
        
        // If no conditions were added, reset the query to empty
        if (queryCondition.$or.length === 0) {
            delete queryCondition.$or;
        }

        // Get total count
        const totalDeals = await this.countDocuments(queryCondition);

        // Get deals with pagination
        const deals = await this.find(queryCondition)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const response = {
            message: "User deals retrieved successfully",
            data: {
                deals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalDeals / limit),
                    totalDeals,
                    limit
                }
            },
            fromCache: false
        };

        // Store in Redis cache with expiration
        await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_CONFIG.TTL);

        return response;

    } catch (error: any) {
        throw error;
    }
};
/**
 * Get a single deal by ID
 * This function retrieves a specific deal by its ID
 */
DealSchema.statics.getDealById = async function(dealId) {
    try {
        // Input validation
        if (!dealId) {
            errorMessage(400, "Deal ID is required");
        }
        
        // Sanitize input
        if (typeof dealId === 'string') dealId = dealId.trim();
        
        // Create cache key
        const cacheKey = `${CACHE_CONFIG.PREFIXES.DEAL_DETAIL}${dealId}`;
        
        // Try to get from cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            const result = JSON.parse(cachedData);
            result.fromCache = true; // Indicate the data came from cache
            return result;
        }
        
        // Find the deal
        const deal = await this.findById(dealId);
        
        if (!deal) {
            errorMessage(404, "Deal not found");
        }
        
        const response = {
            message: "Deal retrieved successfully",
            data: deal,
            fromCache: false
        };
        
        // Cache the response
        await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_CONFIG.TTL);
        
        return response;
        
    } catch (error: any) {
        throw error;
    }
};

// Handle expired requests with a background job
// This would typically be done with a scheduled task/cron job
// Here's a method that could be called by a scheduled task
// DealSchema.statics.handleExpiredRequests = async function() {
//     try {
//         const now = new Date();
        
//         // Find all expired requests that are still awaiting approval
//         const expiredDeals = await this.find({
//             requestStatus: "awaiting approval",
//             requestExpiryDate: { $lt: now }
//         });
        
//         if (expiredDeals.length === 0) {
//             return { message: "No expired deals found" };
//         }
        
//         // Update all expired deals to declined status
//         await this.updateMany(
//             {
//                 requestStatus: "awaiting approval",
//                 requestExpiryDate: { $lt: now }
//             },
//             {
//                 requestStatus: "declined",
//                 $set: { "progressStatus": "null" }
//             }
//         );
        
//         // Clear all caches as this could affect multiple users
//         await this.clearDealCache();
        
//         return { 
//             message: `${expiredDeals.length} expired deal requests have been automatically declined`,
//             expiredDeals
//         };
        
//     } catch (error: any) {
//         console.error("Error handling expired requests:", error);
//         throw error;
//     }
// };

const Deal = model<IProduct, IProductModel>("Deals", DealSchema);

export default Deal;