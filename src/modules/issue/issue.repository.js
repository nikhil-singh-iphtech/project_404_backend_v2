// src/modules/issue/issue.repository.js

import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { IssueModel } from "./issue.model.js";
import { IssueSequenceModel } from "./issueSequence.model.js";
import { ISSUE_STATUSES } from "../../shared/constants/issue.constants.js";
class IssueRepository extends BaseRepository {
  constructor() {
    super(IssueModel);
  }

  /**
   * Atomically increments and returns the next issue number.
   *
   * findOneAndUpdate with $inc is a single atomic MongoDB operation.
   * No two simultaneous requests can get the same number.
   * upsert:true creates the sequence document if it doesn't exist yet.
   */
  async getNextIssueNumber(projectId) {
    const sequence = await IssueSequenceModel.findOneAndUpdate(
      { projectId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return sequence.seq;
  }

  async findByCode(projectId, issueCode) {
    return IssueModel.findOne({ projectId, issueCode });
  }

  async findAllByProject(projectId, filters = {}) {
    const query = { projectId };

    if (filters.status)   query.status   = filters.status;
    if (filters.type)     query.type     = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignee) query.assignees = filters.assignee;
    if (filters.sprintId) query.sprintId = filters.sprintId;

    /**
     * Only return top-level issues by default.
     * Subtasks are fetched separately via /subtasks endpoint.
     * This keeps list responses clean and fast.
     */
    if (!filters.includeSubtasks) {
      query.parentId = null;
    }

    return IssueModel.find(query)
      .populate("assignees", "name email profilePicture")
      .populate("reporter",  "name email profilePicture")
      .sort({ order: 1, createdAt: -1 });
  }

  async findById(id) {
    return IssueModel.findById(id)
      .populate("assignees", "name email profilePicture")
      .populate("reporter",  "name email profilePicture")
      .populate("parentId",  "title issueCode type status");
  }

  async findSubtasks(parentId) {
    return IssueModel.find({ parentId })
      .populate("assignees", "name email profilePicture")
      .sort({ order: 1, createdAt: 1 });
  }

  async findByStatus(projectId, status) {
    return IssueModel.find({ projectId, status })
      .sort({ order: 1 });
  }

  async getMaxOrder(projectId, status) {
    const issue = await IssueModel.findOne({ projectId, status })
      .sort({ order: -1 })
      .select("order");
    return issue ? issue.order : 0;
  }

  /**
   * Fetches all issues for a project grouped by status.
   * Single aggregation query — replaces 4 separate find() calls.
   *
   * Why aggregation instead of find() + JS grouping?
   * MongoDB does the grouping on the server side.
   * Less data transferred, faster response.
   */
  async getBoardIssues(projectId, filters = {}) {
    const match = {
      projectId:  new (await import("mongoose")).default.Types.ObjectId(projectId),
      parentId:   null,  // top-level issues only on board
    };

    if (filters.assignee) match.assignees = filters.assignee;
    if (filters.priority) match.priority  = filters.priority;
    if (filters.type)     match.type      = filters.type;
    if (filters.sprintId) match.sprintId  = filters.sprintId;

    const issues = await IssueModel.find(match)
      .populate("assignees", "name email profilePicture")
      .populate("reporter",  "name email profilePicture")
      .sort({ order: 1 });

    /**
     * Group issues by status in JavaScript after fetching.
     * Simpler than MongoDB $group aggregation for this use case.
     * Initialize all columns even if empty — frontend needs them.
     */
    const board = {
      [ISSUE_STATUSES.TODO]:        [],
      [ISSUE_STATUSES.IN_PROGRESS]: [],
      [ISSUE_STATUSES.IN_REVIEW]:   [],
      [ISSUE_STATUSES.DONE]:        [],
    };

    issues.forEach((issue) => {
      if (board[issue.status]) {
        board[issue.status].push(issue);
      }
    });

    return board;
  }

  /**
   * Fetches all issues in a specific column sorted by order.
   * Used by the move algorithm to calculate new positions.
   */
  async getColumnIssues(projectId, status) {
    return IssueModel.find({ projectId, status, parentId: null })
      .sort({ order: 1 })
      .select("_id order status");
  }

  /**
   * Executes a bulk write operation for reordering.
   * All updates happen in a single MongoDB round trip.
   */
  async bulkUpdateOrder(operations) {
    if (!operations.length) return;
    return IssueModel.bulkWrite(operations);
  }
}

export const issueRepository = new IssueRepository();