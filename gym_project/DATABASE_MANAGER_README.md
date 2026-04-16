# Database Manager - Consolidated Documentation

## Overview
All database management scripts have been consolidated into a single `database_manager.py` file. This module handles:
- Table creation
- Column management (ALTER TABLE operations)
- Data backfill operations
- QR code generation
- Complete database initialization

## Previous Individual Files (Now Merged)
The following files have been merged into `database_manager.py`:
- `add_attendance_table.py` → `create_attendance_table()`
- `add_badges_table.py` → `create_badges_table()`
- `add_progress_table.py` → `create_progress_table()`
- `add_schedule_table.py` → `create_schedule_table()`
- `add_health_cols.py` → `add_health_columns()`
- `add_reg_no.py` → `add_registration_number_column()`
- `add_tracking_cols.py` → `add_tracking_columns()`
- `backfill_qrs.py` → `generate_qr_codes()`
- `backfill_reg_no.py` → `backfill_registration_numbers()`
- `create_payments_tables.py` → `create_payment_table()`
- `setup_fitness_tables.py` → `create_workout_plan_table()`, `create_meal_plan_table()`
- `update_db.py` → `update_users_schema()`

## Usage

### Command Line Interface

#### Complete Database Setup
```bash
python database_manager.py setup-all
```
This runs everything: tables, columns, backfill, and QR code generation.

#### Initialize All Tables
```bash
python database_manager.py init-tables
```
Creates all required tables if they don't exist.

#### Add All Columns
```bash
python database_manager.py init-columns
```
Adds all necessary columns to existing tables.

#### Backfill Registration Numbers
```bash
python database_manager.py backfill
```
Assigns registration numbers to users without them.

#### Generate QR Codes
```bash
python database_manager.py generate-qr
```
Generates QR codes for all users with registration numbers.

#### Individual Table Creation
```bash
python database_manager.py init-attendance
python database_manager.py init-badges
python database_manager.py init-progress
python database_manager.py init-schedule
python database_manager.py init-payment
```

### Programmatic Usage

```python
from database_manager import (
    create_attendance_table,
    add_health_columns,
    backfill_registration_numbers,
    generate_qr_codes,
    setup_complete_database
)

# Single operation
create_attendance_table()

# Multiple operations
add_health_columns()
backfill_registration_numbers()

# Complete setup
setup_complete_database()
```

## Tables Created

1. **Attendance** - Track gym member attendance
2. **Badges** - Award badges to members
3. **Progress** - Track member progress (weight, BMI)
4. **Schedule** - Manage training schedules
5. **Payment** - Track payment transactions
6. **WorkoutPlan** - Store personalized workout plans
7. **MealPlan** - Store personalized meal plans

## Column Operations

### Users Table Columns Added
- Health: `age`, `height`, `weight`, `bmi`, `dob`, `goal`
- Membership: `reg_no` (registration number), `join_date`, `expiry_date`, `price`
- Training: `trainer_id`, `membership_status`
- Other: `address`, `source`

## Database Configuration

Database credentials are defined in the `DB_CONFIG` dictionary:
```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Mayadinkp2806@',
    'database': 'gym_db'
}
```

**Note:** For production, these should be moved to environment variables.

## Error Handling

All functions include proper error handling:
- Checks for existing tables/columns (won't duplicate)
- Graceful connection management
- Detailed error messages
- Proper resource cleanup

## Features

✓ Consolidated database management
✓ CLI and programmatic interfaces
✓ Safe column additions (no duplicates)
✓ Comprehensive error handling
✓ QR code generation for member identification
✓ Registration number backfill
✓ Clean connection management

## Future Improvements

- [ ] Move DB config to environment variables
- [ ] Add database migration system
- [ ] Add rollback functionality
- [ ] Add data validation
- [ ] Add logging to file
