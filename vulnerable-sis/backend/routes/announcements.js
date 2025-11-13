const express = require('express');
const router = express.Router();

// Get database connection from global scope
const db = global.db;

// VULNERABILITY: Stored XSS
router.post('/create', (req, res) => {
    const { title, content, postedBy } = req.body;
    
    // VULNERABILITY: Storing unsanitized HTML/JavaScript
    const query = `INSERT INTO announcements (title, content, date, posted_by) 
                   VALUES ('${title}', '${content}', NOW(), ${postedBy || 1})`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            success: true,
            announcementId: result.insertId,
            message: 'Announcement created'
        });
    });
});

// VULNERABILITY: Reflected XSS in response
router.get('/view/:id', (req, res) => {
    const id = req.params.id;
    const search = req.query.search || '';
    
    const query = `SELECT * FROM announcements WHERE id = ${id}`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            // VULNERABILITY: Reflecting search term without encoding
            const html = `
                <html>
                <head><title>Announcement</title></head>
                <body>
                    <h1>${results[0].title}</h1>
                    <div>${results[0].content}</div>
                    <p>Search results for: ${search}</p>
                </body>
                </html>
            `;
            
            res.send(html);
        } else {
            res.status(404).send(`<h1>Announcement not found for search: ${search}</h1>`);
        }
    });
});

// VULNERABILITY: DOM-based XSS potential
router.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    
    // VULNERABILITY: SQL Injection + XSS
    const query = `SELECT * FROM announcements WHERE title LIKE '%${searchTerm}%' OR content LIKE '%${searchTerm}%'`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Returning unsanitized data
        res.json({
            searchTerm: searchTerm,
            results: results,
            count: results.length
        });
    });
});

// VULNERABILITY: HTML injection in comments
router.post('/comment', (req, res) => {
    const { announcementId, userId, comment } = req.body;
    
    // VULNERABILITY: Storing raw HTML/JS
    const query = `INSERT INTO announcement_comments (announcement_id, user_id, comment, created_at) 
                   VALUES (${announcementId}, ${userId}, '${comment}', NOW())`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, commentId: result.insertId });
    });
});

// VULNERABILITY: XSS in error messages
router.get('/invalid', (req, res) => {
    const input = req.query.input;
    
    res.send(`<h1>Error: Invalid input "${input}"</h1>`);
});

module.exports = router;
