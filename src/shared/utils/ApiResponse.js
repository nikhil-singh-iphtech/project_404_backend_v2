
export class ApiResponse {
  /**
   * @param {import("express").Response} res
   * @param {number} statusCode
   * @param {string} message
   * @param {any} data
   */
  static success(res, statusCode = 200, message = "Success", data = null) {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    return res.status(statusCode).json(response);
  }

  static created(res, message = "Created successfully", data = null) {
    return ApiResponse.success(res, 201, message, data);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * For paginated list endpoints.
   * Keeps pagination metadata separate from data payload.
   */
 static paginated(res, message = "Fetched successfully", data = [], pagination = {}) {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page:        pagination.page      || 1,
      limit:       pagination.limit     || 20,
      total:       pagination.total     || 0,
      totalPages:  pagination.totalPages || 1,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
    },
  });
}

}