export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

// Role constants
export const ROLES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  MANAGEMENT: 'MANAGEMENT',
  ENGINEER: 'ENGINEER',
  SALES: 'SALES',
};
