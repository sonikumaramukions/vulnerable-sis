const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Get database connection from global scope
const db = global.db;

// VULNERABILITY: Unrestricted file upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // VULNERABILITY: Can specify upload directory via parameter
        const uploadDir = req.query.dir || 'uploads/';
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // VULNERABILITY: No filename sanitization
        const filename = req.body.filename || file.originalname;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    // VULNERABILITY: No file type restrictions
    // VULNERABILITY: Large file size allowed
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// VULNERABILITY: Arbitrary file upload
router.post('/upload', upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // VULNERABILITY: Storing file metadata without validation
    const query = `INSERT INTO documents (filename, filepath, uploaded_by) VALUES ('${req.file.filename}', '${req.file.path}', ${req.body.userId || 0})`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            success: true,
            fileId: result.insertId,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size
        });
    });
});

// VULNERABILITY: Path traversal in file download
router.get('/download', (req, res) => {
    const filename = req.query.file;
    const directory = req.query.dir || 'uploads';
    
    // VULNERABILITY: No path validation - allows directory traversal
    const filePath = path.join(directory, filename);
    
    console.log('Downloading file:', filePath); // VULNERABILITY: Info disclosure
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
            }
        });
    } else {
        res.status(404).json({ 
            error: 'File not found',
            attemptedPath: filePath // VULNERABILITY: Path disclosure
        });
    }
});

// VULNERABILITY: Arbitrary file read
router.get('/read', (req, res) => {
    const filename = req.query.file;
    
    // VULNERABILITY: Reading arbitrary files
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ 
                error: err.message,
                path: filename
            });
        }
        
        res.json({ content: data });
    });
});

// VULNERABILITY: Directory listing
router.get('/list', (req, res) => {
    const directory = req.query.dir || 'uploads';
    
    // VULNERABILITY: Listing arbitrary directories
    fs.readdir(directory, (err, files) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const fileDetails = files.map(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            
            return {
                name: file,
                size: stats.size,
                path: filePath,
                isDirectory: stats.isDirectory()
            };
        });
        
        res.json(fileDetails);
    });
});

// VULNERABILITY: Arbitrary file deletion
router.delete('/delete', (req, res) => {
    const filename = req.query.file;
    const directory = req.query.dir || 'uploads';
    
    // VULNERABILITY: No authorization check
    const filePath = path.join(directory, filename);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: 'File deleted', path: filePath });
    });
});

// VULNERABILITY: File inclusion vulnerability
router.get('/include', (req, res) => {
    const template = req.query.template;
    
    // VULNERABILITY: Local File Inclusion (LFI)
    try {
        const content = fs.readFileSync(template, 'utf8');
        res.send(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// VULNERABILITY: Zip slip vulnerability
router.post('/extract', upload.single('zipfile'), (req, res) => {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(req.file.path);
    const extractPath = req.body.extractTo || 'uploads/extracted/';
    
    // VULNERABILITY: No path validation during extraction
    zip.extractAllTo(extractPath, true);
    
    res.json({ 
        success: true, 
        message: 'Files extracted',
        location: extractPath
    });
});

module.exports = router;
