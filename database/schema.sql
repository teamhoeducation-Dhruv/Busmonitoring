-- PostgreSQL Database Schema for Bus Monitoring Portal

-- 1. Users Table (For Authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'district', -- 'admin', 'district', or 'school'
    district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
    school_dias_code VARCHAR(100) UNIQUE, -- Only one user per DISE code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Districts Table
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- Used for URLs and API identifiers (e.g., lowercase names)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Schools Table
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    dias_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    taluka_id INTEGER REFERENCES talukas(id) ON DELETE SET NULL,
    principal_name VARCHAR(255),
    principal_contact VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.1 Talukas Table
CREATE TABLE talukas (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    UNIQUE(district_id, name)
);

-- 4. Students Table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_dias_code VARCHAR(100) REFERENCES schools(dias_code) ON DELETE CASCADE,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    
    route VARCHAR(255),
    beneficiary_villages VARCHAR(255),
    standard VARCHAR(50),
    address TEXT,
    bus_pass_number VARCHAR(100),
    bus_number VARCHAR(100),
    bus_time_morning VARCHAR(100),
    bus_time_evening VARCHAR(100),
    depot_manager_name VARCHAR(255),
    depot_manager_contact VARCHAR(100),
    
    traveling_bus BOOLEAN DEFAULT false,
    not_traveling_bus BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Daily Submissions Table (History of travel status)
CREATE TABLE daily_submissions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    school_dias_code VARCHAR(100) REFERENCES schools(dias_code) ON DELETE CASCADE,
    student_name VARCHAR(255),
    school_name VARCHAR(255),
    traveling_bus BOOLEAN NOT NULL,
    remarks TEXT,
    bus_number VARCHAR(100),
    submission_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Daily Remarks Table (When a school submits a general remark for the whole day)
CREATE TABLE daily_remarks (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    school_dias_code VARCHAR(100) REFERENCES schools(dias_code) ON DELETE CASCADE,
    school_name VARCHAR(255),
    remark TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create indexes for reports
CREATE INDEX idx_daily_submissions_date ON daily_submissions(date);
CREATE INDEX idx_daily_remarks_date ON daily_remarks(date);
CREATE INDEX idx_daily_submissions_district ON daily_submissions(district_id);
CREATE INDEX idx_daily_remarks_district ON daily_remarks(district_id);

-- 5. Create an index on frequently searched columns
CREATE INDEX idx_students_district_id ON students(district_id);
CREATE INDEX idx_students_school_dias_code ON students(school_dias_code);
CREATE INDEX idx_schools_district_id ON schools(district_id);

-- Insert Default Admin Users
INSERT INTO users (email, password_hash, role) VALUES 
('master1@cotd.com', '$2y$12$Dh/nexGdUdfMK01Ie8.eq.9dAu8U87ZMewlxEys/CM8KYe6WLU882', 'admin'),
('master2@cotd.com', '$2y$12$Dh/nexGdUdfMK01Ie8.eq.9dAu8U87ZMewlxEys/CM8KYe6WLU882', 'admin');
