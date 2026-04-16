import os
import mysql.connector
import argparse
import sys

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Mayadinkp2806@',
    'database': 'gym_db'
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def create_tables():
    print("--- Creating Tables ---")
    queries = [
        """
        CREATE TABLE IF NOT EXISTS Attendance (
            attendance_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            UNIQUE KEY unique_attendance (user_id, date)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS Badges (
            badge_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            badge_name VARCHAR(100) NOT NULL,
            date_awarded DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS Progress (
            progress_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            weight FLOAT NOT NULL,
            bmi FLOAT NOT NULL,
            date DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS Schedule (
            schedule_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            trainer_id INT NOT NULL,
            date DATE NOT NULL,
            time VARCHAR(50) NOT NULL,
            status ENUM('pending', 'approved') DEFAULT 'pending',
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS Payment (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            amount INT,
            payment_mode VARCHAR(50),
            payment_status VARCHAR(50),
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS WorkoutPlan (
            workout_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            workout_details TEXT,
            suggestion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS MealPlan (
            meal_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            meal_details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """
    ]
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        for query in queries:
            cursor.execute(query)
        conn.commit()
        print("All tables created or verified successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def alter_tables():
    print("--- Adding Missing Columns ---")
    cols_to_add = [
        "age INT",
        "height FLOAT",
        "weight FLOAT",
        "bmi FLOAT",
        "address VARCHAR(255)",
        "dob DATE",
        "goal VARCHAR(100)",
        "source VARCHAR(100)",
        "trainer_id INT",
        "membership_status VARCHAR(50) DEFAULT 'active'",
        "join_date DATE",
        "expiry_date DATE",
        "price INT",
        "reg_no VARCHAR(20) UNIQUE"
    ]
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        for col in cols_to_add:
            try:
                cursor.execute(f"ALTER TABLE Users ADD COLUMN {col}")
                print(f"Added column {col}.")
            except Exception as e:
                pass
        
        try:
            cursor.execute("ALTER TABLE Users ADD CONSTRAINT fk_trainer FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE SET NULL")
            print("Added foreign key for trainer_id.")
        except Exception as e:
            pass
            
        conn.commit()
    except Exception as e:
        print(f"Error in testing connection: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def backfill_reg_no():
    print("--- Backfilling Registration Numbers ---")
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT user_id, role FROM Users WHERE reg_no IS NULL OR reg_no = ''")
        users = cursor.fetchall()
        
        if not users:
            print("All existing users already have a Registration Number!")
        else:
            update_cursor = conn.cursor()
            for u in users:
                role = u.get('role', 'member').lower()
                prefix = 'MEM' if role == 'member' else 'EMP'
                new_reg_no = f"{prefix}{u['user_id']:04d}"
                update_cursor.execute("UPDATE Users SET reg_no = %s WHERE user_id = %s", (new_reg_no, u['user_id']))

            conn.commit()
            update_cursor.close()
            print(f"Success! Backfilled {len(users)} existing users with uniquely generated Registration Numbers!")

    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def main():
    parser = argparse.ArgumentParser(description="Manage Gym Database")
    parser.add_argument('--all', action='store_true', help='Run all tasks (create tables, add columns, backfill)')
    parser.add_argument('--create-tables', action='store_true', help='Create any missing tables')
    parser.add_argument('--add-columns', action='store_true', help='Add missing columns to existing tables')
    parser.add_argument('--backfill-reg', action='store_true', help='Backfill registration numbers')
    
    args = parser.parse_args()

    if len(sys.argv) > 1:
        if args.all or args.create_tables:
            create_tables()
        if args.all or args.add_columns:
            alter_tables()
        if args.all or args.backfill_reg:
            backfill_reg_no()
    else:
        while True:
            print("\n=== Database Management Menu ===")
            print("1. Create Missing Tables")
            print("2. Add Missing Columns to Users Table")
            print("3. Backfill Registration Numbers")
            print("4. Run All Tasks")
            print("5. Exit")
            
            try:
                choice = input("Select an option (1-5): ").strip()
            except EOFError:
                break
            
            if choice == '1':
                create_tables()
            elif choice == '2':
                alter_tables()
            elif choice == '3':
                backfill_reg_no()
            elif choice == '4':
                create_tables()
                alter_tables()
                backfill_reg_no()
            elif choice == '5':
                print("Exiting...")
                break
            else:
                print("Invalid Choice. Please enter a number between 1 and 5.")

if __name__ == '__main__':
    main()
