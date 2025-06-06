/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferSchemaType, model, Model, Schema } from "mongoose";
import { createToken, generateCode, hashPassword, mailHandler, validEmail, verifyCode, verifyPassword } from "../../utils/helperFunctions";
import { errorMessage } from "../../controllers/errorController/error.controller";

// Assuming redis is defined globally for caching
declare const redis: any;

// Cache TTL in seconds (1 hour)
const CACHE_TTL = 3600;

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    role: { type: String, enum: ['super', 'manager', 'support'], default: 'support' }
  },
  { timestamps: true }
);

type IAdminAuth = InferSchemaType<typeof adminSchema>;

interface IAdminAuthModel extends Model<IAdminAuth> {
  login(email: string, password?: string, googleAuth?: boolean): Promise<any>;
  addAdmin(email: string, password: string, role: string): Promise<any>;
  getAdmin(adminId: any): Promise<any>;
  getAllAdmins(page?: number, limit?: number): Promise<any>;
  forgotPassword(email: string): Promise<any>;
  updatePassword(email: string, inputedCode: string, newPassword: string): Promise<any>;
  deleteAdmin(adminId: string): Promise<any>;
  logout(userId: any): Promise<any>;
}

/**
 * Clear admin cache for a specific admin or all admins
 */
async function clearAdminCache(email?: string) {
  try {
    if (email) {
      // Clear specific admin cache
      await redis.del(`admin:${email}`);
    }
    
    // Clear admin list cache
    const keys = await redis.keys('admins:list:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error('Failed to clear admin cache:', error);
    // Continue without failing - cache clearing is not critical
  }
}

/**
 * Add a new admin
 */
adminSchema.statics.addAdmin = async function(email, password, role) {
  // Input validation
  if (!email) {
    errorMessage(400, "Email is required");
  }
  
  if (!password) {
    errorMessage(400, "Password is required");
  }
  
  const isEmailValid = validEmail(email);
  if (!isEmailValid) {
    errorMessage(400, "Invalid email format");
  }
  
  try {
    // Check if admin already exists
    const admin = await this.findOne({ email });
    if (admin) {
      errorMessage(409, "Admin with this email already exists");
    }
    
    // Hash password and create admin
    const encryptPassword = await hashPassword(password);
    const newAdmin = await this.create({ 
      email, 
      role: role || 'support', 
      password: encryptPassword 
    });
    
    // Send email with login credentials
    const emailResult = await mailHandler(
      'Admin Account Created',
      `Your login details are: <p>Email: ${email}</p> <p>Password: ${password}</p>. Please don't disclose to anyone and change your password after first login.`,
      newAdmin.email,
      "Admin System"
    );
    
    // Clear admin cache
    await clearAdminCache();
    
    return {
      message: "Admin created successfully",
      data: {
        email: newAdmin.email,
        role: newAdmin.role,
        emailSent: !!emailResult
      }
    };
  } catch (error) {
    if ((error as any).code === 11000) {
      errorMessage(409, "Admin with this email already exists");
    }
    throw error;
  }
};

/**
 * Admin login
 */
adminSchema.statics.login = async function(email, googleAuth = false, password?) {
  // Input validation
  if (!email) {
    errorMessage(400, "Email is required");
  }
  
  // Find admin in database
  const admin = await this.findOne({ email });
  if (!admin) {
    // Use generic message to prevent user enumeration
    errorMessage(401, "Invalid credentials");
  }
  
  let isAuthenticated = false;
  
  // Google Auth path
  if (googleAuth) {
    isAuthenticated = true;
  } 
  // Password auth path
  else {
    if (!password) {
      errorMessage(400, "Password is required");
    }
    
    const isPasswordValid = await verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      // Use generic message to prevent user enumeration
      errorMessage(401, "Invalid credentials");
    }
    
    isAuthenticated = true;
  }
  
  if (isAuthenticated) {
    // Generate JWT token
    const jwt = await createToken(admin._id);
    
    // Cache admin data
    const adminData = {
      _id: admin._id,
      email: admin.email,
      role: admin.role
    };
    
    await redis.setex(`admin:${admin._id}`, CACHE_TTL, JSON.stringify(adminData));
    
    return { 
      message: "Login successful", 
      data:jwt
    };
  }
};

/**
 * Get admin by email with caching
 */
