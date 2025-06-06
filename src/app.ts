/* eslint-disable @typescript-eslint/no-explicit-any */
import http from 'http';
import express from "express";
import helmet from 'helmet';
import connectToDb from "./config/config.dbCon";
import env from "./config/config.ValidateEnv";
import cors from "cors";
import morgan from "morgan";
import { ErrorHandler, NotFound } from "./controllers/errorController/error.controller";
import logger from './config/config.logger';
import connectToRedis from './config/config.redis'; 
import { rateLimiter } from './config/config.ratelimitter';
import gamerRoute from './apis/gamerAuth/routes';
import SocketManager from './config/config.sockets';


declare global {
    var redis: ReturnType<typeof connectToRedis>;
    var socketManager: SocketManager;
}

// Set up express app
const app = express();

app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "trusted-cdn.com"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable specific protections if needed
    })
  );

app.use(cors({
    // origin: ['http://localhost:3000'], // whitelist
    origin:"*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }));

app.use(express.json());
app.use(morgan("dev"));

app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
// app.use('/api/v1/admin', AdminRoutes);        
app.use('/api/v1/game', gamerRoute);

app.use(NotFound);
app.use(ErrorHandler);

// This function will start the server after Redis connects
const startServer = () => {
    const server = http.createServer(app);
    server.listen(env.PORT, (): void => {
        logger.info(`✅ Server listening on port ${env.PORT}`);
    });

    const gracefulShutdown = (signal: string) => {
        return (err?: Error) => {
            if (err) logger.error(err);
            logger.info(`Received ${signal}. Closing HTTP server.`);
            server.close(() => {
                logger.info('HTTP server closed.');
                process.exit(err ? 1 : 0);
            });
        };
    };

    process.on('uncaughtException', gracefulShutdown('uncaughtException'));
    process.on('unhandledRejection', gracefulShutdown('unhandledRejection'));
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
    process.on('SIGINT', gracefulShutdown('SIGINT'));
};

// Connect to Redis, then connect to MongoDB and start the server

connectToDb(startServer);

const redis = connectToRedis();

redis.once('connect', () => {
    global.redis = redis;
    logger.info('✅ Redis connected, now connecting to MongoDB...');
    connectToDb(startServer);
});
