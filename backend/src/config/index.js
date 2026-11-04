import dotenv from 'dotenv';
dotenv.config();

export default {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'velo-iwo-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  db: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || './storage/velo_iwo.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  storage: {
    private: process.env.STORAGE_PATH || './storage/private',
    public: process.env.PUBLIC_STORAGE_PATH || './storage/public',
  },
};
