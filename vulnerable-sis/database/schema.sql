CREATE DATABASE IF NOT EXISTS student_portal;
USE student_portal;

-- Users table (Students, Parents, Admin)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    login_id VARCHAR(50) UNIQUE,
    password VARCHAR(255), -- VULNERABILITY: Plain text passwords
    name VARCHAR(100),
    email VARCHAR(100),
    user_type ENUM('Students', 'Parents', 'Admin'),
    is_admin BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    student_id VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(15),
    address TEXT,
    course VARCHAR(100),
    semester INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Announcements table
CREATE TABLE announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    content TEXT, -- VULNERABILITY: Stores unsanitized HTML/scripts
    date DATE,
    posted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255),
    filepath VARCHAR(500),
    uploaded_by INT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    comment TEXT, -- VULNERABILITY: Stores unsanitized comments
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin panel table
CREATE TABLE admin_panel (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_name VARCHAR(100),
    setting_value TEXT,
    confidential_data TEXT
);

-- Notices table (Notice Board)
CREATE TABLE notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    content TEXT, -- VULNERABILITY: Stores unsanitized HTML/scripts
    date DATE,
    posted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notice views table (tracking viewed/unviewed status)
CREATE TABLE notice_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notice_id INT,
    user_id INT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_view (notice_id, user_id),
    FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
);

-- Insert sample vulnerable data
INSERT INTO users (login_id, password, name, email, user_type, is_admin) VALUES
('student001', 'password123', 'John Doe', 'john@example.com', 'Students', FALSE),
('admin', 'admin123', 'Administrator', 'admin@tripathi.edu', 'Admin', TRUE),
('parent001', 'parent123', 'Jane Parent', 'jane@example.com', 'Parents', FALSE);

INSERT INTO students (user_id, student_id, name, email, phone, address, course, semester) VALUES
(1, 'STU2025001', 'John Doe', 'john@example.com', '9876543210', '123 Main St, City', 'B.Tech Computer Science', 7);

INSERT INTO announcements (title, content, date, posted_by) VALUES
('NOTICE ROOM ALLOTMENT & SEATING PLAN 05-11-2025', '<p>Room allotment details are available</p>', '2025-11-04', 2),
('End Term Exam Schedule B.Tech Class 2026 Sem 7 dt 03.11.2025', '<p>Exam schedule has been released</p>', '2025-11-03', 2),
('Def-Space Tech Winter Internship', '<script>alert("XSS Vulnerability")</script>', '2025-11-04', 2);

-- Insert sample notices for Notice Board
INSERT INTO notices (id, title, content, date, posted_by) VALUES
(7, 'Def-Space Tech Winter Internship', 'Winter internship opportunities available', '2025-11-04', 2),
(8, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 05-11-2025', 'Room allotment and seating plan details', '2025-11-04', 2),
(9, 'Hostel Notice.', 'Important hostel information', '2025-11-03', 2),
(10, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 03-11-2025', 'Room allotment details', '2025-11-03', 2),
(11, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 04-11-2025', 'Seating plan information', '2025-11-03', 2),
(12, 'End Term Exam Schedule B.Tech Class 2026 Sem 7 dt 03.11.2025', 'End term examination schedule released', '2025-11-03', 2),
(13, 'Socialising in Senior Years: A New Pillar for Health, Happiness & Well-being', 'Workshop on socializing and well-being', '2025-10-24', 2),
(14, 'Deepawali Notice', 'Deepawali holiday information', '2025-10-17', 2),
(15, 'Classwork Circular', 'Important classwork circular', '2025-10-10', 2),
(16, 'Find a Higher Purpose in Life and Work - Guidance from the Bhagavad Gita', 'Workshop announcement', '2025-10-10', 2),
(17, 'NLP-TEST-1 KEY', 'NLP test answer key released', '2025-10-01', 2),
(18, 'OTP PLEASE: THE UNTOLD STORY OF E COMMERCE', 'E-commerce workshop details', '2025-10-01', 2),
(19, 'TIMELESS INSIGHTS OF YOGA VASI??HA: A COMPASS FOR TODAY\'S LEADERS', 'Leadership workshop', '2025-09-26', 2),
(20, 'Ethnic Day on 01-10-2025- Reg.', 'Ethnic day celebration registration', '2025-09-25', 2),
(21, 'Working Day on 27/09/2025 -Notice', 'Working day notice', '2025-09-25', 2),
(22, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 26-09-2025', 'Room allotment notice', '2025-09-25', 2),
(23, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 25-09-2025', 'Seating plan information', '2025-09-24', 2),
(24, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 24-09-2025', 'Room allotment details', '2025-09-23', 2),
(25, 'NOTICE ROOM ALLOTMENT_SEATING PLAN 22-09-2025', 'Seating plan notice', '2025-09-22', 2),
(26, 'NOTICE ROOM ALLOTMENT & SEATING PLAN 23-09-2025.', 'Room allotment information', '2025-09-22', 2);

INSERT INTO admin_panel (setting_name, setting_value, confidential_data) VALUES
('database_config', 'host=localhost;user=root', 'password=SuperSecret123!'),
('api_keys', 'key1=abc123', 'secret_key=xyz789confidential');
