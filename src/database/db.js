// src/database/db.js

import mongoose from "mongoose";
import { config } from "../config/app.config.js";
import { logger } from "../shared/utils/logger.js";

const MAX_RETRIES = 20;
const RETRY_DELAY_MS = 5000;


export const connectDatabase = async (retries = MAX_RETRIES) => {
  try {
    const connection = await mongoose.connect(config.MONGO_URI, {
    
      maxPoolSize: 10,         
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);

    if (retries > 0) {
      logger.info(`Retrying connection... (${retries} attempts remaining)`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDatabase(retries - 1);
    }

    
    logger.error("All MongoDB connection attempts failed. Exiting.");
    process.exit(1);
  }
};


mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});