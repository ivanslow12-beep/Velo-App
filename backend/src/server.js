import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import config from './config/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import sequelize from './database/sequelize.js';
import { ensureIwoColumns } from './database/iwoSchema.js';

// Import routes
import authRoutes from './routes/v1/auth.js';
import userRoutes from './routes/v1/users.js';
import iwoRoutes from './routes/v1/iwo.js';
import bastRoutes from './routes/v1/bast.js';
import accRoutes from './routes/v1/acc.js';
import customerRoutes from './routes/v1/customers.js';
import serviceRoutes from './routes/v1/services.js';
import documentTemplateRoutes from './routes/v1/documentTemplates.js';
import emailConnectionRoutes from './routes/v1/emailConnections.js';
import attachmentRoutes from './routes/v1/attachments.js';
import auditLogRoutes from './routes/v1/auditLogs.js';
import notificationRoutes from './routes/v1/notifications.js';
import reportRoutes from './routes/v1/reports.js';
import dashboardRoutes from './routes/v1/dashboard.js';
import { startEmailSyncScheduler } from './services/emailSyncScheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Create storage directories
const storageDirs = ['./storage/private', './storage/public', './storage/temp'];
storageDirs.forEach(dir => {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static public files
app.use('/public', express.static(path.resolve(process.cwd(), './storage/public')));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/iwo', iwoRoutes);
app.use('/api/v1/bast', bastRoutes);
app.use('/api/v1/acc', accRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/document-templates', documentTemplateRoutes);
app.use('/api/v1/email-connections', emailConnectionRoutes);
app.use('/api/v1/attachments', attachmentRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404
app.use(notFound);

// Error handler
app.use(errorHandler);

// Initialize tables and keep older databases compatible before accepting requests.
const startServer = async () => {
  await sequelize.sync();
  await ensureIwoColumns(sequelize);

  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`🚀 VELO IWO API running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${config.env}`);
    startEmailSyncScheduler();
  });
};

startServer().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exitCode = 1;
});

export default app;
