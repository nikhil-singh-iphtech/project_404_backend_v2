// src/modules/invitation/invitation.routes.js
import Joi from "joi"
import { Router } from "express";
import { invitationController } from "./invitation.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../shared/middleware/authorization.middleware.js";
import { validate } from "../../shared/validators/validate.js";
import { sendInvitationSchema, acceptInvitationSchema } from "./invitation.validator.js";

export const invitationRouter = Router({ mergeParams: true });

invitationRouter.get("/details", validate(
  Joi.object({ token: Joi.string().required() }), "query"
), invitationController.getDetails);

invitationRouter.use(authenticate);

invitationRouter.post(   "/",                    requireWorkspaceRole("ADMIN"),  validate(sendInvitationSchema),   invitationController.send);
invitationRouter.get(    "/",                    requireWorkspaceRole("ADMIN"),  invitationController.getAll);
invitationRouter.post(   "/accept",              validate(acceptInvitationSchema), invitationController.accept);
invitationRouter.delete( "/:invitationId",       requireWorkspaceRole("ADMIN"),  invitationController.revoke);