import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { logAudit } from '../../utils/auditLogger.js';
import { IWO, Customer, Service, User, IwoMilestone, NetworkInfo, Device, SlaInfo, BAST, ACC } from '../../models/index.js';
import { IwoService } from '../../services/IwoService.js';
import { Op } from 'sequelize';
import XLSX from 'xlsx';
import multer from 'multer';

const router = Router();
router.use(authenticate);

const MAX_IMPORT_ROWS = 500;
const IWO_IMPORT_FIELDS = new Set([
  'iwo_no', 'request_date', 'request_type', 'priority',
  'customer_name_manual', 'customer_contact_person', 'customer_phone',
  'customer_email', 'customer_address_manual', 'service_name_manual',
  'service_price', 'sales_name_manual', 'industry_sales', 'pic_project', 'partner_1',
  'partner_2', 'pop_or_standalone', 'deadline_rfs', 'sla_days', 'notes',
]);
const REQUIRED_IMPORT_FIELDS = ['request_type', 'customer_name_manual', 'service_name_manual'];
const REQUEST_TYPES = ['NEW_INSTALLATION', 'RELOCATION', 'UPGRADE', 'DOWNGRADE', 'TERMINATION', 'MAINTENANCE'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const iwoImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx'].includes(extension)) {
      return callback(new Error('Format file harus CSV atau Excel (.xlsx).'));
    }
    return callback(null, true);
  },
}).single('file');

