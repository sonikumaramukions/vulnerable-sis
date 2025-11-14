// app.js
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
// Priority order:
// 1) If FRONTEND_PATH env var is set, use it directly.
// 2) Otherwise, prefer a build folder (frontend/build) if present.
// 3) fallback to ./frontend in repo root (so your static HTML files can live there).
const envFrontendPath = process.env.FRONTEND_PATH;
let frontendPath;

if (envFrontendPath && fs.existsSync(envFrontendPath)) {
  frontendPath = envFrontendPath;
} else {
  const candidateBuild = path.join(__dirname, '..', 'frontend', 'build');
  const candidatePlain = path.join(__dirname, '..', 'frontend');
  // If app packaged with backend in same folder, try local frontend folders too:
  const localBuild = path.join(__dirname, 'frontend', 'build');
  const localPlain = path.join(__dirname, 'frontend');

  if (fs.existsSync(candidateBuild)) {
    frontendPath = candidateBuild;
  } else if (fs.existsSync(candidatePlain)) {
    frontendPath = candidatePlain;
  } else if (fs.existsSync(localBuild)) {
    frontendPath = localBuild;
  } else if (fs.existsSync(localPlain)) {
    frontendPath = localPlain;
  } else {
    // As a last resort use /home/site/wwwroot/frontend (when running in Azure and you created that folder manually)
    const azurePath = '/home/site/wwwroot/frontend';
    frontendPath = fs.existsSync(azurePath) ? azurePath : null;
  }
}

if (frontendPath) {
  console.log('Serving frontend from:', frontendPath);
  app.use(express.static(frontendPath));
  // optional images folder
  if (fs.existsSync(path.join(frontendPath, 'images'))) {
    app.use('/images', express.static(path.join(frontendPath, 'images')));
  }
} else {
  console.warn('No frontend folder found. Static file serving disabled.');
}

// ---------- CREATE UPLOADS FOLDER ----------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}
app.use('/uploads', express.static(uploadDir));

// ---------- DATABASE CONNECTION ----------
const dbConfig = NODE_ENV === 'production' ? dbConfigs.production : dbConfigs.development;
if (typeof dbConfig.multipleStatements === 'undefined') dbConfig.multipleStatements = false;

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    // don't crash the process; app can still serve static pages and show a friendly message
  } else {
    console.log('Connected to MySQL');
  }
});

global.db = db;

// ---------- FILE UPLOAD (safer) ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // sanitize filename and prefix timestamp to avoid collisions
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const finalName = `${Date.now()}-${safeName}`;
    cb(null, finalName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || '100000000', 10) } // default ~100MB
});

// ---------- ROUTES ----------

// Simple health check
app.get('/healthz', (req, res) => res.status(200).json({ ok: true, env: NODE_ENV }));

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

// Mount other routers (these files should exist and use parameterized queries)
try {
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
} catch (err) {
  console.warn('Some routers are missing or errored while loading. If you rely on /api routes, ensure routes/* files exist.', err.message);
}

// FILE UPLOAD endpoint
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

// SPA fallback: if we have an index.html in frontendPath, serve it for any non-API route
app.get('*', (req, res, next) => {
  // skip API paths
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/images') || req.path === '/healthz') {
    return next();
  }
  if (!frontendPath) return res.status(404).send('Not Found');
  const indexHtml = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  // Some apps use index.htm or login.html — try login.html as startup page if index.html missing
  const loginHtml = path.join(frontendPath, 'login.html');
  if (fs.existsSync(loginHtml)) return res.sendFile(loginHtml);
  next();
});

// START SERVER
app.listen(PORT, () => {
  console.log(`App running on port ${PORT} (NODE_ENV=${NODE_ENV})`);
});
