// VULNERABILITY: Hardcoded credentials
module.exports = {
    development: {
        host: 'localhost',
        user: 'root',
        password: 'password123', // VULNERABILITY: Weak password in code
        database: 'student_portal',
        port: 3306,
        multipleStatements: true, // VULNERABILITY: Allows SQL injection chaining
        debug: true // VULNERABILITY: Exposing debug info
    },
    
    production: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password123',
        database: process.env.DB_NAME || 'student_portal',
        port: 3306,
        // VULNERABILITY: Same weak config in production
        multipleStatements: true,
        connectionLimit: 100,
        connectTimeout: 60000
    },
    
    // VULNERABILITY: Exposed API keys and secrets
    secrets: {
        jwtSecret: 'mysecretkey123', // VULNERABILITY: Weak secret
        apiKey: 'API_KEY_12345',
        adminPassword: 'admin@123',
        encryptionKey: 'encryption_key_weak'
    },
    
    // VULNERABILITY: Insecure CORS configuration
    cors: {
        origin: '*', // VULNERABILITY: Allows all origins
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: '*'
    }
};
