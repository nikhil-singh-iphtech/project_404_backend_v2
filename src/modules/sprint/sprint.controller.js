import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { sprintService } from "./sprint.service.js";

class SprintController {
  create = asyncHandler(async (req, res) => {
    const sprint = await sprintService.createSprint(
      req.body,
      req.params.projectId,
      req.params.workspaceId,
      req.user._id
    );
    ApiResponse.created(res, "Sprint created successfully", { sprint });
  });

  getAll = asyncHandler(async (req, res) => {
    const sprints = await sprintService.getSprints(req.params.projectId);
    ApiResponse.success(res, 200, "Sprints fetched successfully", { sprints });
  });

  getById = asyncHandler(async (req, res) => {
    const sprint = await sprintService.getSprintById(req.params.sprintId);
    ApiResponse.success(res, 200, "Sprint fetched successfully", { sprint });
  });

  update = asyncHandler(async (req, res) => {
    const sprint = await sprintService.updateSprint(
      req.params.sprintId,
      req.body
    );
    ApiResponse.success(res, 200, "Sprint updated successfully", { sprint });
  });

  delete = asyncHandler(async (req, res) => {
    await sprintService.deleteSprint(req.params.sprintId);
    ApiResponse.noContent(res);
  });

  start = asyncHandler(async (req, res) => {
    const sprint = await sprintService.startSprint(
      req.params.sprintId,
      req.params.projectId,
      req.user._id
    );
    ApiResponse.success(res, 200, "Sprint started successfully", { sprint });
  });

  complete = asyncHandler(async (req, res) => {
    const sprint = await sprintService.completeSprint(
      req.params.sprintId,
      req.params.projectId,
      req.user._id
    );
    ApiResponse.success(res, 200, "Sprint completed successfully", { sprint });
  });

  getIssues = asyncHandler(async (req, res) => {
    const issues = await sprintService.getSprintIssues(req.params.sprintId);
    ApiResponse.success(res, 200, "Sprint issues fetched successfully", { issues });
  });

  addIssue = asyncHandler(async (req, res) => {
    const issue = await sprintService.addIssueToSprint(
      req.params.sprintId,
      req.body.issueId
    );
    ApiResponse.success(res, 200, "Issue added to sprint", { issue });
  });

  removeIssue = asyncHandler(async (req, res) => {
    await sprintService.removeIssueFromSprint(
      req.params.sprintId,
      req.params.issueId
    );
    ApiResponse.noContent(res);
  });
}

export const sprintController = new SprintController();