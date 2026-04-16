"""
Consolidated Database Manager
Merges all database setup, table creation, column management, and data operations
"""

import os
import qrcode
import mysql.connector
import argparse
import sys
from datetime import datetime


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
# CONNECTION MANAGEMENT
# ============================================================================

def get_connection():
    """Get a MySQL database connection"""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"✗ Database connection error: {err}")
        return None


def close_connection(connection, cursor=None):
    """Close database connection and cursor safely"""
    if cursor and connection.is_connected():
        cursor.close()
    if connection and connection.is_connected():
        connection.close()


# ============================================================================
# TABLE CREATION FUNCTIONS
# ============================================================================

def create_attendance_table():
    """Create Attendance table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ Attendance table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Attendance table: {err}")
    finally:
        close_connection(connection, cursor)


def create_badges_table():
    """Create Badges table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ Badges table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Badges table: {err}")
    finally:
        close_connection(connection, cursor)


def create_progress_table():
    """Create Progress table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ Progress table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Progress table: {err}")
    finally:
        close_connection(connection, cursor)


def create_schedule_table():
    """Create Schedule table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ Schedule table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Schedule table: {err}")
    finally:
        close_connection(connection, cursor)


def create_payment_table():
    """Create Payment table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ Payment table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating Payment table: {err}")
    finally:
        close_connection(connection, cursor)


def create_workout_plan_table():
    """Create WorkoutPlan table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ WorkoutPlan table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating WorkoutPlan table: {err}")
    finally:
        close_connection(connection, cursor)


def create_meal_plan_table():
    """Create MealPlan table if not exists"""
    try:
        connection = get_connection()
        if not connection:
            return
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
        print("✓ MealPlan table created/verified successfully.")
        
    except mysql.connector.Error as err:
        print(f"✗ Error creating MealPlan table: {err}")
    finally:
        close_connection(connection, cursor)


# ============================================================================
# COLUMN MANAGEMENT (ALTER TABLE OPERATIONS)
# ============================================================================

def add_health_columns():
    """Add health-related columns to Users table"""
    connection = get_connection()
    if not connection:
        return
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
            print(f"  ✓ Added column: {col}")
        except Exception as e:
            print(f"  ℹ Column exists or skipped: {col}")
    
    connection.commit()
    close_connection(connection, cursor)
    print("✓ Health columns operation completed.")


def add_registration_number_column():
    """Add registration number column to Users table"""
    connection = get_connection()
    if not connection:
        return
    cursor = connection.cursor()
    
    try:
        cursor.execute("ALTER TABLE Users ADD COLUMN reg_no VARCHAR(20) UNIQUE")
        connection.commit()
        print("✓ Added reg_no column to Users table")
    except Exception as e:
        print(f"ℹ reg_no column might already exist: {e}")
    finally:
        close_connection(connection, cursor)


def add_tracking_columns():
    """Add membership tracking columns to Users table"""
    connection = get_connection()
    if not connection:
        return
    cursor = connection.cursor()
    
    new_cols = [
        "join_date DATE",
        "expiry_date DATE",
        "price INT"
    ]
    
    for col in new_cols:
        try:
            cursor.execute(f"ALTER TABLE Users ADD COLUMN {col}")
            print(f"  ✓ Added column: {col}")
        except Exception as e:
            print(f"  ℹ Column exists or skipped: {col}")
    
    connection.commit()
    close_connection(connection, cursor)
    print("✓ Membership tracking columns operation completed.")


def update_users_schema():
    """Update Users table schema with additional columns"""
    connection = get_connection()
    if not connection:
        return
    cursor = connection.cursor()
    
    try:
        # Add trainer_id
        try:
            cursor.execute("ALTER TABLE Users ADD COLUMN trainer_id INT")
            print("  ✓ Added trainer_id column to Users")
        except:
            print("  ℹ trainer_id column might already exist")
        
        # Add membership_status
        try:
            cursor.execute("ALTER TABLE Users ADD COLUMN membership_status VARCHAR(50) DEFAULT 'active'")
            print("  ✓ Added membership_status column to Users")
        except:
            print("  ℹ membership_status column might already exist")
        
        # Add foreign key constraint for trainer_id
        try:
            cursor.execute("""
                ALTER TABLE Users 
                ADD CONSTRAINT fk_trainer 
                FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE SET NULL
            """)
            print("  ✓ Added trainer_id foreign key constraint")
        except:
            print("  ℹ trainer_id foreign key might already exist")
        
        connection.commit()
        print("✓ Users table schema update completed.")
        
    except Exception as e:
        print(f"✗ Error updating Users schema: {e}")
    finally:
        close_connection(connection, cursor)


# ============================================================================
# DATA OPERATIONS (BACKFILL/UPDATE)
# ============================================================================

