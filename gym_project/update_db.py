import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE Users ADD COLUMN trainer_id INT")
    print("Added trainer_id column to Users.")
except Exception as e:
    print(f"Column trainer_id might already exist: {e}")

try:
    cursor.execute("ALTER TABLE Users ADD COLUMN membership_status VARCHAR(50) DEFAULT 'active'")
    print("Added membership_status column to Users.")
except Exception as e:
    print(f"Column membership_status might already exist: {e}")

try:
    cursor.execute("ALTER TABLE Users ADD CONSTRAINT fk_trainer FOREIGN KEY (trainer_id) REFERENCES Users(id) ON DELETE SET NULL")
except Exception as e:
    pass # Ignoring FK error for simplicity

conn.commit()
cursor.close()
conn.close()
print("Database schema update complete!")
