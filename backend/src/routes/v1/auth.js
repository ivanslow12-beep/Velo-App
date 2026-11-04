import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { AuthService } from '../../services/AuthService.js';
import { success, error } from '../../utils/response.js';

const router = Router();

// POST /api/v1/auth/login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
  validate,
  async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body.email, req.body.password);
      return success(res, result, 'Login successful');
    } catch (err) {
      if (err.status) return error(res, err.message, err.status);
      next(err);
    }
  }
);

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res) => {
  return success(res, req.user);
});

// POST /api/v1/auth/change-password
router.post('/change-password',
  authenticate,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
  validate,
  async (req, res, next) => {
    try {
      await AuthService.changePassword(req.user.id, req.body.current_password, req.body.new_password);
      return success(res, null, 'Password changed successfully');
    } catch (err) {
      if (err.status) return error(res, err.message, err.status);
      next(err);
    }
  }
);

export default router;
