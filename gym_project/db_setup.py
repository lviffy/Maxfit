"""
Consolidated Database Setup and Management Module
Merges functionality from all individual DB setup/alteration scripts
"""

import os
import qrcode
import mysql.connector
import argparse
import sys

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Mayadinkp2806@',
    'database': 'gym_db'
}


# ============================================================================
# CONNECTION HELPER
# ============================================================================

def get_connection():
    """Get a MySQL database connection"""
    return mysql.connector.connect(**DB_CONFIG)


# ============================================================================
# TABLE CREATION FUNCTIONS
# ============================================================================

def create_attendance_table():
    """Create Attendance table"""
    try:
        connection = get_connection()
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
        print("✓ Attendance table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Attendance table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_badges_table():
    """Create Badges table"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Badges (
            badge_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            badge_name VARCHAR(100) NOT NULL,
            date_awarded DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """)
        connection.commit()
        print("✓ Badges table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Badges table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_progress_table():
    """Create Progress table"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Progress (
            progress_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            weight FLOAT NOT NULL,
            bmi FLOAT NOT NULL,
            date DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """)
        connection.commit()
        print("✓ Progress table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Progress table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_schedule_table():
    """Create Schedule table"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
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
        """)
        connection.commit()
        print("✓ Schedule table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Schedule table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_payment_table():
    """Create Payment table"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Payment (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            amount INT,
            payment_mode VARCHAR(50),
            payment_status VARCHAR(50),
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """)
        connection.commit()
        print("✓ Payment table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Payment table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_workout_plan_table():
    """Create WorkoutPlan table"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS WorkoutPlan (
            workout_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            workout_details TEXT,
            suggestion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """)
        connection.commit()
        print("✓ WorkoutPlan table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating WorkoutPlan table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_meal_plan_table():
    """Create MealPlan table"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS MealPlan (
            meal_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            meal_details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
        """)
        connection.commit()
        print("✓ MealPlan table created successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating MealPlan table: {err}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def create_all_tables():
    """Create all tables"""
    print("\n--- Creating All Tables ---")
    create_attendance_table()
    create_badges_table()
    create_progress_table()
    create_schedule_table()
    create_payment_table()
    create_workout_plan_table()
    create_meal_plan_table()
    print("--- All tables processed ---\n")


# ============================================================================
# COLUMN ADDITION FUNCTIONS
# ============================================================================

def add_health_columns():
    """Add health-related columns to Users table"""
    print("--- Adding Health Columns ---")
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
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
                print(f"✓ Added column: {col}")
            except Exception:
                pass
        
        connection.commit()
        print("✓ Health columns confirmed/added.")
        
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def add_membership_tracking_columns():
    """Add membership tracking columns to Users table"""
    print("--- Adding Membership Tracking Columns ---")
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        new_cols = [
            "join_date DATE",
            "expiry_date DATE",
            "price INT"
        ]
        
        for col in new_cols:
            try:
                cursor.execute(f"ALTER TABLE Users ADD COLUMN {col}")
                print(f"✓ Added column: {col}")
            except Exception:
                pass
        
        connection.commit()
        print("✓ Membership tracking columns added successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def add_reg_no_column():
    """Add registration number column to Users table"""
    print("--- Adding Registration Number Column ---")
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        try:
            cursor.execute("ALTER TABLE Users ADD COLUMN reg_no VARCHAR(20) UNIQUE")
            print("✓ Added reg_no column")
        except Exception as e:
            print(f"✗ Skipped adding reg_no: {e}")
        
        connection.commit()
        
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def add_trainer_and_status_columns():
    """Add trainer_id and membership_status columns to Users table"""
    print("--- Adding Trainer and Status Columns ---")
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        try:
            cursor.execute("ALTER TABLE Users ADD COLUMN trainer_id INT")
            print("✓ Added trainer_id column to Users.")
        except Exception:
            pass
        
        try:
            cursor.execute("ALTER TABLE Users ADD COLUMN membership_status VARCHAR(50) DEFAULT 'active'")
            print("✓ Added membership_status column to Users.")
        except Exception:
            pass
        
        try:
            cursor.execute("ALTER TABLE Users ADD CONSTRAINT fk_trainer FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE SET NULL")
            print("✓ Added foreign key for trainer_id.")
        except Exception:
            pass
        
        connection.commit()
        print("✓ Trainer and status columns processed!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def add_all_columns():
    """Add all missing columns"""
    print("\n--- Adding All Missing Columns ---")
    add_health_columns()
    add_membership_tracking_columns()
    add_reg_no_column()
    add_trainer_and_status_columns()
    print("--- All columns processed ---\n")


# ============================================================================
# DATA BACKFILL FUNCTIONS
# ============================================================================

def backfill_registration_numbers():
    """Backfill registration numbers for existing users"""
    print("\n--- Backfilling Registration Numbers ---")
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT user_id, role FROM Users WHERE reg_no IS NULL OR reg_no = ''")
        users = cursor.fetchall()
        
        if not users:
            print("✓ All existing users already have a Registration Number!")
        else:
            update_cursor = connection.cursor()
            for u in users:
                role = u.get('role', 'member').lower()
                prefix = 'MEM' if role == 'member' else 'EMP'
                new_reg_no = f"{prefix}{u['user_id']:04d}"
                
                update_cursor.execute("UPDATE Users SET reg_no = %s WHERE user_id = %s", (new_reg_no, u['user_id']))

            connection.commit()
            update_cursor.close()
            print(f"✓ Success! Backfilled {len(users)} users with Registration Numbers!")

    except mysql.connector.Error as e:
        print(f"✗ Database error occurred: {e}")
    except Exception as e:
        print(f"✗ Error occurred: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


def backfill_qr_codes():
    """Generate and backfill QR codes for users"""
    print("\n--- Backfilling QR Codes ---")
    try:
        os.makedirs('static/qrcodes', exist_ok=True)
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT user_id, reg_no FROM Users")
        users = cursor.fetchall()
        
        count = 0
        for u in users:
            if u['reg_no']:
                img = qrcode.make(f"http://127.0.0.1:5000/member-details/{u['user_id']}")
                img.save(f"static/qrcodes/{u['reg_no']}.png")
                count += 1
        
        print(f"✓ Generated {count} QR codes successfully!")
        
    except Exception as e:
        print(f"✗ Error generating QR codes: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


# ============================================================================
# MAIN FUNCTION WITH CLI
# ============================================================================

def main():
    """Main function with command-line interface"""
    parser = argparse.ArgumentParser(description="Gym Database Setup and Management")
    parser.add_argument('--all', action='store_true', help='Run all setup tasks')
    parser.add_argument('--create-tables', action='store_true', help='Create all tables')
    parser.add_argument('--add-columns', action='store_true', help='Add all missing columns')
    parser.add_argument('--backfill-reg', action='store_true', help='Backfill registration numbers')
    parser.add_argument('--backfill-qr', action='store_true', help='Generate QR codes')
    
    args = parser.parse_args()

    if len(sys.argv) > 1:
        # Command-line mode
        if args.all:
            create_all_tables()
            add_all_columns()
            backfill_registration_numbers()
            backfill_qr_codes()
        else:
            if args.create_tables:
                create_all_tables()
            if args.add_columns:
                add_all_columns()
            if args.backfill_reg:
                backfill_registration_numbers()
            if args.backfill_qr:
                backfill_qr_codes()
    else:
        # Interactive mode
        while True:
            print("\n" + "="*50)
            print("    Database Setup and Management Menu")
            print("="*50)
            print("1. Create All Tables")
            print("2. Add All Missing Columns")
            print("3. Backfill Registration Numbers")
            print("4. Generate QR Codes")
            print("5. Run All Tasks")
            print("6. Exit")
            print("="*50)
            
            try:
                choice = input("Select an option (1-6): ").strip()
            except EOFError:
                break
            
            if choice == '1':
                create_all_tables()
            elif choice == '2':
                add_all_columns()
            elif choice == '3':
                backfill_registration_numbers()
            elif choice == '4':
                backfill_qr_codes()
            elif choice == '5':
                create_all_tables()
                add_all_columns()
                backfill_registration_numbers()
                backfill_qr_codes()
                print("\n✓ All tasks completed!")
            elif choice == '6':
                print("Exiting...")
                break
            else:
                print("✗ Invalid choice. Please enter a number between 1 and 6.")


if __name__ == '__main__':
    main()