def backfill_registration_numbers():
    """Backfill registration numbers for users without them"""
    try:
        connection = get_connection()
        if not connection:
            return
        cursor = connection.cursor(dictionary=True)
        
        # Find all users without registration number
        cursor.execute("SELECT user_id, role FROM Users WHERE reg_no IS NULL OR reg_no = ''")
        users = cursor.fetchall()
        
        if not users:
            print("✓ All existing users already have a Registration Number!")
            close_connection(connection, cursor)
            return
        
        # Update each user with registration number
        update_cursor = connection.cursor()
        for u in users:
            role = u.get('role', 'member').lower()
            prefix = 'MEM' if role == 'member' else 'EMP'
            new_reg_no = f"{prefix}{u['user_id']:04d}"
            
            update_cursor.execute(
                "UPDATE Users SET reg_no = %s WHERE user_id = %s", 
                (new_reg_no, u['user_id'])
            )
        
        connection.commit()
        update_cursor.close()
        print(f"✓ Backfilled {len(users)} users with Registration Numbers!")
        
    except mysql.connector.Error as e:
        print(f"✗ Database error: {e}")
    except Exception as e:
        print(f"✗ Error occurred: {e}")
    finally:
        close_connection(connection, cursor)


# ============================================================================
# QR CODE GENERATION
# ============================================================================

def generate_qr_codes():
    """Generate QR codes for all users with registration numbers"""
    try:
        # Ensure directory exists
        os.makedirs('static/qrcodes', exist_ok=True)
        
        connection = get_connection()
        if not connection:
            return
        cursor = connection.cursor(dictionary=True)
        
        # Get all users with registration numbers
        cursor.execute("SELECT user_id, reg_no FROM Users WHERE reg_no IS NOT NULL")
        users = cursor.fetchall()
        
        generated_count = 0
        for u in users:
            if u['reg_no']:
                try:
                    # Create QR code pointing to member details
                    qr_data = f"http://127.0.0.1:5000/member-details/{u['user_id']}"
                    img = qrcode.make(qr_data)
                    img.save(f"static/qrcodes/{u['reg_no']}.png")
                    generated_count += 1
                except Exception as e:
                    print(f"  ✗ Error generating QR for {u['reg_no']}: {e}")
        
        print(f"✓ Generated {generated_count} QR codes successfully!")
        
    except Exception as e:
        print(f"✗ Error generating QR codes: {e}")
    finally:
        close_connection(connection, cursor)


# ============================================================================
# INITIALIZATION FUNCTIONS
# ============================================================================

def initialize_all_tables():
    """Create all tables if they don't exist"""
    print("\n" + "="*60)
    print("INITIALIZING DATABASE TABLES")
    print("="*60)
    
    create_attendance_table()
    create_badges_table()
    create_progress_table()
    create_schedule_table()
    create_payment_table()
    create_workout_plan_table()
    create_meal_plan_table()
    
    print("="*60 + "\n")


def initialize_all_columns():
    """Add all necessary columns to existing tables"""
    print("\n" + "="*60)
    print("ADDING DATABASE COLUMNS")
    print("="*60)
    
    add_health_columns()
    add_registration_number_column()
    add_tracking_columns()
    update_users_schema()
    
    print("="*60 + "\n")


def setup_complete_database():
    """Complete database setup including tables, columns, and data operations"""
    print("\n" + "="*70)
    print("COMPLETE DATABASE SETUP")
    print("="*70)
    
    # Step 1: Create tables
    initialize_all_tables()
    
    # Step 2: Add columns
    initialize_all_columns()
    
    # Step 3: Backfill data
    print("\n" + "="*60)
    print("BACKFILLING DATA")
    print("="*60)
    backfill_registration_numbers()
    print("="*60 + "\n")
    
    # Step 4: Generate QR codes
    print("\n" + "="*60)
    print("GENERATING QR CODES")
    print("="*60)
    generate_qr_codes()
    print("="*60 + "\n")
    
    print("✓ Database setup completed successfully!")


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    """Main function for CLI usage"""
    parser = argparse.ArgumentParser(description='Consolidated Database Manager for Gym Project')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Command: init-tables
    subparsers.add_parser('init-tables', help='Initialize all database tables')
    
    # Command: init-columns
    subparsers.add_parser('init-columns', help='Add all necessary columns to tables')
    
    # Command: backfill
    subparsers.add_parser('backfill', help='Backfill registration numbers for users')
    
    # Command: generate-qr
    subparsers.add_parser('generate-qr', help='Generate QR codes for all users')
    
    # Command: setup-all
    subparsers.add_parser('setup-all', help='Complete database setup (tables, columns, backfill, QR codes)')
    
    # Command: init-attendance
    subparsers.add_parser('init-attendance', help='Create Attendance table')
    
    # Command: init-badges
    subparsers.add_parser('init-badges', help='Create Badges table')
    
    # Command: init-progress
    subparsers.add_parser('init-progress', help='Create Progress table')
    
    # Command: init-schedule
    subparsers.add_parser('init-schedule', help='Create Schedule table')
    
    # Command: init-payment
    subparsers.add_parser('init-payment', help='Create Payment table')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Execute command
    if args.command == 'init-tables':
        initialize_all_tables()
    elif args.command == 'init-columns':
        initialize_all_columns()
    elif args.command == 'backfill':
        backfill_registration_numbers()
    elif args.command == 'generate-qr':
        generate_qr_codes()
    elif args.command == 'setup-all':
        setup_complete_database()
    elif args.command == 'init-attendance':
        create_attendance_table()
    elif args.command == 'init-badges':
        create_badges_table()
    elif args.command == 'init-progress':
        create_progress_table()
    elif args.command == 'init-schedule':
        create_schedule_table()
    elif args.command == 'init-payment':
        create_payment_table()


if __name__ == '__main__':
    main()
