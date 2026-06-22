// src/modules/comment/comment.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { commentService } from "./comment.service.js";

class CommentController {
  create = asyncHandler(async (req, res) => {
    const comment = await commentService.createComment(
      req.body,
      req.params.issueId,
      req.params.projectId,
      req.params.workspaceId,
      req.user._id
    );
    ApiResponse.created(res, "Comment added successfully", { comment });
  });

  getAll = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await commentService.getComments(
      req.params.issueId,
      { page, limit }
    );

    ApiResponse.paginated(
      res,
      "Comments fetched successfully",
      result.comments,
      {
        page:       result.page,
        limit:      result.limit,
        total:      result.total,
        totalPages: result.totalPages,
      }
    );
  });

  update = asyncHandler(async (req, res) => {
    const comment = await commentService.updateComment(
      req.params.commentId,
      req.body,
      req.user._id
    );
    ApiResponse.success(res, 200, "Comment updated successfully", { comment });
  });

  delete = asyncHandler(async (req, res) => {
    await commentService.deleteComment(
      req.params.commentId,
      req.user._id,
      req.projectMembership?.role
    );
    ApiResponse.noContent(res);
  });
}

export const commentController = new CommentController();