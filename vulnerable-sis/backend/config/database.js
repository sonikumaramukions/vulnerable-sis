module.exports = {
    development: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "student",
        password: process.env.DB_PASSWORD || "password123",
        database: process.env.DB_NAME || "student_portal",
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    },

    production: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    },

    secrets: {
        jwtSecret: "mysecretkey123",
        adminPassword: "admin@123",
        encryptionKey: "encryption_key_weak"
    },

    cors: {
        origin: "*",
        credentials: true
    }
};
