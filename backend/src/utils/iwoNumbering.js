/**
 * Generates an IWO number in the format:
 *   XXXXXX/VELO/IWO/[RomanMonth]/[YY]
 *
 * The sequence is 1-based and scoped to the current calendar month.
 *
 * @param {import('sequelize').Model} IWO - The Sequelize IWO model class
 * @returns {Promise<string>} Generated IWO number
 */

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const generateIwoNumber = async (IWO) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ROMAN_MONTHS[now.getMonth()];

  // Count existing IWOs this month
  const { Op } = await import('sequelize');
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await IWO.count({
    where: {
      created_at: { [Op.between]: [startOfMonth, endOfMonth] },
    },
  });

  const sequence = String(count + 1).padStart(6, '0');
  return `${sequence}/VELO/IWO/${month}/${year}`;
};