const IWO_INCLUDES = [
  { model: Customer, as: 'customer', attributes: ['id', 'name', 'code', 'address', 'contact_name', 'email', 'phone'] },
  { model: Service, as: 'service', attributes: ['id', 'name', 'price', 'description'] },
  { model: User, as: 'sales', attributes: ['id', 'name', 'email', 'phone'] },
  { model: User, as: 'engineer', attributes: ['id', 'name', 'email', 'phone'] },
  { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
  { model: IwoMilestone, as: 'milestones', separate: true, order: [['order', 'ASC']] },
  { model: NetworkInfo, as: 'networkInfo' },
  { model: SlaInfo, as: 'slaInfo' },
  { model: Device, as: 'devices' },
  { model: BAST, as: 'bast' },
  { model: ACC, as: 'acc' },
];

function buildIwoWhere(query, user) {
  const conditions = [];

  if (query.search) {
    conditions.push({
      [Op.or]: [
        { iwo_no: { [Op.like]: `%${query.search}%` } },
        { customer_name_manual: { [Op.like]: `%${query.search}%` } },
        { service_name_manual: { [Op.like]: `%${query.search}%` } },
        { pic_project: { [Op.like]: `%${query.search}%` } },
        { partner_1: { [Op.like]: `%${query.search}%` } },
        { partner_2: { [Op.like]: `%${query.search}%` } },
        { sales_name_manual: { [Op.like]: `%${query.search}%` } },
        { notes: { [Op.like]: `%${query.search}%` } },
      ],
    });
  }
  if (query.status) conditions.push({ status: query.status });
  if (query.priority) conditions.push({ priority: query.priority });
  if (query.is_overdue === 'true') conditions.push({ is_overdue: true });
  if (query.customer_id) conditions.push({ customer_id: query.customer_id });
  if (query.sales_id) conditions.push({ sales_id: query.sales_id });
  if (query.engineer_id) conditions.push({ engineer_id: query.engineer_id });

  if (query.archived === 'true') {
    conditions.push({ is_archived: true });
  } else if (query.archived === 'false' || (!query.archived && query.status !== 'ARCHIVED')) {
    conditions.push({ is_archived: false });
  }

  if (user.role === ROLES.SALES) {
    conditions.push({ [Op.or]: [{ sales_id: user.id }, { created_by: user.id }] });
  } else if (user.role === ROLES.ENGINEER) {
    conditions.push({ engineer_id: user.id });
  }

  return conditions.length ? { [Op.and]: conditions } : {};
}

function toExportRow(iwo) {
  const row = iwo.toJSON();
  return {
    iwo_no: row.iwo_no,
    request_date: row.request_date,
    request_type: row.request_type,
    priority: row.priority,
    status: row.status,
    progress: row.progress,
    customer_name_manual: row.customer_name_manual || row.customer?.name || '',
    customer_contact_person: row.customer_contact_person || row.customer?.contact_name || '',
    customer_phone: row.customer_phone || row.customer?.phone || '',
    customer_email: row.customer_email || row.customer?.email || '',
    customer_address_manual: row.customer_address_manual || row.customer?.address || '',
    service_name_manual: row.service_name_manual || row.service?.name || '',
    service_price: row.service_price ?? row.service?.price ?? '',
    sales_name_manual: row.sales_name_manual || row.sales?.name || '',
    industry_sales: row.industry_sales,
    pic_project: row.pic_project,
    partner_1: row.partner_1,
    partner_2: row.partner_2,
    pop_or_standalone: row.pop_or_standalone,
    deadline_rfs: row.deadline_rfs,
    sla_days: row.sla_days,
    notes: row.notes,
    is_archived: row.is_archived,
  }
}

function createCsv(rows) {
  const columns = Object.keys(rows[0] || {
    iwo_no: '', request_date: '', request_type: '', priority: '', status: '', progress: '',
    customer_name_manual: '', customer_contact_person: '', customer_phone: '', customer_email: '',
    customer_address_manual: '', service_name_manual: '', service_price: '', sales_name_manual: '', industry_sales: '',
    pic_project: '', partner_1: '', partner_2: '', pop_or_standalone: '', deadline_rfs: '',
    sla_days: '', notes: '', is_archived: '',
  })
  const escapeCell = (value) => {
    let text = value == null ? '' : String(value)
    if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  return `\uFEFF${[columns, ...rows.map((row) => columns.map((column) => row[column]))]
    .map((line) => line.map(escapeCell).join(','))
    .join('\r\n')}`
}

function parseIwoImport(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('File tidak memiliki sheet atau data.');

  const worksheet = workbook.Sheets[sheetName];
  const [headerRow, ...dataRows] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });
  if (!headerRow?.length) throw new Error('Baris header tidak ditemukan.');

  const headers = headerRow.map((header) => String(header).replace(/^\uFEFF/, '').trim().toLowerCase());
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeaders.length) throw new Error(`Kolom duplikat: ${[...new Set(duplicateHeaders)].join(', ')}.`);

  const unknownHeaders = headers.filter((header) => header && !IWO_IMPORT_FIELDS.has(header));
  if (unknownHeaders.length) throw new Error(`Kolom tidak dikenal: ${unknownHeaders.join(', ')}. Gunakan template CSV.`);

  const missingHeaders = REQUIRED_IMPORT_FIELDS.filter((field) => !headers.includes(field));
  if (missingHeaders.length) throw new Error(`Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}.`);

  const rows = dataRows
    .map((cells, index) => ({
      rowNumber: index + 2,
      data: Object.fromEntries(headers.map((header, column) => [
        header,
        cells[column] == null ? '' : String(cells[column]).trim(),
      ]).filter(([header]) => header)),
    }))
    .filter(({ data }) => Object.values(data).some(Boolean));

  if (!rows.length) throw new Error('File tidak berisi baris data.');
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Maksimal ${MAX_IMPORT_ROWS} baris data per impor.`);
  return rows;
}

function validateIwoImportRow(data) {
  const errors = [];
  for (const field of REQUIRED_IMPORT_FIELDS) {
    if (!data[field]) errors.push(`${field} wajib diisi`);
  }
  if (data.request_type && !REQUEST_TYPES.includes(data.request_type.toUpperCase())) {
    errors.push(`request_type harus salah satu: ${REQUEST_TYPES.join(', ')}`);
  }
  if (data.priority && !PRIORITIES.includes(data.priority.toUpperCase())) {
    errors.push(`priority harus salah satu: ${PRIORITIES.join(', ')}`);
  }
  for (const field of ['request_date', 'deadline_rfs']) {
    if (data[field] && !isValidImportDate(data[field])) {
      errors.push(`${field} harus menggunakan format YYYY-MM-DD`);
    }
  }
  if (data.sla_days && (!/^\d+$/.test(data.sla_days) || Number(data.sla_days) < 1)) {
    errors.push('sla_days harus berupa bilangan bulat positif');
  }
  if (data.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email)) {
    errors.push('customer_email tidak valid');
  }
  if (data.service_price && !/^\d+(?:\.\d{1,2})?$/.test(data.service_price)) {
    errors.push('service_price harus berupa angka non-negatif dengan maksimal 2 angka desimal');
  }
  if (data.service_price && Number(data.service_price) > 9999999999999.99) {
    errors.push('service_price berada di luar batas yang diizinkan');
  }
  return errors;
}

function isValidImportDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// GET /api/v1/iwo
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const { count, rows } = await IWO.findAndCountAll({
      where: buildIwoWhere(req.query, req.user),
      limit,
      offset,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'code', 'phone', 'email', 'contact_name'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price'] },
        { model: User, as: 'sales', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'engineer', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// POST /api/v1/iwo/import
router.post(
  '/import',
  authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES),
  (req, res, next) => {
    iwoImportUpload(req, res, (uploadError) => {
      if (!uploadError) return next();
      const message = uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran file maksimal 5 MB.'
        : uploadError.message;
      return error(res, message, 400);
    });
  },
  async (req, res, next) => {
    if (!req.file) return error(res, 'Pilih file CSV atau Excel (.xlsx) untuk diimpor.', 400);

    let rows;
    try {
      rows = parseIwoImport(req.file.buffer);
    } catch (parseError) {
      return error(res, `File tidak dapat diproses: ${parseError.message}`, 400);
    }

    const seenIwoNumbers = new Set();
    const rowErrors = [];
    let created = 0;

    for (const { rowNumber, data } of rows) {
      const validationErrors = validateIwoImportRow(data);
      const iwoNumber = data.iwo_no?.trim();
      if (iwoNumber && seenIwoNumbers.has(iwoNumber)) {
        validationErrors.push(`Nomor IWO "${iwoNumber}" duplikat di dalam file`);
      }
      if (iwoNumber) seenIwoNumbers.add(iwoNumber);

      if (validationErrors.length) {
        rowErrors.push({ row: rowNumber, message: validationErrors.join('; ') });
        continue;
      }

      data.request_type = data.request_type.toUpperCase();
      data.priority = (data.priority || 'NORMAL').toUpperCase();
      if (data.sla_days) data.sla_days = Number(data.sla_days);

      try {
        await IwoService.create(data, req.user.id);
        created += 1;
      } catch (createError) {
        rowErrors.push({
          row: rowNumber,
          message: createError.status === 400 ? createError.message : 'Gagal menyimpan data IWO.',
        });
        if (!createError.status) console.error(`IWO import failed at row ${rowNumber}:`, createError);
      }
    }

    const result = { total: rows.length, created, failed: rowErrors.length, errors: rowErrors };
    return success(res, result, `${created} IWO berhasil diimpor${rowErrors.length ? `, ${rowErrors.length} baris gagal` : ''}.`);
  },
);

// GET /api/v1/iwo/export
router.get('/export', async (req, res, next) => {
  try {
    const format = req.query.format || 'csv';
    if (!['csv', 'xlsx'].includes(format)) return error(res, 'Format ekspor harus csv atau xlsx', 400);

    const iwos = await IWO.findAll({
      where: buildIwoWhere(req.query, req.user),
      include: [
        { model: Customer, as: 'customer', attributes: ['name', 'phone', 'email', 'contact_name', 'address'] },
        { model: Service, as: 'service', attributes: ['name'] },
        { model: User, as: 'sales', attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    const rows = iwos.map(toExportRow);
    const filename = `iwo-export-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'IWO');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(createCsv(rows));
  } catch (err) { next(err); }
});

