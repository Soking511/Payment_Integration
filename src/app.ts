import dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import mountRoutes from "./routes/index";
import connectDB from "./config/database";
import { IUser } from "./interfaces/user.interface";
import { checkRedisConnection } from "./config/redis";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      rawBody?: Buffer;
    }
  }
}

// App
export const APP: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for rate limiting behind reverse proxies
APP.set('trust proxy', 1);

// Create raw body buffer for webhook verification
APP.use('/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    if (req.method === 'POST') {
      req.rawBody = req.body;
    }
    next();
  }
);

// Regular JSON parser for other routes
APP.use(express.json());

// Routes
mountRoutes(APP);

// Server
const startServer = async () => {
  try {
    await connectDB();
    await checkRedisConnection();
    APP.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.log("Unhandled Rejection! Shutting down...");
  console.error(err);
  process.exit(1);
});
