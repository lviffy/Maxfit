"""Seed/update all standard Max Fit test users.

Creates or updates:
- owner@maxfit.com (owner)
- admin@maxfit.com (admin)
- trainer@maxfit.com (trainer)
- member@maxfit.com (member)

Default password for all: Pass123!
"""

import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash

load_dotenv(dotenv_path=".env")

USERS = [
    ("owner@maxfit.com", "owner", "Owner", "Max"),
    ("admin@maxfit.com", "admin", "Admin", "Max"),
    ("trainer@maxfit.com", "trainer", "Trainer", "Max"),
    ("member@maxfit.com", "member", "Member", "Max"),
]


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "your_username"),
        password=os.getenv("DB_PASSWORD", "your_password"),
        database=os.getenv("DB_NAME", "gym_db"),
    )


def next_reg_no(cursor, role: str) -> str:
    cursor.execute("SELECT COALESCE(MAX(user_id), 0) FROM Users")
    new_id = (cursor.fetchone()[0] or 0) + 1
    prefix = "MEM" if role == "member" else "EMP"
    return f"{prefix}{new_id:04d}"


def main():
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        for email, role, first_name, last_name in USERS:
            cur.execute("SELECT user_id FROM Users WHERE email = %s LIMIT 1", (email,))
            existing = cur.fetchone()
            hashed_pw = generate_password_hash("Pass123!", method="pbkdf2:sha256:260000", salt_length=8)

            if existing:
                cur.execute(
                    """
                    UPDATE Users
                    SET first_name=%s, last_name=%s, password=%s, role=%s, membership_status=%s
                    WHERE email=%s
                    """,
                    (first_name, last_name, hashed_pw, role, "active", email),
                )
                print(f"UPDATED {role}: {email}")
            else:
                reg_no = next_reg_no(cur, role)
                cur.execute(
                    """
                    INSERT INTO Users (reg_no, first_name, last_name, email, password, role, membership_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (reg_no, first_name, last_name, email, hashed_pw, role, "active"),
                )
                print(f"CREATED {role}: {email} ({reg_no})")

        conn.commit()
        print("DONE")

    except Error as e:
        print(f"Database error: {e}")
    finally:
        if cur:
            cur.close()
        if conn and conn.is_connected():
            conn.close()


if __name__ == "__main__":
    main()