// GET /api/v1/iwo/:id
router.get('/:id', async (req, res, next) => {
  try {
    const iwo = await IWO.findOne({
      where: { [Op.or]: [{ id: req.params.id }, { iwo_no: req.params.id }] },
      include: IWO_INCLUDES,
    });
    if (!iwo) return error(res, 'IWO not found', 404);
    return success(res, iwo);
  } catch (err) { next(err); }
});

// POST /api/v1/iwo
router.post('/', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES), async (req, res, next) => {
  try {
    const created = await IwoService.create(req.body, req.user.id);
    const full = await IWO.findByPk(created.id, { include: IWO_INCLUDES });
    return success(res, full, 'IWO created successfully', 201);
  } catch (err) { next(err); }
});

// PUT /api/v1/iwo/:id or PATCH /api/v1/iwo/:id (Edit IWO)
const handleUpdate = async (req, res, next) => {
  try {
    const updated = await IwoService.update(req.params.id, req.body, req.user.id);
    const full = await IWO.findByPk(updated.id, { include: IWO_INCLUDES });
    return success(res, full, 'IWO updated successfully');
  } catch (err) { next(err); }
};
router.put('/:id', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES), handleUpdate);
router.patch('/:id', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES), handleUpdate);

// PATCH /api/v1/iwo/:id/archive (Archive / Unarchive IWO)
router.patch('/:id/archive', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES), async (req, res, next) => {
  try {
    const archiveState = req.body.is_archived !== undefined ? req.body.is_archived : true;
    const iwo = await IwoService.toggleArchive(req.params.id, archiveState, req.user.id);
    return success(res, iwo, archiveState ? 'IWO berhasil diarsipkan' : 'IWO berhasil dipulihkan dari arsip');
  } catch (err) { next(err); }
});

