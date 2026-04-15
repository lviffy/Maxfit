import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor()

new_cols = [
    "join_date DATE",
    "expiry_date DATE",
    "price INT"
]

for col in new_cols:
    try:
        cursor.execute(f"ALTER TABLE Users ADD COLUMN {col}")
        print(f"Added column {col}.")
    except Exception as e:
        print(f"Error adding {col} (might exist): {e}")

conn.commit()
cursor.close()
conn.close()
print("Membership Tracking columns added successfully!")
