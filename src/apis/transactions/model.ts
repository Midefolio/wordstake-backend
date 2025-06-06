/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferSchemaType, model, Model, Schema, startSession } from "mongoose";
import { errorMessage } from "../../controllers/errorController/error.controller";
import UserAuth from "../gamerAuth/model";
import { mailHandler } from "../../utils/helperFunctions";
import Deal from "../deals/model";

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
const TransactionSchema = new Schema(
    {
        userId: { 
            type: String, 
            required: [true, "No userId found"],
            trim: true  // Prevent whitespace attacks
        },
        txHash: {
            type: String, 
            required: [true, "dealId is required"],
            trim: true
        },
        timestamp: { 
            type: String, 
            required: [true, "please add a duration"],
            trim: true 
        },
        dealId: { 
            type: String, 
            required: [true, "dealId is required"],
            trim: true
        },
        amount: {
            type: Number,
            required: [true, "Please enter amount"],
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
        status: {
            type: String,
            enum: {
                values: ["escrow", "released"],
                message: "Status {VALUE} is not supported"
            },
            default: "awaiting approval"
        },
        senderId: { 
            type: String, 
            required: [true, "No senderId found"],
            trim: true  // Prevent whitespace attacks
        },
        senderAddress: { 
            type: String, 
            required: [true, "No senderId found"],
            trim: true  // Prevent whitespace attacks
        },
        sender: { 
            type: String, 
            required: [true, "No sender found"],
            trim: true  // Prevent whitespace attacks
        },
    },
    { timestamps: true }
);

// Add index for search optimization
TransactionSchema.index({ title: 'text', description: 'text' });

type IProduct = InferSchemaType<typeof TransactionSchema>;

interface IProductModel extends Model<IProduct> {
    createTransaction(transaction: any): Promise<any>;
   
}

/**
 * Clear deal-related cache entries based on patterns
 * @param patterns Array of cache key patterns to clear
 */

TransactionSchema.statics.clearDealCache = async function(patterns?: string[]) {
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
TransactionSchema.statics.createTransaction = async function (transaction) {
    const session = await startSession();
    session.startTransaction();

    try {
        // Sanitize input data
        const sanitizedData = Object.entries(transaction).reduce((acc:any, [key, value]) => {
            // Convert strings to trimmed strings and sanitize
            if (typeof value === 'string') {
                acc[key] = value.trim();
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        // Create a new transaction document based on the model
        const newTransaction = new this(sanitizedData);
        
        // Validate the transaction data
        await newTransaction.validate();
        
        // Save the transaction with session
        const savedTransaction = await newTransaction.save({ session });

        // Find and update the deal status to "In-progress"
        const updatedDeal = await Deal.findOneAndUpdate(
            { dealId: sanitizedData.dealId, userId: sanitizedData.userId },
            { progressStatus: 'In-progress' },
            { new: true, session }
        );

        const updateUserEscrowBalance = await this.UserAuth.findOneAndUpdate(
            { userId: sanitizedData.userId },
            { $inc: { escrowBalance: -sanitizedData.amount } },
            { new: true, session }
        )

        // If deal not found, throw an error
        if (!updatedDeal) {
            throw new Error(`Deal with id ${sanitizedData.dealId} not found`);
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();
        
        return {
            message: "Transaction created and deal updated successfully",
            data: savedTransaction,
            deal: updatedDeal
        };

    } catch (error:any) {
        // Abort transaction on error
        await session.abortTransaction();
        session.endSession();

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err:any) => err.message);
            throw errorMessage(400, `Validation error: ${messages.join(', ')}`);
        }
        if (error.code === 11000) {
            throw errorMessage(409, "A transaction with this ID already exists");
        }
        throw error;
    }
};

const Transaction = model<IProduct, IProductModel>("Transaction", TransactionSchema);

export default Transaction;