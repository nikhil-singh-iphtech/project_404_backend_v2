import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { SprintModel } from "./sprint.model.js";
import { SPRINT_STATUSES } from "../../shared/constants/sprint.constants.js";

class SprintRepository extends BaseRepository {
  constructor() {
    super(SprintModel);
  }

  async findByProject(projectId) {
    return SprintModel.find({ projectId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
  }

  async findActiveSprint(projectId) {
    return SprintModel.findOne({
      projectId,
      status: SPRINT_STATUSES.ACTIVE,
    });
  }

  async findPlannedSprints(projectId) {
    return SprintModel.find({
      projectId,
      status: SPRINT_STATUSES.PLANNED,
    }).sort({ createdAt: 1 });
  }

  async findByIdWithProject(sprintId) {
    return SprintModel.findById(sprintId)
      .populate("projectId", "name key")
      .populate("createdBy", "name email");
  }
}

export const sprintRepository = new SprintRepository();