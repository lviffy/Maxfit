"""Seed one owner or admin user into Users table.

Usage:
  python seed_user.py --role owner --email owner@example.com --password Pass123! --first-name Gym --last-name Owner
  python seed_user.py --role admin --email admin@example.com --password Pass123!
"""

import argparse
import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "your_username"),
        password=os.getenv("DB_PASSWORD", "your_password"),
        database=os.getenv("DB_NAME", "gym_db"),
    )


def make_password_hash(password: str) -> str:
    return generate_password_hash(password, method="pbkdf2:sha256:260000", salt_length=8)


def generate_reg_no(cursor, role: str) -> str:
    cursor.execute("SELECT MAX(user_id) AS max_id FROM Users")
    row = cursor.fetchone() or (0,)
    max_id = row[0] or 0
    new_id = max_id + 1
    prefix = "MEM" if role == "member" else "EMP"
    return f"{prefix}{new_id:04d}"


def main():
    parser = argparse.ArgumentParser(description="Seed an owner/admin user")
    parser.add_argument("--role", choices=["owner", "admin"], required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--first-name", default="Gym")
    parser.add_argument("--last-name", default="User")
    args = parser.parse_args()

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM Users WHERE email = %s LIMIT 1", (args.email,))
        existing = cursor.fetchone()
        if existing:
            print(f"User already exists with email {args.email} (user_id={existing[0]}).")
            return

        reg_no = generate_reg_no(cursor, args.role)
        hashed_password = make_password_hash(args.password)

        query = """
            INSERT INTO Users (
                reg_no, first_name, last_name, email, password, role, membership_status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(
            query,
            (reg_no, args.first_name, args.last_name, args.email, hashed_password, args.role, "active"),
        )
        conn.commit()
        print(f"Created {args.role} user: {args.email} (reg_no={reg_no})")

    except Error as e:
        print(f"Database error: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


if __name__ == "__main__":
    main()
