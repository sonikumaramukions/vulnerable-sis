const express = require('express');
const router = express.Router();

// Get database connection from global scope
const db = global.db;

// VULNERABILITY: No authentication required for notices
router.get('/notices', (req, res) => {
    const userId = req.cookies.sessionId || 0;
    
    // VULNERABILITY: SQL Injection - no parameterized queries
    // Get notices with viewed status
    const query = `SELECT n.*, 
                   CASE WHEN nv.user_id IS NOT NULL THEN 1 ELSE 0 END as viewed
                   FROM notices n
                   LEFT JOIN notice_views nv ON n.id = nv.notice_id AND nv.user_id = ${userId}
                   ORDER BY n.date DESC, n.id DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            // VULNERABILITY: Exposing database errors
            return res.status(500).json({ error: err.message, query: query });
        }
        
        // VULNERABILITY: Returning all data without filtering
        res.json(results);
    });
});

// VULNERABILITY: IDOR - can access any notice
router.get('/notices/:id', (req, res) => {
    const noticeId = req.params.id;
    
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM notices WHERE id = ${noticeId}`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Notice not found' });
        }
    });
});

// VULNERABILITY: No authorization check - anyone can mark notices as viewed
router.post('/notices/:id/view', (req, res) => {
    const noticeId = req.params.id;
    const userId = req.cookies.sessionId || 0;
    
    // VULNERABILITY: SQL Injection + storing user input without validation
    const query = `INSERT INTO notice_views (notice_id, user_id, viewed_at) 
                   VALUES (${noticeId}, ${userId}, NOW()) 
                   ON DUPLICATE KEY UPDATE viewed_at = NOW()`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: 'Notice marked as viewed' });
    });
});

// VULNERABILITY: Stored XSS - creating notices with unsanitized content
router.post('/notices', (req, res) => {
    const { title, content, date } = req.body;
    const postedBy = req.cookies.sessionId || 1;
    
    // VULNERABILITY: SQL Injection + XSS
    const query = `INSERT INTO notices (title, content, date, posted_by) 
                   VALUES ('${title}', '${content}', '${date || new Date().toISOString().split('T')[0]}', ${postedBy})`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            success: true,
            noticeId: result.insertId,
            message: 'Notice created'
        });
    });
});

// VULNERABILITY: Can delete any notice without authorization
router.delete('/notices/:id', (req, res) => {
    const noticeId = req.params.id;
    
    // VULNERABILITY: SQL Injection
    const query = `DELETE FROM notices WHERE id = ${noticeId}`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: 'Notice deleted' });
    });
});

// VULNERABILITY: Reflected XSS in search
router.get('/notices/search', (req, res) => {
    const searchTerm = req.query.q || '';
    
    // VULNERABILITY: SQL Injection + XSS
    const query = `SELECT * FROM notices 
                   WHERE title LIKE '%${searchTerm}%' OR content LIKE '%${searchTerm}%' 
                   ORDER BY date DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Returning search term without encoding
        res.json({
            searchTerm: searchTerm,
            results: results,
            count: results.length
        });
    });
});

module.exports = router;

