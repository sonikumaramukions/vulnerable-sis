const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// VULNERABILITY: CORS misconfiguration - allows all origins
app.use(cors({
  origin: '*',
  credentials: true
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
// Serve static files - configured for Azure deployment
// Frontend files (HTML, CSS, JS, images including logo.png)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Serve images directly (for logo and other assets)
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// Uploads directory for user-uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// VULNERABILITY: Insecure database connection (credentials in code)
// Supports both local development and Azure deployment via environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'student_portal',
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Make db available to route modules
global.db = db;

// Import routes AFTER database connection is established
const noticesRouter = require('./routes/notices');
const announcementsRouter = require('./routes/announcements');
const documentsRouter = require('./routes/documents');
const studentsRouter = require('./routes/students');
const authRouter = require('./routes/auth');

// VULNERABILITY: File upload without proper validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // VULNERABILITY: No sanitization of filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  // VULNERABILITY: No file type restrictions
  limits: { fileSize: 100000000 } // 100MB limit
});

// VULNERABILITY: SQL Injection in login
app.post('/api/login', (req, res) => {
  const { loginId, password, userType } = req.body;
  
  // VULNERABILITY: Direct string concatenation - SQL Injection
  const query = `SELECT * FROM users WHERE login_id = '${loginId}' AND password = '${password}' AND user_type = '${userType}'`;
  
  console.log('Executing query:', query); // VULNERABILITY: Logging sensitive data
  
  db.query(query, (err, results) => {
    if (err) {
      // VULNERABILITY: Exposing database errors
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length > 0) {
      const user = results[0];
      // VULNERABILITY: Insecure session management
      res.cookie('sessionId', user.id, { httpOnly: false });
      res.cookie('userName', user.name, { httpOnly: false });
      res.cookie('userType', user.user_type, { httpOnly: false });
      
      res.json({ 
        success: true, 
        user: user,
        message: 'Login successful' 
      });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// VULNERABILITY: No authentication check on sensitive endpoint
app.get('/api/users', (req, res) => {
  const query = 'SELECT * FROM users';
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// VULNERABILITY: SQL Injection in search
app.get('/api/search', (req, res) => {
  const searchTerm = req.query.q;
  
  // VULNERABILITY: Unsanitized input in SQL query
  const query = `SELECT * FROM announcements WHERE title LIKE '%${searchTerm}%' OR content LIKE '%${searchTerm}%'`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// VULNERABILITY: XSS - No output encoding
app.get('/api/announcements', (req, res) => {
  const query = 'SELECT * FROM announcements ORDER BY date DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // VULNERABILITY: Returning raw data without sanitization
    res.json(results);
  });
});

// VULNERABILITY: Insecure Direct Object Reference (IDOR)
app.get('/api/student/:id', (req, res) => {
  const studentId = req.params.id;
  
  // VULNERABILITY: No authorization check
  const query = `SELECT * FROM students WHERE id = ${studentId}`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results[0]);
  });
});

// VULNERABILITY: Directory Traversal in file download
app.get('/api/download', (req, res) => {
  const filename = req.query.file;
  
  // VULNERABILITY: No path validation
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // VULNERABILITY: Exposing file system structure
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found: ' + filePath });
  }
});

// VULNERABILITY: Command Injection
app.post('/api/ping', (req, res) => {
  const { exec } = require('child_process');
  const host = req.body.host;
  
  // VULNERABILITY: Executing user input without validation
  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    if (error) {
      return res.json({ error: error.message, output: stderr });
    }
    res.json({ output: stdout });
  });
});

// VULNERABILITY: Unrestricted file upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // VULNERABILITY: No file type validation, no virus scanning
  res.json({ 
    success: true, 
    filename: req.file.filename,
    path: '/uploads/' + req.file.filename
  });
});

// VULNERABILITY: XSS in comment/feedback
app.post('/api/feedback', (req, res) => {
  const { studentId, comment } = req.body;
  
  // VULNERABILITY: Storing unsanitized user input
  const query = `INSERT INTO feedback (student_id, comment, date) VALUES (${studentId}, '${comment}', NOW())`;
  
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Feedback submitted' });
  });
});

// VULNERABILITY: Information disclosure
app.get('/api/debug', (req, res) => {
  res.json({
    environment: process.env,
    database: {
      host: 'localhost',
      user: 'root',
      password: 'password123'
    },
    serverInfo: {
      platform: process.platform,
      version: process.version,
      uptime: process.uptime()
    }
  });
});

// VULNERABILITY: Authentication bypass via parameter manipulation
app.get('/api/admin', (req, res) => {
  const isAdmin = req.query.admin;
  
  // VULNERABILITY: Trusting client-side parameter
  if (isAdmin === 'true') {
    const query = 'SELECT * FROM admin_panel';
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});

// VULNERABILITY: XML External Entity (XXE)
app.post('/api/xml', (req, res) => {
  const xml2js = require('xml2js');
  const parser = new xml2js.Parser({
    // VULNERABILITY: XXE enabled
    explicitChildren: true,
    preserveChildrenOrder: true
  });
  
  parser.parseString(req.body.xml, (err, result) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(result);
  });
});

// VULNERABILITY: Mass assignment
app.post('/api/update-profile', (req, res) => {
  const updates = req.body;
  const userId = req.cookies.sessionId;
  
  // VULNERABILITY: Allowing all fields to be updated
  const fields = Object.keys(updates).map(key => `${key} = '${updates[key]}'`).join(', ');
  const query = `UPDATE users SET ${fields} WHERE id = ${userId}`;
  
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Profile updated' });
  });
});

// VULNERABILITY: Weak password reset
app.post('/api/reset-password', (req, res) => {
  const { email } = req.body;
  
  // VULNERABILITY: Predictable reset token
  const resetToken = Math.floor(Math.random() * 10000);
  
  const query = `UPDATE users SET reset_token = '${resetToken}' WHERE email = '${email}'`;
  
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // VULNERABILITY: Exposing reset token
    res.json({ 
      success: true, 
      resetToken: resetToken,
      message: 'Reset token generated' 
    });
  });
});

// VULNERABILITY: Open redirect
app.get('/redirect', (req, res) => {
  const url = req.query.url;
  // VULNERABILITY: No validation of redirect URL
  res.redirect(url);
});

// VULNERABILITY: Server-Side Request Forgery (SSRF)
app.post('/api/fetch-url', (req, res) => {
  const https = require('https');
  const url = req.body.url;
  
  // VULNERABILITY: Fetching arbitrary URLs
  https.get(url, (response) => {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      res.json({ content: data });
    });
  }).on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

// Mount route modules
app.use('/api', noticesRouter);
app.use('/api', announcementsRouter);
app.use('/api', documentsRouter);
app.use('/api', studentsRouter);
app.use('/api', authRouter);

app.listen(PORT, () => {
  console.log(`TRIPATHI GROUP OF INSTITUTIONS SIS server running on http://localhost:${PORT}`);
  console.log('WARNING: This application is intentionally vulnerable!');
  console.log('Do not deploy in production or expose to the internet!');
});
