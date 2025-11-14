# TRIPATHI GROUP OF INSTITUTIONS - Vulnerable Student Information System

## ⚠️ WARNING
This application is **INTENTIONALLY VULNERABLE** for ethical hacking practice and educational purposes. **DO NOT** deploy this in production or expose it to the internet without proper security measures.

## Overview
This is a vulnerable Student Information System (SIS) designed to look like a professional academic portal. It contains multiple security vulnerabilities that students can practice ethical hacking techniques on.

## Features
- Student/Parent login system
- Dashboard with navigation sidebar
- Notice Board with viewed/unviewed status indicators
- Announcements system
- Document management
- Student profile management

## Vulnerabilities Included
1. **SQL Injection** - Multiple endpoints vulnerable to SQL injection
2. **Cross-Site Scripting (XSS)** - Stored and reflected XSS vulnerabilities
3. **Insecure Direct Object Reference (IDOR)** - Can access other users' data
4. **Broken Authentication** - Weak session management, predictable tokens
5. **Sensitive Data Exposure** - Passwords in plain text, exposed debug info
6. **Security Misconfiguration** - CORS misconfiguration, exposed error messages
7. **File Upload Vulnerabilities** - Unrestricted file uploads, path traversal
8. **Command Injection** - Unsafe command execution
9. **Server-Side Request Forgery (SSRF)** - Arbitrary URL fetching
10. **XML External Entity (XXE)** - XXE vulnerabilities

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Installation

1. **Install Dependencies**
   ```bash
   cd vulnerable-sis/backend
   npm install
   ```

2. **Database Setup**
   ```bash
   mysql -u root -p < ../database/schema.sql
   ```
   Or import the schema.sql file using your MySQL client.

3. **Configure Database** (if needed)
   Edit `backend/config/database.js` or `backend/app.js` to update database credentials.

4. **Add Logo**
   Place your TRIPATHI GROUP OF INSTITUTIONS logo as `frontend/images/logo.png`

5. **Start the Server**
   ```bash
   cd backend
   npm start
   ```

6. **Access the Application**
   Open your browser and navigate to: `http://localhost:3000`

## Default Credentials

### Test Accounts
- **Student**: `student001` / `password123`
- **Admin**: `admin` / `admin123`
- **Parent**: `parent001` / `parent123`

## Project Structure
```
vulnerable-sis/
├── backend/
│   ├── app.js                 # Main server file
│   ├── config/
│   │   └── database.js       # Database configuration
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── announcements.js  # Announcements routes
│   │   ├── documents.js      # Document routes
│   │   ├── notices.js        # Notice board routes
│   │   └── students.js       # Student routes
│   └── uploads/              # File upload directory
├── database/
│   └── schema.sql            # Database schema
└── frontend/
    ├── index.html            # Landing page
    ├── login.html            # Login page
    ├── dashboard.html        # Main dashboard
    ├── noticeboard.html      # Notice board page
    ├── announcements.html    # Announcements page
    ├── documents.html        # Documents page
    ├── css/
    │   └── styles.css        # Main stylesheet
    └── js/
        ├── login.js          # Login functionality
        ├── dashboard.js      # Dashboard functionality
        └── sections.js       # Section loading
```

## Azure Deployment Notes

When deploying to Azure:

1. **Database**: Use Azure Database for MySQL
   - Update connection string in `backend/app.js` or use environment variables
   - Update `backend/config/database.js` for production settings

2. **Environment Variables**: Set these in Azure App Service:
   - `DB_HOST` - Azure MySQL host
   - `DB_USER` - Database username
   - `DB_PASSWORD` - Database password
   - `DB_NAME` - Database name
   - `PORT` - Server port (Azure will set this)

3. **File Storage**: Use Azure Blob Storage for uploads instead of local filesystem

4. **HTTPS**: Enable HTTPS in Azure App Service settings

## Git Workflow

1. Initialize git repository (if not already done):
   ```bash
   git init
   ```

2. Add files:
   ```bash
   git add .
   ```

3. Commit:
   ```bash
   git commit -m "Initial commit: Vulnerable SIS for ethical hacking practice"
   ```

4. Add remote and push:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## Educational Use

This application is designed for:
- Learning about web application security
- Practicing ethical hacking techniques
- Understanding common vulnerabilities (OWASP Top 10)
- Security testing and penetration testing practice

## Disclaimer

This software is provided for educational purposes only. The authors are not responsible for any misuse of this application. Use responsibly and only in controlled environments.

## License

This project is for educational use only.

