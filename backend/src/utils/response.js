/**
 * Standard API response helpers.
 */

export const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({ success: true, message, data, pagination });
};

export const error = (res, message = 'Error', statusCode = 400, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};
