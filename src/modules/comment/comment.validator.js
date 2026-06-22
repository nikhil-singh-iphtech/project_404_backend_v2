// src/modules/comment/comment.validator.js

import Joi from "joi";

export const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required().messages({
    "string.empty": "Comment cannot be empty",
    "any.required": "Comment content is required",
  }),
});

export const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required().messages({
    "string.empty": "Comment cannot be empty",
  }),
});

export const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});