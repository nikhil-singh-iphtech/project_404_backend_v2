// src/modules/comment/comment.repository.js

import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { CommentModel } from "./comment.model.js";

class CommentRepository extends BaseRepository {
  constructor() {
    super(CommentModel);
  }

  /**
   * Paginated comments for an issue.
   * Oldest first — natural conversation thread order.
   *
   * Why paginate comments?
   * A popular issue in a large team can accumulate
   * hundreds of comments. Returning all at once would
   * be slow and waste bandwidth.
   */
  async findByIssue(issueId, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      CommentModel.find({ issueId })
        .populate("author", "name email profilePicture")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      CommentModel.countDocuments({ issueId }),
    ]);

    return {
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdWithAuthor(commentId) {
    return CommentModel.findById(commentId)
      .populate("author", "name email profilePicture");
  }
}

export const commentRepository = new CommentRepository();