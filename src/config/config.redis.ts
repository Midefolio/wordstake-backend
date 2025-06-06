// ./config/config.redis.ts
import Redis from 'ioredis';
import env from './config.ValidateEnv';

const connectToRedis = () => {
  const redis = new Redis(env.REDIS_URL);

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
  });

  return redis;
};

export default connectToRedis;
