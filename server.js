// src/server.js

import http from "http";
import app from "./app.js";
import { config } from "./src/config/app.config.js";
import { connectDatabase } from "./src/database/db.js";
import { logger } from "./src/shared/utils/logger.js";
import { initializeSocket } from "./src/socket/socket.server.js";

const startServer = async () => {
  await connectDatabase();

  /**
   * Why create an HTTP server manually instead of app.listen()?
   *
   * Socket.io needs to attach to the same HTTP server as Express.
   * app.listen() creates an HTTP server internally but doesn't
   * expose it. We create it explicitly so both Express and
   * Socket.io share the same port.
   */
  const httpServer = http.createServer(app);

  // Initialize Socket.io on the same HTTP server
  initializeSocket(httpServer);

  httpServer.listen(config.PORT, () => {
    logger.info(
      `Server running on port ${config.PORT} in ${config.NODE_ENV} mode`
    );
    logger.info(`WebSocket server ready on port ${config.PORT}`);
  });

  // ─── Graceful shutdown ────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      logger.info("HTTP + WebSocket server closed. Exiting.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("UNHANDLED REJECTION:", reason);
    shutdown("UNHANDLED_REJECTION");
  });
};

startServer();