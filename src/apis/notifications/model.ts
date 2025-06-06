/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferSchemaType, model, Model, Schema } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { errorMessage } from "../../controllers/errorController/error.controller";
import { createToken, generateCode, hashPassword, mailHandler, validEmail, verifyCode, verifyPassword } from "../../utils/helperFunctions";

const CACHE_TTL = 3600;

const notificationSchema = new Schema(
    {
        userId: {type: String, required: true },
        amount: {type: String, required: true },
        txhash: {type: String, required: true },
        type: {type: String, required: true }, //incoming
    },
    { timestamps: true }
);

type IUserAuth = InferSchemaType<typeof notificationSchema>;

interface IUserAuthModel extends Model<IUserAuth> {
    sendOtp(email: string, action: string, password?: string): Promise<any>;
    signUp(formData: any): Promise<any>;
    login(formData: any): Promise<any>;
    getCurrentUser(userId: any): Promise<any>;
    getSellerDetails(secureId: any): Promise<any>;
    logout(userId: any): Promise<any>;
    updateUser(userId: any, updateData: any): Promise<any>;
}

notificationSchema.statics.sendOtp = async function (email, action, password?) {
    const valid = validEmail(email);
    if (!valid) { errorMessage(400, "Invalid email format") }

    if (action == 'signup') {
        // Check if user already exists
        const existingUser = await this.findOne({ email });
        if (existingUser) {
            errorMessage(409, 'A user with this email already exists');
        }
        const otp = generateCode(email);
        const welcomeSubject = "[SolCart.com] Verify Email";
        const Message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Solcart!</h2>
                <p>Thank you for signing up with Solcart. Please verify your email address using the OTP below:</p>
                <h3 style="color: #333;">Your OTP is: ${otp}</h3>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards,</p>
                <p><strong>The Solcart Team</strong></p>
            </div>
        `;
        try {
            await mailHandler(welcomeSubject, Message, email, "SolCart");
            return true;
        } catch (error) {
            console.error("Failed to send welcome email:", error);
            return false;
        }
    } else {
        const user = await this.findOne({ email });
        if (!user) { errorMessage(404, "Invalid Email OR password") }
        if (user.isBlocked) { errorMessage(403, "This account has been suspended") }
        const isPasswordCorrect = await verifyPassword(password, user.password);
        if (!isPasswordCorrect) { errorMessage(401, "Invalid Email OR password") }
        const otp = generateCode(email);
        const welcomeSubject = "[SolCart.com] Verify Login";
        const Message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">WelcomeBack to Solcart!</h2>
                <p>Thank you for signing up with Solcart. Please verify your Login using the OTP below:</p>
                <h3 style="color: #333;">Your OTP is: ${otp}</h3>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards,</p>
                <p><strong>The Solcart Team</strong></p>
            </div>
        `;
        try {
            await mailHandler(welcomeSubject, Message, email, "SolCart");
            return true;
        } catch (error) {
            console.error("Failed to send welcome email:", error);
            return false;
        }
    }
}

const generateSecureId = (firstName: string, lastName: string): string => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : 'U';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : 'U';
    return `${firstInitial}${lastInitial}-${uuidv4()}`;
  };

  notificationSchema.statics.signUp = async function (formData: any) {
    const { email, firstName, lastName, password, location, verificationCode } = formData;
    
    if (!verificationCode) { 
      errorMessage(409, 'Verification code is required');
    }
    
    const verified = verifyCode(email, verificationCode);
    if (!verified) { 
      errorMessage(409, 'Invalid verification code');
    }
    
    const existingUser = await this.findOne({ email });
    if (existingUser) { 
      errorMessage(409, 'A user with this email already exists');
    }
    
    // Generate secureId from first & last name and UUID
    const secureId = generateSecureId(firstName, lastName);
    
    const hash = await hashPassword(password);
    
    const AddNewUser = await this.create({
      email,
      firstName,
      lastName,
      password: hash,
      location,
      secureId    // Add the secureId to the user document
    });
    
    if (AddNewUser) {
      return {
        message: "done",
        data: "done"
      };
    }
  };

