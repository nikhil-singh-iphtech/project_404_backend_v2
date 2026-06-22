// src/shared/repositories/BaseRepository.js

/**
 * Generic base repository providing standard CRUD operations.
 *
 * Every module repository extends this, then adds domain-specific methods.
 *
 * Example:
 * class WorkspaceRepository extends BaseRepository {
 *   constructor() { super(WorkspaceModel); }
 *
 *   async findBySlug(slug) {
 *     return this.model.findOne({ slug });
 *   }
 * }
 *
 * Trade-off: Some teams skip this pattern for simplicity.
 * It's worth it at scale when you have 10+ repositories with identical boilerplate.
 */
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, projection = {}) {
    return this.model.findById(id, projection);
  }

  async findOne(filter, projection = {}) {
    return this.model.findOne(filter, projection);
  }

  async findMany(filter = {}, options = {}) {
    const { sort = { createdAt: -1 }, limit = 20, skip = 0, projection = {} } = options;
    return this.model.find(filter, projection).sort(sort).skip(skip).limit(limit);
  }

  async create(data) {
    return this.model.create(data);
  }

  async updateById(id, updates, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, updates, options);
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter) {
    return this.model.exists(filter);
  }
}