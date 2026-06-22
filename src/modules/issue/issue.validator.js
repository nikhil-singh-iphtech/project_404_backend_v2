// src/modules/issue/issue.validator.js

import Joi from "joi";

export const createIssueSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),

  description: Joi.string().max(50000).optional().allow("", null),

  type: Joi.string()
    .valid("EPIC", "STORY", "TASK", "BUG", "SUBTASK")
    .required(),

  priority: Joi.string()
    .valid("CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE")
    .default("MEDIUM"),

  assignees: Joi.array().items(Joi.string()).optional().default([]),

  parentId: Joi.string().optional().allow(null),

  sprintId: Joi.string().optional().allow(null),

  labels: Joi.array().items(
    Joi.string().max(50)
  ).optional().default([]),

  dueDate: Joi.date().optional().allow(null),

  estimatedHours: Joi.number().min(0).optional().allow(null),
});

export const updateIssueSchema = Joi.object({
  title:          Joi.string().min(3).max(255).optional(),
  description:    Joi.string().max(50000).optional().allow("", null),
  priority:       Joi.string().valid("CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE").optional(),
  assignees:      Joi.array().items(Joi.string()).optional(),
  parentId:       Joi.string().optional().allow(null),
  sprintId:       Joi.string().optional().allow(null),
  labels:         Joi.array().items(Joi.string().max(50)).optional(),
  dueDate:        Joi.date().optional().allow(null),
  estimatedHours: Joi.number().min(0).optional().allow(null),
  order:          Joi.number().optional(),
}).min(1);

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE")
    .required(),
});

// src/modules/issue/issue.validator.js
// Add at the bottom

export const moveIssueSchema = Joi.object({
  newStatus: Joi.string()
    .valid("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE")
    .required(),

  /**
   * 1-based position in the target column.
   * Position 1 = top of column.
   * If not provided, issue is placed at the bottom.
   */
  newOrder: Joi.number().integer().min(1).optional(),
});