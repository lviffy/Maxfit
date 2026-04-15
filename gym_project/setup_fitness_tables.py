import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor()

query1 = """
CREATE TABLE IF NOT EXISTS WorkoutPlan (
    workout_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    workout_details TEXT,
    suggestion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
)
"""

query2 = """
CREATE TABLE IF NOT EXISTS MealPlan (
    meal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    meal_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
)
"""

try:
    cursor.execute(query1)
    cursor.execute(query2)
    conn.commit()
    print("Fitness Tracking tables initialized with UNIQUE overlays!")
except Exception as e:
    print(f"Error creating tracking tables: {e}")

cursor.close()
conn.close()
