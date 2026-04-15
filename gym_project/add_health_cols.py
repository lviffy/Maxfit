import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Mayadinkp2806@',
    database='gym_db'
)
cursor = conn.cursor()
cols_to_add = [
    "age INT",
    "height FLOAT",
    "weight FLOAT",
    "bmi FLOAT",
    "address VARCHAR(255)",
    "dob DATE",
    "goal VARCHAR(100)",
    "source VARCHAR(100)"
]
for col in cols_to_add:
    try:
        cursor.execute(f"ALTER TABLE Users ADD COLUMN {col}")
    except:
        pass
conn.commit()
print("Health columns confirmed built.")
cursor.close()
conn.close()