notificationSchema.statics.login = async function (formData: any) {
    const { email, password, verificationCode } = formData;
    if (!verificationCode || !password || !email) { errorMessage(409, 'Verification_Code, email and password are required') }
    const verified = verifyCode(email, verificationCode);
    if (!verified) { errorMessage(409, 'Invalid verification code') }
    const user = await this.findOne({ email });
    if (!user) { errorMessage(409, 'Invalid email or password') }
    const isPasswordCorrect = await verifyPassword(password, user.password);
    if (!isPasswordCorrect) { errorMessage(409, 'Invalid email or password') }
    if (user.isBlocked) { errorMessage(403, "This account has been suspended") }
    const token = await createToken(user._id);
    return {
        message: "done",
        jwt: token,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            location: user.location,
            isBlocked: user.isBlocked,
            secureId: user.secureId,
            _id: user._id,
            contacts: user.contacts,
            wallets: user.wallets,
            profilePicture: user.profilePicture
        }
    }
}

notificationSchema.statics.getCurrentUser = async function (userId) {
    // Input validation
    if (!userId) {
        errorMessage(400, "User ID is required");
    }

    try {
        // Check Redis cache first
        const cacheKey = `user:${userId}`;
        const cachedUser = await redis.get(cacheKey);

        if (cachedUser) {
            // Return cached data if available
            return {
                message: "User retrieved successfully (from cache)",
                data: JSON.parse(cachedUser)
            };
        }

        // If not in cache, query the database
        const user = await this.findById(userId).select("-password");

        if (!user) {
            errorMessage(404, "User not found");
        }


        // Cache the user data in Redis
        const userData = user.toObject();
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));

        // Return user data
        return {
            message: "User retrieved successfully",
            data: userData
        };
    } catch (error) {
        // Handle Redis connection errors
        if ((error as { name: string }).name === 'RedisError') {
            console.error('Redis error:', error);

            // Fallback to database if Redis fails
            const user = await this.findById(userId).select("-password");

            if (!user) {
                errorMessage(404, "User not found");
            }

            if (user.isBlocked) {
                errorMessage(403, "This account has been suspended");
            }

            return {
                message: "User retrieved successfully (Redis unavailable)",
                data: user
            };
        }

        // Handle invalid ID format
        if ((error as { name: string }).name === "CastError") {
            errorMessage(400, "Invalid user ID format");
        }

        // Re-throw other errors
        throw error;
    }
};

notificationSchema.statics.updateUser = async function (userId, updateData) {
    // Input validation
    if (!userId) {
        errorMessage(400, "User ID is required");
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
        errorMessage(400, "No update data provided");
    }
    
    try {
        // Prevent updating critical fields
        const protectedFields = ['password', 'email', 'isBlocked'];
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
        
        // Update user in database
        const updatedUser = await this.findByIdAndUpdate(
            userId, 
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");
        
        if (!updatedUser) {
            errorMessage(404, "User not found");
        }
        
        // Update Redis cache
        const cacheKey = `user:${userId}`;
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(updatedUser.toObject()));
        
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

notificationSchema.statics.logout = async function (userId) {
    if (!userId) errorMessage(400, "Invalid user ID format")
    const del = await redis.del(`user:${userId}`);
    return {
        message: "User logout well",
        data: del
    };
}

notificationSchema.statics.getSellerDetails = async function (secureId) {
    // Input validation
    if (!secureId) {
        errorMessage(400, "Secure ID is required");
    }

    try {
        // Check Redis cache first
        const cacheKey = `seller:${secureId}`;
        const cachedUser = await redis.get(cacheKey);

        if (cachedUser) {
            // Return cached data if available
            return {
                message: "User retrieved successfully (from cache)",
                data: JSON.parse(cachedUser)
            };
        }

        // If not in cache, query the database
        const user = await this.findOne({secureId}).select("-password");

        if (!user) {
            errorMessage(404, "User not found");
        }

        // Cache the user data in Redis
        const userData = user.toObject();
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));

        // Return user data
        return {
            message: "User retrieved successfully",
            data: userData
        };
    } catch (error) {
        // Handle Redis connection errors
        if ((error as { name: string }).name === 'RedisError') {
            console.error('Redis error:', error);

            // Fallback to database if Redis fails
            const user = await this.findOne({secureId}).select("-password");

            if (!user) {
                errorMessage(404, "User not found");
            }

            if (user.isBlocked) {
                errorMessage(403, "This account has been suspended");
            }

            return {
                message: "User retrieved successfully (Redis unavailable)",
                data: user
            };
        }

        // Handle invalid ID format
        if ((error as { name: string }).name === "CastError") {
            errorMessage(400, "Invalid user ID format");
        }

        // Re-throw other errors
        throw error;
    }
};

const UserAuth = model<IUserAuth, IUserAuthModel>("User", notificationSchema);

export default UserAuth;