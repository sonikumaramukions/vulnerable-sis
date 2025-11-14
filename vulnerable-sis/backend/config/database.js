// database.js
module.exports = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'student_portal',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: process.env.DB_MULTISTMT === 'true' || false
  },

  production: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: process.env.DB_MULTISTMT === 'true' || false
  },

  secrets: {
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
    adminPassword: process.env.ADMIN_PASSWORD || 'dev_admin_pass',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev_encryption_key'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: (process.env.CORS_CREDENTIALS === 'true') || true
  }
};
