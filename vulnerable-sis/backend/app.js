require('dotenv').config(); // loads .env in development; in production rely on App Settings
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const dbConfigs = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---------- CORS ----------
const corsOptions = {
  origin: process.env.CORS_ORIGIN || dbConfigs.cors.origin || '*',
  credentials: (process.env.CORS_CREDENTIALS === 'true') || dbConfigs.cors.credentials || true
};
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// ---------- FRONTEND SERVING (Azure friendly) ----------
const frontendBuildPath = process.env.FRONTEND_PATH || path.join(__dirname, '..', 'frontend', 'build');
const frontendPath = fs.existsSync(frontendBuildPath) ? frontendBuildPath : path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
if (fs.existsSync(path.join(frontendPath, 'images'))) {
  app.use('/images', express.static(path.join(frontendPath, 'images')));
}

// ---------- CREATE UPLOADS FOLDER ----------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ---------- DATABASE CONNECTION ----------
const dbConfig = NODE_ENV === 'production' ? dbConfigs.production : dbConfigs.development;
if (typeof dbConfig.multipleStatements === 'undefined') dbConfig.multipleStatements = false;

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL');
});

global.db = db;

// ---------- FILE UPLOAD (safer) ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const finalName = `${Date.now()}-${safeName}`;
    cb(null, finalName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || '100000000', 10) }
});

// ---------- ROUTES ----------

// SQL-INJECTION SAFE LOGIN (parameterized)
app.post('/api/login', (req, res) => {
  const { loginId, password, userType } = req.body;
  if (!loginId || !password || !userType) return res.status(400).json({ success: false, error: 'Missing credentials' });

  const q = 'SELECT * FROM users WHERE login_id = ? AND password = ? AND user_type = ? LIMIT 1';
  db.query(q, [loginId, password, userType], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (rows && rows.length > 0) {
      const user = rows[0];
      const cookieOptions = {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'lax'
      };
      res.cookie('sessionId', user.id, cookieOptions);
      res.cookie('userType', user.user_type, { secure: NODE_ENV === 'production' });
      res.json({ success: true, user });
    } else {
      res.json({ success: false });
    }
  });
});

// Mount other routers (ensure these routers use parameterized queries)
const noticesRouter = require('./routes/notices');
const announcementsRouter = require('./routes/announcements');
const documentsRouter = require('./routes/documents');
const studentsRouter = require('./routes/students');
const authRouter = require('./routes/auth');

app.use('/api', noticesRouter);
app.use('/api', announcementsRouter);
app.use('/api', documentsRouter);
app.use('/api', studentsRouter);
app.use('/api', authRouter);

// FILE UPLOAD
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  res.json({ success: true, file: req.file.filename, url: `/uploads/${req.file.filename}` });
});

// DEBUG ENDPOINT (ONLY when ENABLE_DEBUG=true)
if (process.env.ENABLE_DEBUG === 'true') {
  app.get('/api/debug', (req, res) => {
    const safeEnv = { ...process.env };
    ['DB_PASSWORD', 'JWT_SECRET', 'ADMIN_PASSWORD', 'AZURE_PUBLISH_PROFILE', 'AZURE_CLIENT_SECRET'].forEach((k) => {
      if (safeEnv[k]) safeEnv[k] = '[REDACTED]';
    });
    res.json({
      env: safeEnv,
      cwd: process.cwd(),
      pid: process.pid
    });
  });
}

// SPA fallback to index.html if present
app.get('*', (req, res, next) => {
  const indexHtml = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  next();
});

// START SERVER
app.listen(PORT, () => {
  console.log(`App running on port ${PORT} (NODE_ENV=${NODE_ENV})`);
});
