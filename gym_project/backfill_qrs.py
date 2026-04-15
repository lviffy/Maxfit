import os
import qrcode
import mysql.connector

# Ensure dir structurally
os.makedirs('static/qrcodes', exist_ok=True)

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT user_id, reg_no FROM Users")
users = cursor.fetchall()
for u in users:
    if u['reg_no']:
        img = qrcode.make(f"http://127.0.0.1:5000/member-details/{u['user_id']}")
        img.save(f"static/qrcodes/{u['reg_no']}.png")

cursor.close()
conn.close()
print("Initialized native directory bounds cleanly natively over Legacy members.")
