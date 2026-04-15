import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor()

query = """
CREATE TABLE IF NOT EXISTS Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount INT,
    payment_mode VARCHAR(50),
    payment_status VARCHAR(50),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
)
"""

try:
    cursor.execute(query)
    conn.commit()
    print("Payment Tracking Schema Initialized Natively!")
except Exception as e:
    print(f"Error creating tracking tables: {e}")

cursor.close()
conn.close()
