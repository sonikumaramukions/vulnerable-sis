require('dotenv').config(); // load .env locally; App Settings in Azure override env vars
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
const PORT = parseInt(process.env.PORT || '3000', 10);
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
/*
  Strategy:
  - Prefer FRONTEND_PATH app setting (absolute path).
  - Fallback to ./frontend/build then ./frontend.
  - If the chosen path contains index.html we will serve it statically and fallback to index.html for SPA.
*/
const frontendPathFromEnv = process.env.FRONTEND_PATH;
let frontendCandidate = null;

if (frontendPathFromEnv && fs.existsSync(frontendPathFromEnv)) {
  frontendCandidate = frontendPathFromEnv;
} else {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  const simplePath = path.join(__dirname, '..', 'frontend');
  if (fs.existsSync(buildPath)) frontendCandidate = buildPath;
  else if (fs.existsSync(simplePath)) frontendCandidate = simplePath;
  else {
    // fallback to a safe internal "public" dir (create if missing)
    const internalPublic = path.join(__dirname, 'public');
    if (!fs.existsSync(internalPublic)) fs.mkdirSync(internalPublic, { recursive: true });
    frontendCandidate = internalPublic;
  }
}
const FRONTEND_PATH = frontendCandidate;
app.use(express.static(FRONTEND_PATH));
if (fs.existsSync(path.join(FRONTEND_PATH, 'images'))) {
  app.use('/images', express.static(path.join(FRONTEND_PATH, 'images')));
}

// ---------- CREATE UPLOADS FOLDER ----------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ---------- DATABASE CONNECTION ----------
const dbConfig = (NODE_ENV === 'production') ? dbConfigs.production : dbConfigs.development;
if (typeof dbConfig.multipleStatements === 'undefined') dbConfig.multipleStatements = false;

let db;
try {
  db = mysql.createConnection(dbConfig);
} catch (err) {
  console.error('MySQL createConnection failed:', err);
}

// Non-blocking connect (we log). App still runs even if DB not reachable.
if (db) {
  db.connect((err) => {
    if (err) {
      console.error('Database connection failed:', err && err.message ? err.message : err);
    } else {
      console.log('Connected to MySQL');
    }
  });
  global.db = db;
}

// ---------- FILE UPLOAD ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // sanitize filename and prefix with timestamp
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
  if (!global.db) return res.status(500).json({ error: 'Database not configured' });

  global.db.query(q, [loginId, password, userType], (err, rows) => {
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

// mount routers only if files exist (defensive)
const routerFiles = ['notices', 'announcements', 'documents', 'students', 'auth'];
routerFiles.forEach((r) => {
  const p = path.join(__dirname, 'routes', r + '.js');
  if (fs.existsSync(p)) {
    app.use('/api', require(p));
  }
});

// file upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  res.json({ success: true, file: req.file.filename, url: `/uploads/${req.file.filename}` });
});

// debug endpoint only when allowed
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

// SPA fallback -> index.html if present
app.get('*', (req, res, next) => {
  const indexHtml = path.join(FRONTEND_PATH, 'index.html');
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  // If no index, show a tiny informative HTML so Azure returns 200 instead of 503
  if (req.path === '/' || req.path === '') {
    return res.send(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>App</title></head>
      <body>
        <h2>App is running</h2>
        <p>No frontend/index.html found at ${FRONTEND_PATH} — please add your frontend files to that directory.</p>
      </body></html>
    `);
  }
  next();
});

// START SERVER
app.listen(PORT, () => {
  console.log(`App running on port ${PORT} (NODE_ENV=${NODE_ENV})`);
});
