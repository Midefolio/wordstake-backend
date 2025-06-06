/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../../config/config.ValidateEnv";
import  GamerAuth from "./model";
import { errorMessage } from "../../controllers/errorController/error.controller";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: "No Authorization token, Please login" });
  }

  const token = authorization.split(" ")[1];

  try {
    const { _id } = jwt.verify(token, env.SECRET as string) as { _id: string };

    // Check Redis cache
    // const cachedUser = await redis.get(`user:${_id}`);
    let user;

     user = await GamerAuth.findOne({ _id });
      if (!user) {
        return errorMessage(401, "Invalid login credentials");
      }

    if (user?.isBlocked) {
      return errorMessage(403, "Your account has been suspended. Please contact support.");
    }

    req.user = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
};

export default requireAuth;
