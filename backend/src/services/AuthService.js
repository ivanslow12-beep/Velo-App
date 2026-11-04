import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import config from '../config/index.js';

export class AuthService {
  /**
   * Authenticate a user and return a signed JWT alongside safe user data.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ token: string, user: object }>}
   */
  static async login(email, password) {
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) throw { status: 401, message: 'Invalid credentials' };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid credentials' };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    await user.update({ last_login_at: new Date() });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Hash a plain-text password using bcrypt.
   *
   * @param {string} password
   * @returns {Promise<string>}
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  /**
   * Change a user's password after verifying the current one.
   *
   * @param {number} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<true>}
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw { status: 404, message: 'User not found' };

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw { status: 400, message: 'Current password is incorrect' };

    const hashed = await AuthService.hashPassword(newPassword);
    await user.update({ password: hashed });
    return true;
  }
}