// DELETE /api/v1/iwo/:id (Delete IWO)
router.delete('/:id', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT), async (req, res, next) => {
  try {
    const result = await IwoService.delete(req.params.id, req.user.id);
    return success(res, result, result.message);
  } catch (err) { next(err); }
});

// PATCH /api/v1/iwo/:id/status
router.patch('/:id/status', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.ENGINEER), async (req, res, next) => {
  try {
    const iwo = await IWO.findByPk(req.params.id);
    if (!iwo) return error(res, 'IWO not found', 404);

    const { status, notes } = req.body;
    const validStatuses = ['DRAFT', 'PENDING', 'IN_PROGRESS', 'ACTIVATION', 'BAST', 'ACC', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) return error(res, 'Invalid status', 400);

    const before = { status: iwo.status };
    await iwo.update({
      status,
      notes: notes !== undefined ? notes : iwo.notes,
      is_archived: status === 'ARCHIVED' ? true : iwo.is_archived,
      updated_by: req.user.id,
    });

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'IWO_STATUS_CHANGED', entityType: 'IWO', entityId: iwo.id,
      beforeData: before, afterData: { status }, ip: req.ip,
    });

    return success(res, { id: iwo.id, status });
  } catch (err) { next(err); }
});

// PATCH /api/v1/iwo/:id/milestones/:milestoneId
router.patch('/:id/milestones/:milestoneId', authenticate, async (req, res, next) => {
  try {
    const milestone = await IwoMilestone.findOne({
      where: { id: req.params.milestoneId, iwo_id: req.params.id },
    });
    if (!milestone) return error(res, 'Milestone not found', 404);

    const { status, due_date } = req.body;
    const updates = { status };
    if (due_date) updates.due_date = due_date;
    if (status === 'DONE') {
      updates.completed_at = new Date();
      updates.completed_by = req.user.id;
    }
    await milestone.update(updates);
    return success(res, milestone);
  } catch (err) { next(err); }
});

// PUT /api/v1/iwo/:id/network
router.put('/:id/network', authenticate, async (req, res, next) => {
  try {
    const iwo = await IWO.findByPk(req.params.id);
    if (!iwo) return error(res, 'IWO not found', 404);

    const [networkInfo, created] = await NetworkInfo.findOrCreate({
      where: { iwo_id: req.params.id },
      defaults: { iwo_id: req.params.id, ...req.body },
    });
    if (!created) await networkInfo.update(req.body);

    return success(res, networkInfo);
  } catch (err) { next(err); }
});

// PUT /api/v1/iwo/:id/sla
router.put('/:id/sla', authenticate, async (req, res, next) => {
  try {
    const [sla, created] = await SlaInfo.findOrCreate({
      where: { iwo_id: req.params.id },
      defaults: { iwo_id: req.params.id, ...req.body },
    });
    if (!created) await sla.update(req.body);
    return success(res, sla);
  } catch (err) { next(err); }
});

// POST /api/v1/iwo/:id/devices
router.post('/:id/devices', authenticate, async (req, res, next) => {
  try {
    const device = await Device.create({ iwo_id: req.params.id, ...req.body });
    return success(res, device, 'Device added', 201);
  } catch (err) { next(err); }
});

// DELETE /api/v1/iwo/:id/devices/:deviceId
router.delete('/:id/devices/:deviceId', authenticate, async (req, res, next) => {
  try {
    const device = await Device.findOne({ where: { id: req.params.deviceId, iwo_id: req.params.id } });
    if (!device) return error(res, 'Device not found', 404);
    await device.destroy();
    return success(res, null, 'Device removed');
  } catch (err) { next(err); }
});

export default router;
