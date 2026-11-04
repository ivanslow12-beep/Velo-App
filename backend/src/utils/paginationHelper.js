/**
 * Pagination helpers for list endpoints.
 */

/**
 * Extracts pagination parameters from query string.
 * Defaults: page=1, limit=20. Max limit: 100.
 *
 * @param {object} query - req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
export const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Builds pagination metadata for list responses.
 *
 * @param {number} total  - Total record count
 * @param {number} page   - Current page
 * @param {number} limit  - Records per page
 * @returns {object}
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};
