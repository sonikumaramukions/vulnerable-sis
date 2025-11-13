const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow all origins (INTENTIONALLY VULNERABLE)
app.use(cors({ origin: "*", credentials: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// ---------- FRONTEND SERVING (Azure Fix) ----------
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Serve images (logo, icons)
app.use("/images", express.static(path.join(frontendPath, "images")));

// ---------- CREATE UPLOADS FOLDER (Azure Fix) ----------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ---------- DATABASE CONNECTION (Azure Fix) ----------
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password123",
  database: process.env.DB_NAME || "student_portal",
  port: process.env.DB_PORT || 3306,
  multipleStatements: true // keep vulnerable
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL");
});

global.db = db;

// ---------- FILE UPLOAD (vulnerable on purpose) ----------
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname); // vulnerable
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100000000 }
});

// ---------- ROUTES (INTENTIONALLY VULNERABLE) ----------

// SQL INJECTION LOGIN
app.post("/api/login", (req, res) => {
  const { loginId, password, userType } = req.body;
  const q = `SELECT * FROM users WHERE login_id='${loginId}' AND password='${password}' AND user_type='${userType}'`;

  db.query(q, (err, rows) => {
    if (err) return res.json({ error: err.message });

    if (rows.length > 0) {
      const user = rows[0];
      res.cookie("sessionId", user.id);
      res.cookie("userType", user.user_type);
      res.json({ success: true, user });
    } else {
      res.json({ success: false });
    }
  });
});

// ALL OTHER VULNERABLE ENDPOINTS
const noticesRouter = require("./routes/notices");
const announcementsRouter = require("./routes/announcements");
const documentsRouter = require("./routes/documents");
const studentsRouter = require("./routes/students");
const authRouter = require("./routes/auth");

app.use("/api", noticesRouter);
app.use("/api", announcementsRouter);
app.use("/api", documentsRouter);
app.use("/api", studentsRouter);
app.use("/api", authRouter);

// FILE UPLOAD
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ success: true, file: req.file.filename });
});

// DEBUG ENDPOINT (intentional vulnerability)
app.get("/api/debug", (req, res) => {
  res.json({
    env: process.env,
    cwd: process.cwd(),
    pid: process.pid
  });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`Vulnerable SIS running on port ${PORT}`);
});
