// src/modules/project/project.validator.js

import Joi from "joi";

export const createProjectSchema = Joi.object({
  name:        Joi.string().min(2).max(100).required(),
  key:         Joi.string().min(2).max(10).alphanum().required(),
  description: Joi.string().max(500).optional().allow("", null),
  emoji:       Joi.string().optional().allow("", null),
 
});

export const updateProjectSchema = Joi.object({
  name:        Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow("", null),
  emoji:       Joi.string().optional().allow("", null),
  status:      Joi.string().valid("ACTIVE", "ARCHIVED").optional(),
}).min(1);

export const addProjectMemberSchema = Joi.object({
  userId: Joi.string().required(),
  role:   Joi.string().valid("ADMIN", "MEMBER", "VIEWER").optional(),
});