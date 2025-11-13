const express = require('express');
const router = express.Router();

// Get database connection from global scope
const db = global.db;

// VULNERABILITY: Broken Object Level Authorization (BOLA)
router.get('/profile/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    // VULNERABILITY: No authorization check - can access any student's profile
    const query = `SELECT * FROM students WHERE id = ${studentId}`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            // VULNERABILITY: Excessive data exposure
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Student not found' });
        }
    });
});

// VULNERABILITY: Mass assignment
router.put('/update/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    const updates = req.body;
    
    // VULNERABILITY: Allowing all fields including sensitive ones
    const fields = Object.keys(updates).map(key => {
        return `${key} = '${updates[key]}'`;
    }).join(', ');
    
    // VULNERABILITY: Can modify grades, admin status, etc.
    const query = `UPDATE students SET ${fields} WHERE id = ${studentId}`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: 'Student updated' });
    });
});

// VULNERABILITY: Broken Function Level Authorization
router.get('/all-students', (req, res) => {
    // VULNERABILITY: No admin check - any user can access
    const query = 'SELECT * FROM students';
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Exposing all student data
        res.json(results);
    });
});

// VULNERABILITY: SQL Injection in search
router.get('/search', (req, res) => {
    const name = req.query.name;
    const course = req.query.course;
    const semester = req.query.semester;
    
    // VULNERABILITY: Building query with string concatenation
    let query = 'SELECT * FROM students WHERE 1=1';
    
    if (name) {
        query += ` AND name LIKE '%${name}%'`;
    }
    if (course) {
        query += ` AND course = '${course}'`;
    }
    if (semester) {
        query += ` AND semester = ${semester}`;
    }
    
    db.query(query, (err, results) => {
        if (err) {
            // VULNERABILITY: Exposing SQL errors
            return res.status(500).json({ error: err.message, query: query });
        }
        
        res.json(results);
    });
});

// VULNERABILITY: Unrestricted resource consumption
router.get('/export', (req, res) => {
    const limit = req.query.limit || 1000000; // No real limit
    
    // VULNERABILITY: Can request unlimited data
    const query = `SELECT * FROM students LIMIT ${limit}`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json(results);
    });
});

// VULNERABILITY: Insecure Direct Object Reference for grades
router.get('/grades/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    // VULNERABILITY: No ownership validation
    const query = `
        SELECT s.name, s.student_id, g.subject, g.marks, g.grade, g.semester
        FROM students s
        JOIN grades g ON s.id = g.student_id
        WHERE s.id = ${studentId}
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json(results);
    });
});

// VULNERABILITY: Privilege escalation through parameter manipulation
router.post('/promote', (req, res) => {
    const { studentId, newRole } = req.body;
    
    // VULNERABILITY: No authorization check
    const query = `UPDATE students SET role = '${newRole}' WHERE id = ${studentId}`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: `Student promoted to ${newRole}` });
    });
});

// VULNERABILITY: Horizontal privilege escalation
router.delete('/delete/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    // VULNERABILITY: Can delete any student record
    const query = `DELETE FROM students WHERE id = ${studentId}`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: 'Student deleted' });
    });
});

module.exports = router;
