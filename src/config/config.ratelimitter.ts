import { Request, Response, NextFunction } from 'express';

const WINDOW_SIZE_IN_SECONDS = 60; // 1 minute
const MAX_REQUESTS = 20;

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip;
    const redisKey = `rate-limit:${ip}`;

    // Get current count or null if key doesn't exist
    // const del = await redis.del(redisKey);
    const current = await global.redis.get(redisKey);


    if (current && parseInt(current) >= MAX_REQUESTS) {
      return res.status(429).json({ message: 'Too many requests. Please try again in a minute.' });
    }

    // Use a pipeline to ensure atomicity
    const pipeline = global.redis.pipeline();
    
    if (current) {
      // Increment the counter
      pipeline.incr(redisKey);
      // Reset the expiration time with each request to ensure it expires properly
      pipeline.expire(redisKey, WINDOW_SIZE_IN_SECONDS);
    } else {
      // Set the key with expiration for first request
      pipeline.set(redisKey, 1, 'EX', WINDOW_SIZE_IN_SECONDS);
    }
    
    // Execute pipeline
    await pipeline.exec();

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    return res.status(500).json({ message: `Internal server error: ${error}` });
  }
};