-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS healthcare_db;
USE healthcare_db;

-- 1. Users Table (Stores Basic Info)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    age INT,
    gender VARCHAR(20),
    height FLOAT,
    weight FLOAT,
    bmi FLOAT,
    bp_status VARCHAR(50),
    sugar_status VARCHAR(50),
    activity_level VARCHAR(50),
    smoking VARCHAR(10),
    alcohol VARCHAR(10),
    sleep_hours FLOAT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Health Logs (Stores Form Data)
CREATE TABLE IF NOT EXISTS health_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- Can be NULL if not authenticated
    name VARCHAR(100), -- Store name here too for guest users
    email VARCHAR(100), -- Store email for history tracking
    age INT,
    gender VARCHAR(20),
    height FLOAT,
    weight FLOAT,
    bmi FLOAT,
    bp_status VARCHAR(50), -- 'Normal' or 'High'
    sugar_status VARCHAR(50), -- 'Normal' or 'High'
    activity_level VARCHAR(50),
    smoking VARCHAR(10),
    alcohol VARCHAR(10),
    sleep_hours FLOAT,
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Predictions (Stores AI Results)
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id INT,
    diabetes_risk VARCHAR(50),
    heart_risk VARCHAR(50),
    obesity_risk VARCHAR(50),
    hypertension_risk VARCHAR(50),
    recommendations TEXT, -- JSON string or delimited text
    FOREIGN KEY (log_id) REFERENCES health_logs(id) ON DELETE CASCADE
);

-- 4. Conversational Logs Table
CREATE TABLE IF NOT EXISTS conversational_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_message TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    specialization VARCHAR(100),
    hospital_name VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    is_available BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    patient_queue TEXT, -- JSON string of connected user IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
