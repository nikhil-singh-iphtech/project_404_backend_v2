// src/modules/workspace/workspace.validator.js

import Joi from "joi";

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(200).optional().allow("", null),
  logo: Joi.string().uri().optional().allow("", null),
});

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(200).optional().allow("", null),
  logo: Joi.string().uri().optional().allow("", null),
}).min(1);

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid("ADMIN", "MEMBER").required().messages({
    "any.only": "Role must be ADMIN or MEMBER",
  }),
});