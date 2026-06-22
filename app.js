import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { mongoSanitizeMiddleware } from "./src/shared/middleware/mongoSanitize.js";

import { config } from "./src/config/app.config.js";
import { globalErrorHandler } from "./src/shared/errors/errorHandler.js";
import { notFound } from "./src/shared/middleware/notFound.js";
import { logger } from "./src/shared/utils/logger.js";
import passport from "passport";
import { initializePassport } from "./src/config/passport.config.js";

import { invitationRouter } from "./src/modules/invitation/invitation.routes.js";
import { workspaceRouter } from "./src/modules/workspace/workspace.routes.js";
import { projectRouter } from "./src/modules/project/project.routes.js";
import { issueRouter } from "./src/modules/issue/index.js";
import { sprintRouter } from "./src/modules/sprint/index.js";
import { commentRouter } from "./src/modules/comment/index.js";
import {
  issueActivityRouter,
  projectActivityRouter,
  workspaceActivityRouter,
} from "./src/modules/activity/index.js";



import { authRouter } from "./src/modules/auth/index.js";

import { notificationRouter } from "./src/modules/notification/index.js";

import {
  workspaceDashboardRouter,
  projectDashboardRouter,
} from "./src/modules/dashboard/index.js";


const app = express();




app.use(helmet());

// Sanitize request data against MongoDB operator injection
// e.g., { email: { "$gt": "" } } gets stripped
app.use(mongoSanitizeMiddleware);

// CORS — only allow our frontend origin
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));



/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Auth endpoints get a stricter separate limiter (defined in auth routes).
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in 15 minutes.",
  },
});

app.use(globalLimiter);


app.use(express.json({ limit: "10kb" }));   
app.use(express.urlencoded({ extended: true, limit: "10kb" }));


app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

initializePassport();
app.use(passport.initialize());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/workspaces", workspaceRouter);

app.use("/api/workspaces/:workspaceId/projects",    projectRouter);
app.use("/api/workspaces/:workspaceId/invitations", invitationRouter);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/issues",
  issueRouter
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/sprints",
  sprintRouter
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/comments",
  commentRouter
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/activities",
  issueActivityRouter
);

app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/activities",
  projectActivityRouter
);

app.use(
  "/api/workspaces/:workspaceId/activities",
  workspaceActivityRouter
);

app.use("/api/notifications", notificationRouter);
app.use(
  "/api/workspaces/:workspaceId/dashboard",
  workspaceDashboardRouter
);

app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/dashboard",
  projectDashboardRouter
);



// ── Error Handling ────────────────────────────────────────────────────────────
// Order matters: notFound must come before globalErrorHandler
app.use(notFound);
app.use(globalErrorHandler);

export default app;