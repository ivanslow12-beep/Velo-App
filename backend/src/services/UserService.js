import { Op } from 'sequelize';
import { User } from '../models/index.js';
import { AuthService } from './AuthService.js';
import { getPagination, buildPaginationMeta } from '../utils/paginationHelper.js';

export class UserService {
  /**
   * List users with optional filters and pagination.
   *
   * @param {object} filters - { role, search, isActive }
   * @param {object} paginationQuery - raw query params (page, limit)
   * @returns {Promise<{ rows: User[], pagination: object }>}
   */
  static async list(filters = {}, paginationQuery = {}) {
    const { page, limit, offset } = getPagination(paginationQuery);
    const where = {};

    if (filters.role) where.role = filters.role;
    if (typeof filters.isActive !== 'undefined') where.is_active = filters.isActive;
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password'] },
    });

    return {
      rows,
      pagination: buildPaginationMeta(count, page, limit),
    };
  }

  /**
   * Get a single user by primary key (password excluded).
   *
   * @param {number} id
   * @returns {Promise<User>}
   */
  static async getById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) throw { status: 404, message: 'User not found' };
    return user;
  }

  /**
   * Create a new user.
   *
   * @param {object} data - { name, email, password, role, phone, avatar }
   * @returns {Promise<User>}
   */
  static async create(data) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw { status: 409, message: 'Email already in use' };

    const hashed = await AuthService.hashPassword(data.password);
    const user = await User.create({
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      phone: data.phone || null,
      avatar: data.avatar || null,
      is_active: true,
    });

    const { password: _pw, ...safeUser } = user.toJSON();
    return safeUser;
  }

  /**
   * Update user profile (excluding password).
   *
   * @param {number} id
   * @param {object} data - { name, phone, avatar, role, isActive }
   * @returns {Promise<User>}
   */
  static async update(id, data) {
    const user = await User.findByPk(id);
    if (!user) throw { status: 404, message: 'User not found' };

    // If email is being changed, ensure no duplicate
    if (data.email && data.email !== user.email) {
      const existing = await User.findOne({ where: { email: data.email } });
      if (existing) throw { status: 409, message: 'Email already in use' };
    }

    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.email !== undefined) updateFields.email = data.email;
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.avatar !== undefined) updateFields.avatar = data.avatar;
    if (data.role !== undefined) updateFields.role = data.role;
    if (typeof data.isActive !== 'undefined') updateFields.is_active = data.isActive;

    await user.update(updateFields);

    const { password: _pw, ...safeUser } = user.toJSON();
    return safeUser;
  }

  /**
   * Soft-delete (deactivate) a user.
   *
   * @param {number} id
   * @returns {Promise<true>}
   */
  static async deactivate(id) {
    const user = await User.findByPk(id);
    if (!user) throw { status: 404, message: 'User not found' };
    await user.update({ is_active: false });
    return true;
  }

  /**
   * Hard-delete a user record.
   *
   * @param {number} id
   * @returns {Promise<true>}
   */
  static async delete(id) {
    const user = await User.findByPk(id);
    if (!user) throw { status: 404, message: 'User not found' };
    await user.destroy();
    return true;
  }
}
