const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Get database connection from global scope
const db = global.db;

// VULNERABILITY: Weak JWT implementation
function generateToken(userId, username, role) {
    // VULNERABILITY: No signature verification
    const header = Buffer.from(JSON.stringify({
        alg: 'none',  // VULNERABILITY: Using 'none' algorithm
        typ: 'JWT'
    })).toString('base64');
    
    const payload = Buffer.from(JSON.stringify({
        userId: userId,
        username: username,
        role: role,
        isAdmin: role === 'Admin' ? true : false,
        iat: Date.now()
    })).toString('base64');
    
    // VULNERABILITY: No signature
    return `${header}.${payload}.`;
}

// VULNERABILITY: JWT tampering vulnerability
router.post('/login-jwt', (req, res) => {
    const { username, password } = req.body;
    
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM users WHERE login_id = '${username}' AND password = '${password}'`;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            const user = results[0];
            const token = generateToken(user.id, user.name, user.user_type);
            
            res.json({
                success: true,
                token: token,
                user: user
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// VULNERABILITY: Insecure token validation
router.get('/verify-token', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // VULNERABILITY: Not verifying signature
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // VULNERABILITY: Trusting token data without verification
    res.json({
        valid: true,
        userId: payload.userId,
        username: payload.username,
        isAdmin: payload.isAdmin
    });
});

// VULNERABILITY: Predictable password reset tokens
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    
    // VULNERABILITY: Sequential reset tokens
    const resetToken = Math.floor(100000 + Math.random() * 900000); // 6-digit token
    const expiry = new Date(Date.now() + 3600000); // 1 hour
    
    // VULNERABILITY: SQL Injection + information disclosure
    const query = `UPDATE users SET reset_token = '${resetToken}', reset_expiry = '${expiry}' WHERE email = '${email}'`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Exposing reset token in response
        res.json({
            success: true,
            message: 'Reset token generated',
            resetToken: resetToken,  // Should never expose this!
            email: email
        });
    });
});

// VULNERABILITY: No token validation in password reset
router.post('/reset-password', (req, res) => {
    const { email, resetToken, newPassword } = req.body;
    
    // VULNERABILITY: No expiry check, SQL injection
    const query = `UPDATE users SET password = '${newPassword}', reset_token = NULL WHERE email = '${email}' AND reset_token = '${resetToken}'`;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Password reset successful' });
        } else {
            res.json({ success: false, message: 'Invalid reset token' });
        }
    });
});

// VULNERABILITY: Session fixation
router.get('/create-session', (req, res) => {
    const sessionId = req.query.sessionId || crypto.randomBytes(16).toString('hex');
    
    // VULNERABILITY: Accepting session ID from user
    res.cookie('PHPSESSID', sessionId, { httpOnly: false });
    res.json({ sessionId: sessionId });
});

// VULNERABILITY: Insecure remember me functionality
router.post('/remember-me', (req, res) => {
    const { username } = req.body;
    
    // VULNERABILITY: Predictable token
    const rememberToken = Buffer.from(username).toString('base64');
    
    res.cookie('remember_token', rememberToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: false,
        secure: false
    });
    
    res.json({ success: true, token: rememberToken });
});

// VULNERABILITY: OAuth-like bypass
router.get('/oauth/callback', (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    
    // VULNERABILITY: No state validation (CSRF)
    // VULNERABILITY: Predictable authorization code
    const userId = Buffer.from(code, 'base64').toString();
    
    const query = `SELECT * FROM users WHERE id = ${userId}`;
    db.query(query, (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ error: 'Invalid code' });
        }
        
        const token = generateToken(results[0].id, results[0].name, results[0].user_type);
        res.json({ token: token, user: results[0] });
    });
});

module.exports = router;
