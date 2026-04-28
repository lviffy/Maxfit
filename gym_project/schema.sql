CREATE DATABASE IF NOT EXISTS gym_db;
USE gym_db;

-- Users table schema (consolidated with all fields from database_manager.py)
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Health & Personal Info columns
    age INT,
    height FLOAT,
    weight FLOAT,
    bmi FLOAT,
    address VARCHAR(255),
    dob DATE,
    goal VARCHAR(100),
    source VARCHAR(100),
    
    -- Registration & Tracking
    reg_no VARCHAR(20) UNIQUE,
    join_date DATE,
    expiry_date DATE,
    price INT,
    
    -- Membership & Trainer
    trainer_id INT,
    membership_status VARCHAR(50) DEFAULT 'active',
    CONSTRAINT fk_trainer FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- Admin table (as per requirement assumption)
CREATE TABLE IF NOT EXISTS Admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Attendance table
CREATE TABLE IF NOT EXISTS Attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (user_id, date)
);

-- Progress table
CREATE TABLE IF NOT EXISTS Progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    weight FLOAT NOT NULL,
    bmi FLOAT NOT NULL,
    date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Schedule table
CREATE TABLE IF NOT EXISTS Schedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    trainer_id INT NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved') DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Badges table
CREATE TABLE IF NOT EXISTS Badges (
    badge_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    date_awarded DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Payment table
CREATE TABLE IF NOT EXISTS Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount INT,
    payment_mode VARCHAR(50),
    payment_status VARCHAR(50),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- WorkoutPlan table
CREATE TABLE IF NOT EXISTS WorkoutPlan (
    workout_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    workout_details TEXT,
    suggestion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- MealPlan table
CREATE TABLE IF NOT EXISTS MealPlan (
    meal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    meal_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

