import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE Users ADD COLUMN reg_no VARCHAR(20) UNIQUE")
    print("Added reg_no")
except Exception as e:
    print(f"Skipped adding reg_no: {e}")
conn.commit()
cursor.close()
conn.close()
