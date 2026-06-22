import Joi from "joi";

export const createSprintSchema = Joi.object({
  name: Joi.string().max(100).required(),
  goal: Joi.string().max(500).optional().allow("", null),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
});

export const updateSprintSchema = Joi.object({
  name:      Joi.string().max(100).optional(),
  goal:      Joi.string().max(500).optional().allow("", null),
  startDate: Joi.date().optional().allow(null),
  endDate:   Joi.date().optional().allow(null),
}).min(1);

export const addIssueToSprintSchema = Joi.object({
  issueId: Joi.string().required(),
});