adminSchema.statics.getAdmin = async function(adminId) {
  // Input validation
  if (!adminId) {
    errorMessage(400, "AdminId is required");
  }
  
  try {
    // Check cache first
    const cacheKey = `admin:${adminId}`;
    const cachedAdmin = await redis.get(cacheKey);
    
    if (cachedAdmin) {
      return {
        message: "Admin retrieved successfully (from cache)",
        data: JSON.parse(cachedAdmin)
      };
    }
    
    // Find admin in database if not in cache
    const admin = await this.findOne({_id: adminId }).select("-password");
    
    if (!admin) {
      errorMessage(404, "Admin not found");
    }
    
    // Cache the admin data
    const adminData = admin.toObject();
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(adminData));
    
    return {
      message: "Admin retrieved successfully",
      data: adminData
    };
  } catch (error) {
    console.error('Get admin error:', error);
    throw error;
  }
};

/**
 * Get all admins with pagination and caching
 */
adminSchema.statics.getAllAdmins = async function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  try {
    // Check cache first
    const cacheKey = `admins:list:${page}:${limit}`;
    const cachedResult = await redis.get(cacheKey);
    
    if (cachedResult) {
      return {
        message: "Admins retrieved successfully (from cache)",
        data: JSON.parse(cachedResult)
      };
    }
    
    // Fetch admins from database
    const admins = await this.find()
      .select("-password")
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalCount = await this.countDocuments();
    
    const result = {
      admins,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
    
    // Cache the result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    
    return {
      message: "Admins retrieved successfully",
      data: result
    };
  } catch (error) {
    console.error('Get all admins error:', error);
    errorMessage(500, "Failed to retrieve admins");
  }
};

/**
 * Forgot password - generate and send reset code
 */
adminSchema.statics.forgotPassword = async function(email) {
  // Input validation
  if (!email) {
    errorMessage(400, "Email is required");
  }
  
  // Find admin
  const admin = await this.findOne({ email });
  if (!admin) {
    // Use same message to prevent user enumeration, but don't actually send email
    return { message: "If your email exists in our system, a reset code has been sent" };
  }
  
  // Generate OTP
  const otp = generateCode(email);
  
  // Send email with OTP
  const emailSent = await mailHandler(
    'Password Reset Code', 
    `Your verification code is ${otp}. This code will expire in 15 minutes.`, 
    admin.email, 
    "Admin System"
  );
  
  return { 
    message: "If your email exists in our system, a reset code has been sent",
    success: !!emailSent
  };
};

/**
 * Update password with verification code
 */
adminSchema.statics.updatePassword = async function(email, inputedCode, newPassword) {
  // Input validation
  if (!email || !inputedCode || !newPassword) {
    errorMessage(400, "Email, verification code, and new password are required");
  }
  
  // Verify the code
  const isCodeValid = verifyCode(email, inputedCode);
  if (!isCodeValid) {
    errorMessage(401, 'Invalid or expired verification code');
  }
  
  // Hash the new password
  const hashedPassword = await hashPassword(newPassword);
  
  // Update the password
  const result = await this.updateOne(
    { email }, 
    { $set: { password: hashedPassword } }
  );
  
  if (result.modifiedCount === 0) {
    errorMessage(404, "Admin not found");
  }
  
  // Clear admin cache
  await clearAdminCache(email);
  
  return { 
    message: "Password updated successfully",
    success: true
  };
};

/**
 * Delete an admin
 */
adminSchema.statics.deleteAdmin = async function(adminId) {
  // Input validation
  if (!adminId) {
    errorMessage(400, "Admin ID is required");
  }
  
  try {
    // Find admin to get email before deletion (for cache clearing)
    const admin = await this.findById(adminId);
    if (!admin) {
      errorMessage(404, "Admin not found");
    }
    
    // Delete the admin
    await this.findByIdAndDelete(adminId);
    
    // Clear admin cache
    await clearAdminCache(admin.email);
    
    return {
      message: "Admin deleted successfully",
      data: {
        email: admin.email
      }
    };
  } catch (error) {
    if ((error as any).name === "CastError") {
      errorMessage(400, "Invalid admin ID format");
    }
    throw error;
  }
};

/**
 * logout an admin
 */
adminSchema.statics.logout = async function (userId) {
    if (!userId) errorMessage(400, "Invalid user ID format")
    const del = await redis.del(`admin:${userId}`);
    return {
        message: "User logout well",
        data: del
    };
}


const AdminAuth = model<IAdminAuth, IAdminAuthModel>("Admin", adminSchema);

export default AdminAuth;