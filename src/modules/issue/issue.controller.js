// src/modules/issue/issue.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { issueService } from "./issue.service.js";

class IssueController {
  create = asyncHandler(async (req, res) => {
    const issue = await issueService.createIssue(
      req.body,
      req.params.projectId,
      req.params.workspaceId,
      req.user._id
    );
    ApiResponse.created(res, "Issue created successfully", { issue });
  });

  getAll = asyncHandler(async (req, res) => {
    /**
     * Query params become filters.
     * GET /issues?status=TODO&type=BUG&priority=HIGH
     */
    const filters = {
      status:   req.query.status,
      type:     req.query.type,
      priority: req.query.priority,
      assignee: req.query.assignee,
      sprintId: req.query.sprintId,
    };

    const issues = await issueService.getIssues(
      req.params.projectId,
      filters
    );
    ApiResponse.success(res, 200, "Issues fetched successfully", { issues });
  });

  getById = asyncHandler(async (req, res) => {
    const issue = await issueService.getIssueById(req.params.issueId);
    ApiResponse.success(res, 200, "Issue fetched successfully", { issue });
  });

  update = asyncHandler(async (req, res) => {
    const issue = await issueService.updateIssue(
      req.params.issueId,
      req.body,
      req.user._id 
    );
    ApiResponse.success(res, 200, "Issue updated successfully", { issue });
  });

  updateStatus = asyncHandler(async (req, res) => {
    const issue = await issueService.updateStatus(
      req.params.issueId,
      req.body.status,
      req.user._id 
    );
    ApiResponse.success(res, 200, "Issue status updated successfully", { issue });
  });

  getSubtasks = asyncHandler(async (req, res) => {
    const subtasks = await issueService.getSubtasks(req.params.issueId);
    ApiResponse.success(res, 200, "Subtasks fetched successfully", { subtasks });
  });

  delete = asyncHandler(async (req, res) => {
    await issueService.deleteIssue(req.params.issueId,req.user._id );
    ApiResponse.noContent(res);
  });



  getBoard = asyncHandler(async (req, res) => {
    const filters = {
      assignee: req.query.assignee,
      priority: req.query.priority,
      type:     req.query.type,
      sprintId: req.query.sprintId,
    };

    const board = await issueService.getBoardIssues(
      req.params.projectId,
      filters
    );

    ApiResponse.success(res, 200, "Board fetched successfully", { board });
  });

  moveIssue = asyncHandler(async (req, res) => {
    const { newStatus, newOrder } = req.body;

    const board = await issueService.moveIssue({
      issueId:   req.params.issueId,
      newStatus,
      newOrder:    req.body.newOrder, 
      projectId: req.params.projectId,
    });

    ApiResponse.success(res, 200, "Issue moved successfully", { board });
  });
}

export const issueController = new IssueController();