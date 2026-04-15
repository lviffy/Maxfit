import mysql.connector

def create_table():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Mayadinkp2806@',
            database='gym_db'
        )
        cursor = connection.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Attendance (
            attendance_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            UNIQUE KEY unique_attendance (user_id, date)
        )
        """)
        connection.commit()
        print("Attendance table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == '__main__':
    create_table()
