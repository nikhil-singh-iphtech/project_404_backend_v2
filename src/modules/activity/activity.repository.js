
import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { ActivityModel } from "./activity.model.js";

class ActivityRepository extends BaseRepository {
  constructor() {
    super(ActivityModel);
  }

 
  async findByIssue(issueId, { page = 1, limit = 20 }) {
    return this.#paginatedFind({ issueId }, { page, limit });
  }

  async findByProject(projectId, { page = 1, limit = 20 }) {
    return this.#paginatedFind({ projectId }, { page, limit });
  }

  async findByWorkspace(workspaceId, { page = 1, limit = 20 }) {
    return this.#paginatedFind({ workspaceId }, { page, limit });
  }

  async #paginatedFind(filter, { page, limit }) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      ActivityModel.find(filter)
        .populate("actor", "name email profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityModel.countDocuments(filter),
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const activityRepository = new ActivityRepository();