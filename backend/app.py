from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
import mysql.connector
from mysql.connector import Error
import os
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.strftime('%Y-%m-%d')
        return super().default(obj)

app = Flask(__name__)
app.json_provider_class = CustomJSONProvider
app.json = CustomJSONProvider(app)
CORS(app, supports_credentials=True)
app.secret_key = 'super_secret_gym_key' # Needed for session tracking

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'your_username'),
            password=os.getenv('DB_PASSWORD', 'your_password'),
            database=os.getenv('DB_NAME', 'gym_db')
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# --- INITIAL ROUTES ---
@app.route('/')
def home():
    if 'role' in session:
        return f"App Running Successfully! Logged in as {session['first_name']}. <a href='/{session['role']}'>Go to Dashboard</a>"
    return "App Running Successfully! <a href='/login'>Login</a>"

@app.route('/test-db')
def test_db():
    conn = get_db_connection()
    if conn is None: return "Database connection failed"
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id as id, first_name, last_name, email, role, membership_status, trainer_id FROM Users")
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"users": users}
    except Error as e:
        return f"Error fetching from database: {e}"

def generate_reg_no(role):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT MAX(user_id) as max_id FROM Users")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        max_id = result['max_id'] if result and result['max_id'] else 0
        new_id = max_id + 1
        prefix = 'MEM' if role == 'member' else 'EMP'
        return f"{prefix}{new_id:04d}"
    return None

def is_owner():
    return session.get('role') == 'owner'

def ensure_admin_privileges_table(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS AdminPrivileges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            granted_by INT NOT NULL,
            grant_type ENUM('temporary','permanent') DEFAULT 'permanent',
            expiry_date DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    cursor.close()

def ensure_salary_column(conn):
    cursor = conn.cursor()
    try:
        cursor.execute("SHOW COLUMNS FROM Users LIKE 'salary'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE Users ADD COLUMN salary DECIMAL(10,2) DEFAULT 0 AFTER goal")
            conn.commit()
    except Exception:
        pass
    finally:
        cursor.close()

def is_owner_or_elevated():
    """Returns True if the current session user is an owner,
    or an admin with an active (unexpired) elevated privilege."""
    if session.get('role') == 'owner':
        return True
    if session.get('role') == 'admin' and session.get('elevated'):
        return True
    return False

def get_pending_id_column(cursor):
    try:
        cursor.execute("SHOW COLUMNS FROM PendingEmployees LIKE 'id'")
        if cursor.fetchone():
            return 'id'
        cursor.execute("SHOW COLUMNS FROM PendingEmployees LIKE 'pending_id'")
        if cursor.fetchone():
            return 'pending_id'
    except Error:
        return None
    return None

def email_exists_anywhere(cursor, email, exclude_pending_id=None):
    cursor.execute("SELECT 1 FROM Users WHERE email = %s LIMIT 1", (email,))
    if cursor.fetchone():
        return True

    pending_id_col = get_pending_id_column(cursor)
    if not pending_id_col:
        return False

    if exclude_pending_id is not None:
        query = f"SELECT 1 FROM PendingEmployees WHERE email = %s AND {pending_id_col} != %s LIMIT 1"
        cursor.execute(query, (email, exclude_pending_id))
    else:
        cursor.execute("SELECT 1 FROM PendingEmployees WHERE email = %s LIMIT 1", (email,))
    return cursor.fetchone() is not None

def make_password_hash(password):
    # Keep hash length compatible with Users.password varchar(100).
    return generate_password_hash(password, method='pbkdf2:sha256:260000', salt_length=8)

def wants_json_response():
    best = request.accept_mimetypes.best
    return (
        request.is_json
        or request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        or best == 'application/json'
        or request.accept_mimetypes['application/json'] >= request.accept_mimetypes['text/html']
    )

def ensure_attendance_status_column(conn):
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM Attendance LIKE 'status'")
        if not cursor.fetchone():
            alter_cursor = conn.cursor()
            alter_cursor.execute(
                "ALTER TABLE Attendance ADD COLUMN status ENUM('present', 'absent') NOT NULL DEFAULT 'present' AFTER date"
            )
            conn.commit()
            alter_cursor.close()
    finally:
        cursor.close()

def build_attendance_timeline(conn, user_id):
    from datetime import date, timedelta

    ensure_attendance_status_column(conn)
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT attendance_id, date, status FROM Attendance WHERE user_id = %s ORDER BY date ASC",
            (user_id,)
        )
        rows = cursor.fetchall()
        if not rows:
            return {
                "history": [],
                "days_present": 0,
                "days_absent": 0,
                "total_days": 0,
                "start_date": None,
            }

        attendance_by_date = {}
        for row in rows:
            attendance_by_date[row['date']] = {
                "attendance_id": row.get('attendance_id'),
                "status": row.get('status') or 'present',
            }

        start_date = rows[0]['date']
        today = date.today()
        history = []
        current_day = start_date
        synthetic_id = -1
        while current_day <= today:
            saved = attendance_by_date.get(current_day)
            if saved:
                history.append({
                    "attendance_id": saved["attendance_id"],
                    "date": current_day.strftime('%Y-%m-%d'),
                    "status": saved["status"],
                })
            else:
                history.append({
                    "attendance_id": synthetic_id,
                    "date": current_day.strftime('%Y-%m-%d'),
                    "status": "absent",
                })
                synthetic_id -= 1
            current_day += timedelta(days=1)

        history.reverse()
        days_present = sum(1 for record in history if record['status'] == 'present')
        total_days = len(history)
        days_absent = total_days - days_present
        return {
            "history": history,
            "days_present": days_present,
            "days_absent": days_absent,
            "total_days": total_days,
            "start_date": start_date.strftime('%Y-%m-%d') if start_date else None,
        }
    finally:
        cursor.close()

SUBSCRIPTION_PLAN_CONFIG = {
    'monthly': {
        'plan_code': 'monthly',
        'plan_name': 'Monthly',
        'duration_months': 1,
        'monthly_rate': 7500,
        'discount_percent': 0,
    },
    'quarterly': {
        'plan_code': 'quarterly',
        'plan_name': '3 Months',
        'duration_months': 3,
        'monthly_rate': 7500,
        'discount_percent': 10,
    },
    'half_yearly': {
        'plan_code': 'half_yearly',
        'plan_name': '6 Months',
        'duration_months': 6,
        'monthly_rate': 7500,
        'discount_percent': 20,
    },
    'yearly': {
        'plan_code': 'yearly',
        'plan_name': '1 Year',
        'duration_months': 12,
        'monthly_rate': 7500,
        'discount_percent': 35,
    },
}

def ensure_subscription_table(conn):
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MemberSubscriptions (
                subscription_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                plan_code VARCHAR(50) NOT NULL,
                plan_name VARCHAR(100) NOT NULL,
                duration_months INT NOT NULL,
                monthly_rate DECIMAL(10, 2) NOT NULL DEFAULT 7500,
                base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
                discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                final_plan_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                trainer_addon_enabled TINYINT(1) NOT NULL DEFAULT 0,
                trainer_id INT NULL,
                trainer_addon_monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                trainer_addon_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                status ENUM('active', 'terminated', 'expired') NOT NULL DEFAULT 'active',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                termination_reason VARCHAR(255) NULL,
                terminated_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_member_subscriptions_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                CONSTRAINT fk_member_subscriptions_trainer FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE SET NULL
            )
        """)
        conn.commit()
        cursor.execute("SHOW COLUMNS FROM MemberSubscriptions LIKE 'trainer_addon_monthly_price'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE MemberSubscriptions ADD COLUMN trainer_addon_monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER trainer_id"
            )
            conn.commit()
    finally:
        cursor.close()

def ensure_subscription_history_table(conn):
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MemberSubscriptionHistory (
                history_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action_type VARCHAR(30) NOT NULL,
                plan_code VARCHAR(50) NULL,
                plan_name VARCHAR(100) NULL,
                duration_months INT NULL,
                monthly_rate DECIMAL(10, 2) NOT NULL DEFAULT 7500,
                base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
                discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                final_plan_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                trainer_addon_enabled TINYINT(1) NOT NULL DEFAULT 0,
                trainer_id INT NULL,
                trainer_addon_monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                trainer_addon_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                status VARCHAR(20) NULL,
                start_date DATE NULL,
                end_date DATE NULL,
                note VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_member_subscription_history_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                CONSTRAINT fk_member_subscription_history_trainer FOREIGN KEY (trainer_id) REFERENCES Users(user_id) ON DELETE SET NULL
            )
        """)
        conn.commit()
    finally:
        cursor.close()

def add_months(date_value, months):
    year = date_value.year + ((date_value.month - 1 + months) // 12)
    month = ((date_value.month - 1 + months) % 12) + 1
    day = min(date_value.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    from datetime import date
    return date(year, month, day)

def serialize_subscription_row(row):
    if not row:
        return None
    serialized = dict(row)
    for field in ['start_date', 'end_date']:
        if serialized.get(field):
            serialized[field] = serialized[field].strftime('%Y-%m-%d')
    if serialized.get('created_at'):
        serialized['created_at'] = serialized['created_at'].isoformat(sep=' ')
    if serialized.get('terminated_at'):
        serialized['terminated_at'] = serialized['terminated_at'].isoformat(sep=' ')
    return serialized

def log_subscription_history(conn, user_id, action_type, payload):
    ensure_subscription_history_table(conn)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO MemberSubscriptionHistory (
                user_id, action_type, plan_code, plan_name, duration_months, monthly_rate, base_price,
                discount_percent, discount_amount, final_plan_price, trainer_addon_enabled, trainer_id,
                trainer_addon_monthly_price, trainer_addon_price, total_price, status, start_date, end_date, note
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            action_type,
            payload.get('plan_code'),
            payload.get('plan_name'),
            payload.get('duration_months'),
            payload.get('monthly_rate', 7500),
            payload.get('base_price', 0),
            payload.get('discount_percent', 0),
            payload.get('discount_amount', 0),
            payload.get('final_plan_price', 0),
            1 if payload.get('trainer_addon_enabled') else 0,
            payload.get('trainer_id'),
            payload.get('trainer_addon_monthly_price', 0),
            payload.get('trainer_addon_price', 0),
            payload.get('total_price', 0),
            payload.get('status'),
            payload.get('start_date'),
            payload.get('end_date'),
            payload.get('note'),
        ))
        conn.commit()
    finally:
        cursor.close()

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.json or request.form
        first_name = data.get('first_name') or data.get('firstName')
        last_name = data.get('last_name') or data.get('lastName')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        
        dob = data.get('dob')
        age = data.get('age')
        height = data.get('height')
        weight_value = data.get('weight')
        address = data.get('address')
        goal = data.get('goal')
        source = data.get('source')

        if not all([first_name, last_name, email, password, role]):
            if request.is_json:
                return jsonify({"error": "Missing required fields"}), 400
            return "Missing required fields", 400

        if not all([height, weight_value, age, address, goal]):
            if request.is_json:
                return jsonify({"error": "Missing member profile fields"}), 400
            return "Missing member profile fields", 400

        height_cm = float(height)
        weight = float(weight_value)
        
        height_m = height_cm / 100
        bmi = round(weight / (height_m * height_m), 2)
        
        conn = get_db_connection()
        if conn is not None:
            try:
                cursor = conn.cursor(dictionary=True)
                if email_exists_anywhere(cursor, email):
                    cursor.close()
                    conn.close()
                    if request.is_json:
                        return jsonify({"error": "Email already exists"}), 409
                    return "Email already exists", 409

                reg_no = generate_reg_no(role)
                hashed_password = make_password_hash(password)
                cursor = conn.cursor()
                query = """INSERT INTO Users 
                           (reg_no, first_name, last_name, email, password, role, 
                            age, height, weight, bmi, address, dob, goal, source) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                cursor.execute(query, (reg_no, first_name, last_name, email, hashed_password, role,
                                       age, height_cm, weight, bmi, address, dob, goal, source))
                conn.commit()
                
                cursor.close()
                conn.close()
                if request.is_json:
                    return jsonify({"message": "Registration successful"}), 201
                return redirect(url_for('login'))
            except Error as e:
                if request.is_json:
                    return jsonify({"error": f"Error registering user: {e}"}), 500
                return f"Error registering user: {e}"
    return render_template('register.html')

@app.route('/register-employee', methods=['POST'])
def register_employee():
    data = request.json or request.form
    first_name = data.get('first_name') or data.get('firstName')
    last_name = data.get('last_name') or data.get('lastName')
    email = data.get('email')
    password = data.get('password')
    role = (data.get('role') or '').lower()

    if not all([first_name, last_name, email, password, role]):
        return jsonify({"error": "Missing required fields"}), 400
    if role not in ['trainer', 'admin']:
        return jsonify({"error": "Invalid role. Allowed: trainer/admin"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        if email_exists_anywhere(cursor, email):
            return jsonify({"error": "Email already exists"}), 409

        pending_id_col = get_pending_id_column(cursor)
        if not pending_id_col:
            return jsonify({"error": "PendingEmployees table is missing id/pending_id column"}), 500

        hashed_password = make_password_hash(password)
        query = """
            INSERT INTO PendingEmployees (first_name, last_name, email, password, role)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (first_name, last_name, email, hashed_password, role))
        conn.commit()
        return jsonify({"message": "Employee application submitted for owner approval"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.json or request.form
        email = data.get('email')
        password = data.get('password')
        conn = get_db_connection()
        if conn is not None:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
                user = cursor.fetchone()
                cursor.close()
                conn.close()
                
                if user:
                    stored_password = user.get('password')
                    valid_password = False
                    if stored_password:
                        valid_password = check_password_hash(stored_password, password) or stored_password == password
                    if not valid_password:
                        if request.is_json:
                            return jsonify({"error": "Invalid credentials"}), 401
                        return "Invalid credentials. <br><br> <a href='/login'>Try again</a>"

                    # Restrict unapproved users from logging in (members, trainers, admins)
                    member_status = user.get('membership_status', '') or 'pending'
                    if user.get('role', 'member').lower() != 'owner' and member_status.lower() == 'pending':
                        if request.is_json:
                            return jsonify({"error": "Account not yet approved by Owner/Admin. Please wait for authorization."}), 403
                        return "Account not yet approved by Owner/Admin. Please wait for authorization."

                    # Authenticate User with Sessions
                    session['user_id'] = user.get('user_id', user.get('id'))
                    session['role'] = user.get('role', 'member').lower()
                    session['first_name'] = user['first_name']
                    session['last_name'] = user.get('last_name', '')
                    
                    role = session['role']

                    # Check if admin has elevated (owner-level) privileges
                    elevated = False
                    if role == 'admin':
                        try:
                            priv_conn = get_db_connection()
                            if priv_conn:
                                ensure_admin_privileges_table(priv_conn)
                                priv_cursor = priv_conn.cursor(dictionary=True)
                                priv_cursor.execute(
                                    """SELECT grant_type, expiry_date FROM AdminPrivileges
                                       WHERE user_id = %s""",
                                    (session['user_id'],)
                                )
                                priv = priv_cursor.fetchone()
                                priv_cursor.close()
                                priv_conn.close()
                                if priv:
                                    if priv['grant_type'] == 'permanent':
                                        elevated = True
                                    elif priv['expiry_date'] and priv['expiry_date'] > datetime.datetime.now():
                                        elevated = True
                        except Exception:
                            pass
                    session['elevated'] = elevated
                    
                    if request.is_json:
                        return jsonify({
                            'id': str(session['user_id']),
                            'role': role,
                            'email': user['email'],
                            'firstName': user['first_name'],
                            'lastName': user['last_name'],
                            'elevated': elevated,
                        }), 200

                        
                    if role in ['owner', 'admin']:
                        return redirect(url_for('admin'))
                    elif role == 'trainer':
                        return redirect(url_for('trainer'))
                    else:
                        return redirect(url_for('dashboard'))
                else:
                    if request.is_json: return jsonify({"error": "Invalid credentials"}), 401
                    return "Invalid credentials. <br><br> <a href='/login'>Try again</a>"
            except Error as e:
                if request.is_json: return jsonify({"error": str(e)}), 500
                return f"Error during login query: {e}"
        if request.is_json: return jsonify({"error": "Database connection failed"}), 500
        return "Database connection failed"
    return render_template('login.html')

@app.route('/pending-employees', methods=['GET'])
def pending_employees():
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        pending_id_col = get_pending_id_column(cursor)
        if not pending_id_col:
            return jsonify({"error": "PendingEmployees table is missing id/pending_id column"}), 500

        cursor.execute(f"SELECT * FROM PendingEmployees ORDER BY {pending_id_col} DESC")
        rows = cursor.fetchall()

        normalized = []
        for row in rows:
            normalized.append({
                "id": row.get('id') if row.get('id') is not None else row.get('pending_id'),
                "first_name": row.get('first_name'),
                "last_name": row.get('last_name'),
                "email": row.get('email'),
                "role": row.get('role')
            })
        return jsonify({"pending_employees": normalized}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/approve-employee/<int:employee_id>', methods=['POST'])
def approve_employee(employee_id):
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        pending_id_col = get_pending_id_column(cursor)
        if not pending_id_col:
            return jsonify({"error": "PendingEmployees table is missing id/pending_id column"}), 500

        cursor.execute(f"SELECT * FROM PendingEmployees WHERE {pending_id_col} = %s", (employee_id,))
        pending_employee = cursor.fetchone()
        if not pending_employee:
            return jsonify({"error": "Pending employee not found"}), 404

        required = ['first_name', 'last_name', 'email', 'password', 'role']
        if any(not pending_employee.get(field) for field in required):
            return jsonify({"error": "Pending employee has incomplete data"}), 400

        role = (pending_employee.get('role') or '').lower()
        if role not in ['trainer', 'admin']:
            return jsonify({"error": "Invalid pending employee role"}), 400

        if email_exists_anywhere(cursor, pending_employee['email'], exclude_pending_id=employee_id):
            return jsonify({"error": "Duplicate email found"}), 409

        reg_no = generate_reg_no(role)
        if not reg_no:
            return jsonify({"error": "Failed to generate registration number"}), 500

        password_value = pending_employee['password']
        stored_password = password_value if str(password_value).startswith('pbkdf2:') else make_password_hash(password_value)

        insert_query = """
            INSERT INTO Users (reg_no, first_name, last_name, email, password, role, membership_status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
        """
        cursor.execute(insert_query, (
            reg_no,
            pending_employee['first_name'],
            pending_employee['last_name'],
            pending_employee['email'],
            stored_password,
            role
        ))

        cursor.execute(f"DELETE FROM PendingEmployees WHERE {pending_id_col} = %s", (employee_id,))
        conn.commit()
        return jsonify({"message": "Employee approved successfully"}), 200
    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/reject-employee/<int:employee_id>', methods=['DELETE'])
def reject_employee(employee_id):
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        pending_id_col = get_pending_id_column(cursor)
        if not pending_id_col:
            return jsonify({"error": "PendingEmployees table is missing id/pending_id column"}), 500

        cursor.execute(f"SELECT {pending_id_col} FROM PendingEmployees WHERE {pending_id_col} = %s", (employee_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Pending employee not found"}), 404

        cursor.execute(f"DELETE FROM PendingEmployees WHERE {pending_id_col} = %s", (employee_id,))
        conn.commit()
        return jsonify({"message": "Employee rejected successfully"}), 200
    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    if request.is_json or request.method == 'POST':
        return jsonify({"message": "Logged out"}), 200
    return redirect(url_for('login'))

# --- ROLE SPECIFIC DASHBOARDS ---

@app.route('/admin')
def admin():
    if session.get('role') not in ['admin', 'owner']: return "Access Denied", 403
    return render_template('admin.html')

@app.route('/trainer')
def trainer():
    if session.get('role') != 'trainer': return "Access Denied", 403
    
    conn = get_db_connection()
    assigned_members = []
    if conn:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT u.user_id, u.reg_no, u.first_name, u.last_name, u.email, u.goal, u.membership_status
            FROM Users u 
            WHERE u.trainer_id = %s AND u.role = 'member'
        """
        cursor.execute(query, (session['user_id'],))
        assigned_members = cursor.fetchall()
        
        # Fetch schedules for trainer
        cursor.execute("SELECT s.schedule_id, s.date, s.time, s.status, m.first_name as member_name FROM Schedule s JOIN Users m ON s.user_id = m.user_id WHERE s.trainer_id = %s ORDER BY s.date, s.time", (session['user_id'],))
        trainer_schedules = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
    return render_template('trainer.html', members=assigned_members, schedules=trainer_schedules)

@app.route('/update-workout/<int:user_id>', methods=['GET', 'POST'])
def update_workout(user_id):
    if session.get('role') != 'trainer': return "Access Denied", 403
    conn = get_db_connection()
    if not conn: return "DB Error"
    
    if request.method == 'POST':
        workout_details = request.form.get('workout_details')
        suggestion = request.form.get('suggestion')
        cursor = conn.cursor()
        query = """
            INSERT INTO WorkoutPlan (user_id, workout_details, suggestion) 
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE workout_details = VALUES(workout_details), suggestion = VALUES(suggestion)
        """
        cursor.execute(query, (user_id, workout_details, suggestion))
        conn.commit()
        cursor.close()
        conn.close()
        return redirect(url_for('trainer'))
        
    # GET method: fetch existing if available
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT workout_details, suggestion FROM WorkoutPlan WHERE user_id = %s", (user_id,))
    plan = cursor.fetchone()
    
    cursor.execute("SELECT first_name, last_name FROM Users WHERE user_id = %s", (user_id,))
    member = cursor.fetchone()
    
    cursor.close()
    conn.close()
    return render_template('update_workout.html', plan=plan, member=member, member_id=user_id)

@app.route('/update-meal/<int:user_id>', methods=['GET', 'POST'])
def update_meal(user_id):
    if session.get('role') != 'trainer': return "Access Denied", 403
    conn = get_db_connection()
    if not conn: return "DB Error"
    
    if request.method == 'POST':
        meal_details = request.form.get('meal_details')
        cursor = conn.cursor()
        query = """
            INSERT INTO MealPlan (user_id, meal_details) 
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE meal_details = VALUES(meal_details)
        """
        cursor.execute(query, (user_id, meal_details))
        conn.commit()
        cursor.close()
        conn.close()
        return redirect(url_for('trainer'))
        
    # GET method
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT meal_details FROM MealPlan WHERE user_id = %s", (user_id,))
    plan = cursor.fetchone()
    
    cursor.execute("SELECT first_name, last_name FROM Users WHERE user_id = %s", (user_id,))
    member = cursor.fetchone()
    
    cursor.close()
    conn.close()
    return render_template('update_meal.html', plan=plan, member=member, member_id=user_id)

@app.route('/api/trainer/members', methods=['GET'])
def api_trainer_members():
    if session.get('role') != 'trainer':
        return jsonify({"error": "Access Denied"}), 403
        
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT u.user_id as id, u.reg_no, u.first_name, u.last_name, u.email, u.goal, u.membership_status,
                   wp.workout_details, wp.suggestion, mp.meal_details
            FROM Users u 
            LEFT JOIN WorkoutPlan wp ON u.user_id = wp.user_id
            LEFT JOIN MealPlan mp ON u.user_id = mp.user_id
            WHERE u.trainer_id = %s AND u.role = 'member'
        """
        cursor.execute(query, (session['user_id'],))
        assigned_members = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Calculate progress mock or fetch from DB if progress exists
        for m in assigned_members:
            m['progress'] = 0 # Can be calculated from Progress table if needed
            m['name'] = f"{m.get('first_name','')} {m.get('last_name','')}".strip()
            m['regNo'] = m.get('reg_no')
            
        return jsonify({"members": assigned_members})
    return jsonify({"error": "DB connection failed"}), 500

@app.route('/api/trainer/workout/<int:user_id>', methods=['POST'])
def api_update_workout(user_id):
    if session.get('role') != 'trainer':
        return jsonify({"error": "Access Denied"}), 403
        
    data = request.json or request.form
    workout_details = data.get('workout_details')
    suggestion = data.get('suggestion')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        query = """
            INSERT INTO WorkoutPlan (user_id, workout_details, suggestion) 
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE workout_details = VALUES(workout_details), suggestion = VALUES(suggestion)
        """
        cursor.execute(query, (user_id, workout_details, suggestion))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Workout plan updated"})
    return jsonify({"error": "DB connection failed"}), 500

@app.route('/api/trainer/meal/<int:user_id>', methods=['POST'])
def api_update_meal(user_id):
    if session.get('role') != 'trainer':
        return jsonify({"error": "Access Denied"}), 403
        
    data = request.json or request.form
    meal_details = data.get('meal_details')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        query = """
            INSERT INTO MealPlan (user_id, meal_details) 
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE meal_details = VALUES(meal_details)
        """
        cursor.execute(query, (user_id, meal_details))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Meal plan updated"})
    return jsonify({"error": "DB connection failed"}), 500

@app.route('/api/member/plans', methods=['GET'])
def api_member_plans():
    if session.get('role') != 'member':
        return jsonify({"error": "Access Denied"}), 403
        
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT workout_details, suggestion FROM WorkoutPlan WHERE user_id = %s", (session['user_id'],))
        workout = cursor.fetchone()
        
        cursor.execute("SELECT meal_details FROM MealPlan WHERE user_id = %s", (session['user_id'],))
        meal = cursor.fetchone()
        
        cursor.close()
        conn.close()
        return jsonify({
            "workout": workout,
            "meal": meal
        })
    return jsonify({"error": "DB connection failed"}), 500

@app.route('/dashboard')
def dashboard():
    if session.get('role') != 'member': return "Access Denied", 403
    
    conn = get_db_connection()
    user_data = None
    workout_data = None
    meal_data = None
    payment_data = None
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Users WHERE user_id = %s", (session['user_id'],))
        user_data = cursor.fetchone()
        
        cursor.execute("SELECT * FROM WorkoutPlan WHERE user_id = %s", (session['user_id'],))
        workout_data = cursor.fetchone()
        
        cursor.execute("SELECT * FROM MealPlan WHERE user_id = %s", (session['user_id'],))
        meal_data = cursor.fetchone()
        
        cursor.execute("SELECT * FROM Payment WHERE user_id = %s ORDER BY payment_date DESC LIMIT 1", (session['user_id'],))
        payment_data = cursor.fetchone()
        
        # Fetch schedules for member
        cursor.execute("SELECT s.schedule_id, s.date, s.time, s.status, t.first_name as trainer_name FROM Schedule s JOIN Users t ON s.trainer_id = t.user_id WHERE s.user_id = %s ORDER BY s.date, s.time", (session['user_id'],))
        schedules_data = cursor.fetchall()
        
        # Fetch badges
        cursor.execute("SELECT badge_name, date_awarded FROM Badges WHERE user_id = %s ORDER BY date_awarded DESC", (session['user_id'],))
        badges_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
    return render_template('dashboard.html', user=user_data, workout=workout_data, meal=meal_data, payment=payment_data, schedules=schedules_data, badges=badges_data)


# --- NEW ADMIN CAPABILITIES ---

@app.route('/add-member', methods=['GET', 'POST'])
def add_member():
    if session.get('role') not in ['admin', 'owner']:
        if wants_json_response():
            return jsonify({"error": "Access Denied"}), 403
        return "Access Denied", 403
        
    if request.method == 'POST':
        data = request.json or request.form
        conn = get_db_connection()
        if conn:
            from datetime import date, datetime, timedelta

            def parse_date(value):
                if not value:
                    return None
                if isinstance(value, date):
                    return value
                return datetime.strptime(str(value), '%Y-%m-%d').date()

            first_name = data.get('first_name') or data.get('firstName')
            last_name = data.get('last_name') or data.get('lastName')
            email = data.get('email')
            password = data.get('password')
            price = float(data.get('price') or 0)
            height_val = data.get('height')
            weight_val = data.get('weight')
            address = data.get('address')
            dob = data.get('dob')
            goal = data.get('goal')
            source = data.get('source')
            membership_status = (data.get('membership_status') or 'active').lower()
            trainer_id = data.get('trainer_id') or None
            join_date = parse_date(data.get('join_date')) or date.today()
            expiry_date = parse_date(data.get('expiry_date'))
            duration_days = int(data.get('duration') or data.get('duration_days') or 30)

            if not all([first_name, last_name, email, password]):
                return jsonify({"error": "first_name, last_name, email, and password are required"}), 400

            if expiry_date is None:
                expiry_date = join_date + timedelta(days=duration_days)

            age = data.get('age')
            if not age and dob:
                dob_date = parse_date(dob)
                if dob_date:
                    age = join_date.year - dob_date.year - ((join_date.month, join_date.day) < (dob_date.month, dob_date.day))

            height_cm = float(height_val) if height_val not in [None, ''] else None
            weight = float(weight_val) if weight_val not in [None, ''] else None
            bmi = None
            if height_cm and weight:
                height_m = height_cm / 100
                bmi = round(weight / (height_m * height_m), 2)

            try:
                hashed_password = make_password_hash(password)
                cursor = conn.cursor(dictionary=True)
                if email_exists_anywhere(cursor, email):
                    return jsonify({"error": "Email already exists"}), 409

                reg_no = generate_reg_no('member')
                insert_cursor = conn.cursor()
                query = """INSERT INTO Users 
                           (reg_no, first_name, last_name, email, password, role, membership_status, join_date, expiry_date, price,
                            age, height, weight, bmi, address, dob, goal, source, trainer_id) 
                           VALUES (%s, %s, %s, %s, %s, 'member', %s, %s, %s, %s,
                                   %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                insert_cursor.execute(query, (
                    reg_no,
                    first_name,
                    last_name,
                    email,
                    hashed_password,
                    membership_status,
                    join_date,
                    expiry_date,
                    price,
                    age,
                    height_cm,
                    weight,
                    bmi,
                    address,
                    dob or None,
                    goal,
                    source,
                    None if trainer_id in ['', 'None', None, 'Unassigned'] else trainer_id
                ))
                conn.commit()
                new_member_id = insert_cursor.lastrowid
                insert_cursor.close()
                cursor.close()
                conn.close()
                if wants_json_response():
                    return jsonify({
                        "message": "Member added successfully",
                        "member_id": new_member_id,
                        "reg_no": reg_no
                    }), 201
                return redirect(url_for('members'))
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
            except Error as e:
                conn.rollback()
                return jsonify({"error": str(e)}), 500
            finally:
                if conn.is_connected():
                    conn.close()
    return render_template('add_member.html')

@app.route('/members')
def members():
    if session.get('role') not in ['admin', 'owner']: return "Access Denied", 403
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        search_query = request.args.get('search', '')
        membership_status = request.args.get('membership_status', '')
        trainer_id = request.args.get('trainer_id', '')
        expiry_date = request.args.get('expiry_date', '')
        
        base_query = """
            SELECT u.user_id as id, u.reg_no, u.first_name, u.last_name, u.email, u.membership_status, 
                   COALESCE(ms.start_date, u.join_date) as join_date, 
                   COALESCE(ms.end_date, u.expiry_date) as expiry_date, 
                   COALESCE(ms.total_price, u.price) as price, u.trainer_id,
                   t.first_name as trainer_name, t.last_name as trainer_last_name,
                   u.age, u.height, u.weight, u.bmi, u.address, u.dob, u.goal, u.source,
                   COALESCE(ms.trainer_addon_enabled, 0) as trainer_addon_enabled
            FROM Users u 
            LEFT JOIN Users t ON u.trainer_id = t.user_id 
            LEFT JOIN MemberSubscriptions ms ON u.user_id = ms.user_id AND ms.status = 'active'
            WHERE u.role = 'member'
        """
        params = []
        if search_query:
            base_query += " AND (u.first_name LIKE %s OR u.email LIKE %s OR u.reg_no LIKE %s)"
            like_val = f"%{search_query}%"
            params.extend([like_val, like_val, like_val])
            
        if membership_status:
            base_query += " AND u.membership_status = %s"
            params.append(membership_status)
            
        if trainer_id:
            base_query += " AND u.trainer_id = %s"
            params.append(trainer_id)
            
        if expiry_date:
            base_query += " AND u.expiry_date = %s"
            params.append(expiry_date)
            
        cursor.execute(base_query, tuple(params))
        members_list = cursor.fetchall()
        
        cursor.execute("SELECT user_id, first_name, last_name FROM Users WHERE role = 'trainer'")
        trainers_list = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Calculate remaining days from today (negative = future plan, positive = active)
        from datetime import date
        today = date.today()
        for m in members_list:
            if m.get('expiry_date'):
                diff = (m['expiry_date'] - today).days
                m['remaining_days'] = diff  # keep negative for future plans
            else:
                m['remaining_days'] = 'N/A'
                
        if wants_json_response():
            return jsonify({"members": members_list, "trainers": trainers_list})
                
        return render_template('members.html', members=members_list, trainers=trainers_list, search=search_query, membership_status=membership_status, trainer_id=trainer_id, expiry_date=expiry_date)
    
    if wants_json_response(): return jsonify({"error": "DB Connection failed"}), 500
    return "DB Connection failed"

@app.route('/employees')
def employees():
    if session.get('role') not in ['admin', 'owner']: return "Access Denied", 403
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        search_query = request.args.get('search', '')
        membership_status = request.args.get('membership_status', '')
        role = request.args.get('role', '')
        
        base_query = """
            SELECT user_id as id, reg_no, first_name, last_name, email, membership_status, 
                   join_date, role
            FROM Users 
            WHERE role IN ('trainer', 'admin')
        """
        params = []
        if search_query:
            base_query += " AND (first_name LIKE %s OR email LIKE %s OR reg_no LIKE %s)"
            like_val = f"%{search_query}%"
            params.extend([like_val, like_val, like_val])
            
        if membership_status:
            base_query += " AND membership_status = %s"
            params.append(membership_status)
            
        if role:
            base_query += " AND role = %s"
            params.append(role)
            
        cursor.execute(base_query, tuple(params))
        employees_list = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        if request.is_json:
            return jsonify({"employees": employees_list})
                
        return render_template('members.html', members=employees_list)
    
    if request.is_json: return jsonify({"error": "DB Connection failed"}), 500
    return "DB Connection failed"

@app.route('/employees-with-pending', methods=['GET'])
def employees_with_pending():
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        search_query = request.args.get('search', '').strip().lower()
        role_filter = request.args.get('role', '').strip().lower()
        status_filter = request.args.get('status', '').strip().lower()

        cursor.execute("""
            SELECT user_id as id, reg_no, first_name, last_name, email, role, membership_status, join_date
            FROM Users
            WHERE role IN ('trainer', 'admin')
            ORDER BY user_id DESC
        """)
        approved_rows = cursor.fetchall()
        approved = []
        for row in approved_rows:
            approved.append({
                "id": row.get("id"),
                "reg_no": row.get("reg_no"),
                "first_name": row.get("first_name"),
                "last_name": row.get("last_name"),
                "email": row.get("email"),
                "role": row.get("role"),
                "status": "active",
                "source": "users",
                "join_date": row.get("join_date")
            })

        pending_id_col = get_pending_id_column(cursor)
        pending = []
        if pending_id_col:
            cursor.execute(f"""
                SELECT {pending_id_col} as id, first_name, last_name, email, role
                FROM PendingEmployees
                ORDER BY {pending_id_col} DESC
            """)
            pending_rows = cursor.fetchall()
            for row in pending_rows:
                pending.append({
                    "id": row.get("id"),
                    "reg_no": f"PEND-{row.get('id')}",
                    "first_name": row.get("first_name"),
                    "last_name": row.get("last_name"),
                    "email": row.get("email"),
                    "role": row.get("role"),
                    "status": "pending",
                    "source": "pending",
                    "join_date": None
                })

        combined = approved + pending

        if search_query:
            combined = [
                e for e in combined
                if search_query in f"{(e.get('first_name') or '')} {(e.get('last_name') or '')}".lower()
                or search_query in (e.get('email') or '').lower()
                or search_query in (e.get('reg_no') or '').lower()
            ]
        if role_filter and role_filter != 'all':
            combined = [e for e in combined if (e.get('role') or '').lower() == role_filter]
        if status_filter and status_filter != 'all':
            combined = [e for e in combined if (e.get('status') or '').lower() == status_filter]

        return jsonify({"employees": combined}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/delete-member/<int:user_id>', methods=['DELETE'])
def delete_member(user_id):
    if session.get('role') not in ['admin', 'owner']: 
        if request.is_json: return jsonify({"error": "Access Denied"}), 403
        return "Access Denied", 403
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Users WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Member successfully deleted"}), 200
    return jsonify({"error": "DB Error"}), 500

@app.route('/update-member/<int:user_id>', methods=['POST'])
def update_member(user_id):
    if session.get('role') not in ['admin', 'owner']: 
        if wants_json_response(): return jsonify({"error": "Access Denied"}), 403
        return "Access Denied", 403
    conn = get_db_connection()
    if conn:
        data = request.json or request.form
        cursor = conn.cursor(dictionary=True)

        try:
            cursor.execute("SELECT email, height, weight FROM Users WHERE user_id = %s AND role = 'member'", (user_id,))
            existing_member = cursor.fetchone()
            if not existing_member:
                return jsonify({"error": "Member not found"}), 404

            updates = []
            params = []

            field_map = {
                'first_name': ['first_name', 'firstName'],
                'last_name': ['last_name', 'lastName'],
                'email': ['email'],
                'membership_status': ['membership_status'],
                'price': ['price'],
                'join_date': ['join_date'],
                'expiry_date': ['expiry_date'],
                'age': ['age'],
                'height': ['height'],
                'weight': ['weight'],
                'address': ['address'],
                'dob': ['dob'],
                'goal': ['goal'],
                'source': ['source'],
            }

            for db_field, aliases in field_map.items():
                for alias in aliases:
                    if alias in data:
                        updates.append(f"{db_field} = %s")
                        value = data.get(alias)
                        params.append(value or None if db_field in ['join_date', 'expiry_date', 'dob', 'address', 'goal', 'source'] else value)
                        break

            if 'trainer_id' in data:
                tid = data.get('trainer_id')
                updates.append("trainer_id = %s")
                params.append(None if tid in ['', 'None', None, 'Unassigned'] else tid)

            next_height = float(data.get('height')) if data.get('height') not in [None, ''] else existing_member.get('height')
            next_weight = float(data.get('weight')) if data.get('weight') not in [None, ''] else existing_member.get('weight')
            if next_height and next_weight:
                height_m = next_height / 100
                bmi = round(next_weight / (height_m * height_m), 2)
                updates.append("bmi = %s")
                params.append(bmi)

            next_email = data.get('email')
            if next_email and next_email != existing_member.get('email'):
                email_cursor = conn.cursor(dictionary=True)
                if email_exists_anywhere(email_cursor, next_email):
                    email_cursor.close()
                    return jsonify({"error": "Email already exists"}), 409
                email_cursor.close()

            if updates:
                params.append(user_id)
                query = f"UPDATE Users SET {', '.join(updates)} WHERE user_id = %s"
                execute_cursor = conn.cursor()
                execute_cursor.execute(query, tuple(params))
                conn.commit()
                execute_cursor.close()
        except ValueError:
            return jsonify({"error": "Invalid numeric value provided"}), 400
        except Error as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
        if wants_json_response(): return jsonify({"message": "Updated successfully"}), 200
        return redirect(url_for('members'))
    if wants_json_response(): return jsonify({"error": "DB Error"}), 500
    return redirect(url_for('members'))

# --- PAYMENT MODULE ---

@app.route('/add-payment', methods=['GET', 'POST'])
def add_payment():
    if session.get('role') not in ['admin', 'owner']: return "Access Denied", 403
    conn = get_db_connection()
    if not conn: return "DB Error"
    
    if request.method == 'POST':
        user_id = request.form.get('user_id')
        amount = request.form.get('amount')
        
        cursor = conn.cursor()
        cursor.execute("INSERT INTO Payment (user_id, amount, payment_mode, payment_status) VALUES (%s, %s, 'offline', 'success')", (user_id, amount))
        cursor.execute("UPDATE Users SET membership_status = 'active' WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return redirect(url_for('payments_history'))
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, first_name, last_name, reg_no FROM Users WHERE role = 'member'")
    members_list = cursor.fetchall()
    cursor.close()
    conn.close()
    return render_template('add_payment.html', members=members_list)

@app.route('/payments')
def payments_history():
    if session.get('role') not in ['admin', 'owner']: return "Access Denied", 403
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT p.payment_id, p.amount, p.payment_mode, p.payment_status, p.payment_date,
                   u.first_name, u.last_name, u.reg_no
            FROM Payment p
            JOIN Users u ON p.user_id = u.user_id
            ORDER BY p.payment_date DESC
        """
        cursor.execute(query)
        payments_list = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('payments.html', payments=payments_list)
    return "DB Connection failed"

@app.route('/pay', methods=['POST'])
def simulate_online_payment():
    if session.get('role') != 'member': return "Access Denied", 403
    amount = request.form.get('amount', 50)
    user_id = session['user_id']
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO Payment (user_id, amount, payment_mode, payment_status) VALUES (%s, %s, 'online', 'success')", (user_id, amount))
        cursor.execute("UPDATE Users SET membership_status = 'active' WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
    return redirect(url_for('dashboard'))

@app.route('/member-details/<int:user_id>')
def member_details(user_id):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT u.user_id as id, u.reg_no, u.first_name, u.last_name, u.email, u.membership_status, 
                   COALESCE(ms.start_date, u.join_date) as join_date, 
                   COALESCE(ms.end_date, u.expiry_date) as expiry_date, 
                   COALESCE(ms.total_price, u.price) as price, u.trainer_id,
                   t.first_name as trainer_first, t.last_name as trainer_last,
                   u.age, u.height, u.weight, u.bmi, u.address, u.dob, u.goal, u.source
            FROM Users u
            LEFT JOIN Users t ON u.trainer_id = t.user_id
            LEFT JOIN MemberSubscriptions ms ON u.user_id = ms.user_id AND ms.status = 'active'
            WHERE u.user_id = %s AND u.role = 'member'
        """
        cursor.execute(query, (user_id,))
        details = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if details:
            # Always return JSON for API requests
            from datetime import date
            if details.get('expiry_date'):
                remaining = (details['expiry_date'] - date.today()).days
                details['remaining_days'] = max(0, remaining)
            else:
                details['remaining_days'] = 'N/A'
            return jsonify(details)
    return jsonify({"error": "Member details not found"}), 404

@app.route('/subscription-config', methods=['GET'])
def subscription_config():
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_subscription_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT user_id, first_name, last_name, email
            FROM Users
            WHERE role = 'trainer'
            ORDER BY first_name, last_name
        """)
        trainers = cursor.fetchall()
        plans = []
        for plan in SUBSCRIPTION_PLAN_CONFIG.values():
            base_price = plan['monthly_rate'] * plan['duration_months']
            discount_amount = round((base_price * plan['discount_percent']) / 100, 2)
            final_price = round(base_price - discount_amount, 2)
            plans.append({
                **plan,
                'base_price': base_price,
                'discount_amount': discount_amount,
                'final_price': final_price,
                'trainer_addon_note': 'Personal trainer add-on covers 2 hours and pricing depends on the selected trainer.',
            })
        return jsonify({'plans': plans, 'trainers': trainers}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/subscriptions', methods=['GET'])
def subscriptions():
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_subscription_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                u.user_id AS member_id,
                u.reg_no,
                u.first_name,
                u.last_name,
                u.email,
                u.membership_status,
                ms.subscription_id,
                ms.plan_code,
                ms.plan_name,
                ms.duration_months,
                ms.monthly_rate,
                ms.base_price,
                ms.discount_percent,
                ms.discount_amount,
                ms.final_plan_price,
                ms.trainer_addon_enabled,
                ms.trainer_id,
                ms.trainer_addon_monthly_price,
                ms.trainer_addon_price,
                ms.total_price,
                ms.status AS subscription_status,
                ms.start_date,
                ms.end_date,
                ms.termination_reason,
                ms.terminated_at,
                t.first_name AS trainer_first_name,
                t.last_name AS trainer_last_name
            FROM Users u
            LEFT JOIN MemberSubscriptions ms ON ms.user_id = u.user_id
            LEFT JOIN Users t ON t.user_id = ms.trainer_id
            WHERE u.role = 'member'
            ORDER BY u.user_id DESC
        """)
        rows = cursor.fetchall()
        subscriptions_payload = []
        for row in rows:
            serialized = serialize_subscription_row(row)
            trainer_name = None
            if row.get('trainer_first_name') or row.get('trainer_last_name'):
                trainer_name = f"{row.get('trainer_first_name') or ''} {row.get('trainer_last_name') or ''}".strip()
            serialized['trainer_name'] = trainer_name
            subscriptions_payload.append(serialized)
        return jsonify({'subscriptions': subscriptions_payload}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/subscriptions/member/<int:user_id>', methods=['GET'])
def subscription_member_details(user_id):
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_subscription_table(conn)
        ensure_subscription_history_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT user_id AS member_id, reg_no, first_name, last_name, email, membership_status
            FROM Users
            WHERE user_id = %s AND role = 'member'
        """, (user_id,))
        member = cursor.fetchone()
        if not member:
            return jsonify({"error": "Member not found"}), 404

        cursor.execute("""
            SELECT ms.*, t.first_name AS trainer_first_name, t.last_name AS trainer_last_name
            FROM MemberSubscriptions ms
            LEFT JOIN Users t ON t.user_id = ms.trainer_id
            WHERE ms.user_id = %s
        """, (user_id,))
        current_subscription = cursor.fetchone()
        current_payload = serialize_subscription_row(current_subscription) if current_subscription else None
        if current_payload and (current_subscription.get('trainer_first_name') or current_subscription.get('trainer_last_name')):
            current_payload['trainer_name'] = f"{current_subscription.get('trainer_first_name') or ''} {current_subscription.get('trainer_last_name') or ''}".strip()

        cursor.execute("""
            SELECT h.*, t.first_name AS trainer_first_name, t.last_name AS trainer_last_name
            FROM MemberSubscriptionHistory h
            LEFT JOIN Users t ON t.user_id = h.trainer_id
            WHERE h.user_id = %s
            ORDER BY h.created_at DESC, h.history_id DESC
        """, (user_id,))
        history_rows = cursor.fetchall()
        history_payload = []
        for row in history_rows:
            serialized = serialize_subscription_row(row)
            if row.get('trainer_first_name') or row.get('trainer_last_name'):
                serialized['trainer_name'] = f"{row.get('trainer_first_name') or ''} {row.get('trainer_last_name') or ''}".strip()
            history_payload.append(serialized)

        return jsonify({
            "member": member,
            "current_subscription": current_payload,
            "history": history_payload,
        }), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/subscriptions/<int:user_id>', methods=['POST'])
def save_subscription(user_id):
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    data = request.json or request.form
    plan_code = (data.get('plan_code') or '').lower()
    plan = SUBSCRIPTION_PLAN_CONFIG.get(plan_code)
    if not plan:
        return jsonify({"error": "Invalid subscription plan"}), 400

    trainer_addon_enabled = str(data.get('trainer_addon_enabled')).lower() in ['true', '1', 'yes']
    trainer_id = data.get('trainer_id') if trainer_addon_enabled else None
    trainer_addon_monthly_price = float(data.get('trainer_addon_monthly_price') or data.get('trainer_addon_price') or 0)
    termination_reason = data.get('termination_reason')
    action_type = (data.get('action_type') or 'purchase').lower()

    from datetime import datetime
    start_date_raw = data.get('start_date')
    start_date = datetime.strptime(start_date_raw, '%Y-%m-%d').date() if start_date_raw else datetime.today().date()
    end_date = add_months(start_date, plan['duration_months'])
    base_price = plan['monthly_rate'] * plan['duration_months']
    discount_amount = round((base_price * plan['discount_percent']) / 100, 2)
    final_plan_price = round(base_price - discount_amount, 2)
    trainer_addon_total_price = round((trainer_addon_monthly_price * plan['duration_months']) if trainer_addon_enabled else 0, 2)
    total_price = round(final_plan_price + trainer_addon_total_price, 2)

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_subscription_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id FROM Users WHERE user_id = %s AND role = 'member'", (user_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Member not found"}), 404

        cursor.execute("SELECT subscription_id FROM MemberSubscriptions WHERE user_id = %s", (user_id,))
        existing = cursor.fetchone()

        write_cursor = conn.cursor()
        if existing:
            write_cursor.execute("""
                UPDATE MemberSubscriptions
                SET plan_code = %s,
                    plan_name = %s,
                    duration_months = %s,
                    monthly_rate = %s,
                    base_price = %s,
                    discount_percent = %s,
                    discount_amount = %s,
                    final_plan_price = %s,
                    trainer_addon_enabled = %s,
                    trainer_id = %s,
                    trainer_addon_monthly_price = %s,
                    trainer_addon_price = %s,
                    total_price = %s,
                    status = 'active',
                    start_date = %s,
                    end_date = %s,
                    termination_reason = %s,
                    terminated_at = NULL
                WHERE user_id = %s
            """, (
                plan['plan_code'],
                plan['plan_name'],
                plan['duration_months'],
                plan['monthly_rate'],
                base_price,
                plan['discount_percent'],
                discount_amount,
                final_plan_price,
                1 if trainer_addon_enabled else 0,
                trainer_id,
                trainer_addon_monthly_price if trainer_addon_enabled else 0,
                trainer_addon_total_price,
                total_price,
                start_date,
                end_date,
                termination_reason,
                user_id,
            ))
        else:
            write_cursor.execute("""
                INSERT INTO MemberSubscriptions (
                    user_id, plan_code, plan_name, duration_months, monthly_rate, base_price,
                    discount_percent, discount_amount, final_plan_price, trainer_addon_enabled,
                    trainer_id, trainer_addon_monthly_price, trainer_addon_price, total_price, status, start_date, end_date,
                    termination_reason
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s)
            """, (
                user_id,
                plan['plan_code'],
                plan['plan_name'],
                plan['duration_months'],
                plan['monthly_rate'],
                base_price,
                plan['discount_percent'],
                discount_amount,
                final_plan_price,
                1 if trainer_addon_enabled else 0,
                trainer_id,
                trainer_addon_monthly_price if trainer_addon_enabled else 0,
                trainer_addon_total_price,
                total_price,
                start_date,
                end_date,
                termination_reason,
            ))

        write_cursor.execute(
            "UPDATE Users SET price = %s, join_date = %s, expiry_date = %s, membership_status = 'active', trainer_id = %s WHERE user_id = %s",
            (total_price, start_date, end_date, trainer_id if trainer_addon_enabled else None, user_id)
        )
        conn.commit()
        log_subscription_history(conn, user_id, action_type, {
            'plan_code': plan['plan_code'],
            'plan_name': plan['plan_name'],
            'duration_months': plan['duration_months'],
            'monthly_rate': plan['monthly_rate'],
            'base_price': base_price,
            'discount_percent': plan['discount_percent'],
            'discount_amount': discount_amount,
            'final_plan_price': final_plan_price,
            'trainer_addon_enabled': trainer_addon_enabled,
            'trainer_id': trainer_id,
            'trainer_addon_monthly_price': trainer_addon_monthly_price if trainer_addon_enabled else 0,
            'trainer_addon_price': trainer_addon_total_price,
            'total_price': total_price,
            'status': 'active',
            'start_date': start_date,
            'end_date': end_date,
            'note': f"{action_type.capitalize()} subscription",
        })
        write_cursor.close()
        return jsonify({
            'message': 'Subscription saved successfully',
            'pricing': {
                'base_price': base_price,
                'discount_percent': plan['discount_percent'],
                'discount_amount': discount_amount,
                'final_plan_price': final_plan_price,
                'trainer_addon_monthly_price': trainer_addon_monthly_price if trainer_addon_enabled else 0,
                'trainer_addon_price': trainer_addon_total_price,
                'total_price': total_price,
            }
        }), 200
    except ValueError:
        return jsonify({"error": "Invalid numeric or date value"}), 400
    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/subscriptions/renew/<int:user_id>', methods=['POST'])
def renew_subscription(user_id):
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    data = request.json or request.form or {}

    try:
        ensure_subscription_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT plan_code, trainer_addon_enabled, trainer_id, trainer_addon_monthly_price, start_date, end_date
            FROM MemberSubscriptions
            WHERE user_id = %s
        """, (user_id,))
        current_subscription = cursor.fetchone()
        if not current_subscription:
            return jsonify({"error": "No active subscription found to renew"}), 404

        from datetime import date, timedelta
        
        plan_code = data.get('plan_code') or current_subscription.get('plan_code')
        plan = SUBSCRIPTION_PLAN_CONFIG.get((plan_code or '').lower())
        if not plan:
            return jsonify({"error": "Current subscription plan is invalid"}), 400

        base_start = current_subscription.get('end_date') or date.today()
        next_start = max(date.today(), base_start + timedelta(days=1))
        end_date = add_months(next_start, plan['duration_months'])
        
        trainer_addon_enabled = data.get('trainer_addon_enabled')
        if trainer_addon_enabled is None:
             trainer_addon_enabled = bool(current_subscription.get('trainer_addon_enabled'))
        else:
             trainer_addon_enabled = str(trainer_addon_enabled).lower() in ['true', '1', 'yes']

        if trainer_addon_enabled:
             trainer_id = data.get('trainer_id') or current_subscription.get('trainer_id')
             trainer_addon_monthly_price = float(data.get('trainer_addon_monthly_price') or data.get('trainer_addon_price') or current_subscription.get('trainer_addon_monthly_price') or 0)
        else:
             trainer_id = None
             trainer_addon_monthly_price = 0

        trainer_addon_total_price = round((trainer_addon_monthly_price * plan['duration_months']) if trainer_addon_enabled else 0, 2)
        base_price = plan['monthly_rate'] * plan['duration_months']
        discount_amount = round((base_price * plan['discount_percent']) / 100, 2)
        final_plan_price = round(base_price - discount_amount, 2)
        total_price = round(final_plan_price + trainer_addon_total_price, 2)

        write_cursor = conn.cursor()
        write_cursor.execute("""
            UPDATE MemberSubscriptions
            SET plan_code = %s,
                plan_name = %s,
                duration_months = %s,
                monthly_rate = %s,
                base_price = %s,
                discount_percent = %s,
                discount_amount = %s,
                final_plan_price = %s,
                trainer_addon_enabled = %s,
                trainer_id = %s,
                trainer_addon_monthly_price = %s,
                trainer_addon_price = %s,
                total_price = %s,
                status = 'active',
                end_date = %s,
                termination_reason = NULL,
                terminated_at = NULL
            WHERE user_id = %s
        """, (
            plan['plan_code'],
            plan['plan_name'],
            plan['duration_months'],
            plan['monthly_rate'],
            base_price,
            plan['discount_percent'],
            discount_amount,
            final_plan_price,
            1 if trainer_addon_enabled else 0,
            trainer_id,
            trainer_addon_monthly_price if trainer_addon_enabled else 0,
            trainer_addon_total_price,
            total_price,
            end_date,
            user_id,
        ))
        write_cursor.execute(
            "UPDATE Users SET price = %s, expiry_date = %s, membership_status = 'active', trainer_id = %s WHERE user_id = %s",
            (total_price, end_date, trainer_id, user_id)
        )
        conn.commit()
        log_subscription_history(conn, user_id, 'renew', {
            'plan_code': plan['plan_code'],
            'plan_name': plan['plan_name'],
            'duration_months': plan['duration_months'],
            'monthly_rate': plan['monthly_rate'],
            'base_price': base_price,
            'discount_percent': plan['discount_percent'],
            'discount_amount': discount_amount,
            'final_plan_price': final_plan_price,
            'trainer_addon_enabled': trainer_addon_enabled,
            'trainer_id': trainer_id,
            'trainer_addon_monthly_price': trainer_addon_monthly_price if trainer_addon_enabled else 0,
            'trainer_addon_price': trainer_addon_total_price,
            'total_price': total_price,
            'status': 'active',
            'start_date': next_start,
            'end_date': end_date,
            'note': 'Renewed subscription',
        })
        write_cursor.close()
        return jsonify({
            "message": "Subscription renewed successfully",
            "start_date": next_start.strftime('%Y-%m-%d'),
            "end_date": end_date.strftime('%Y-%m-%d'),
            "total_price": total_price,
        }), 200
    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/subscriptions/terminate/<int:user_id>', methods=['POST'])
def terminate_subscription(user_id):
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    data = request.json or request.form
    reason = data.get('reason') or 'Terminated by admin'

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_subscription_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT subscription_id FROM MemberSubscriptions WHERE user_id = %s", (user_id,))
        subscription = cursor.fetchone()
        if not subscription:
            return jsonify({"error": "No subscription found for this member"}), 404

        write_cursor = conn.cursor()
        write_cursor.execute("""
            UPDATE MemberSubscriptions
            SET status = 'terminated',
                termination_reason = %s,
                terminated_at = NOW()
            WHERE user_id = %s
        """, (reason, user_id))
        write_cursor.execute("""
            UPDATE Users
            SET membership_status = 'expired',
                expiry_date = CURDATE()
            WHERE user_id = %s
        """, (user_id,))
        conn.commit()
        log_subscription_history(conn, user_id, 'terminate', {
            'status': 'terminated',
            'note': reason,
        })
        write_cursor.close()
        return jsonify({"message": "Subscription terminated successfully"}), 200
    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- ATTENDANCE SYSTEM API ---

@app.route('/add-attendance', methods=['POST'])
def mark_attendance():
    if session.get('role') not in ['admin', 'owner', 'trainer']: 
        return jsonify({"error": "Access Denied"}), 403
    
    data = request.json or request.form
    user_id = data.get('user_id')
    from datetime import date
    date_val = date.today().strftime('%Y-%m-%d')
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db_connection()
    if conn:
        try:
            ensure_attendance_status_column(conn)
            cursor = conn.cursor()
            query = "INSERT INTO Attendance (user_id, date, status) VALUES (%s, %s, 'present')"
            cursor.execute(query, (user_id, date_val))
            conn.commit()
            
            # Badge Logic: 7 Day Streak
            cursor.execute("SELECT COUNT(*) FROM Attendance WHERE user_id = %s AND status = 'present'", (user_id,))
            res = cursor.fetchone()
            if res and res[0] >= 7:
                cursor.execute("SELECT badge_id FROM Badges WHERE user_id = %s AND badge_name = '7 Day Streak'", (user_id,))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO Badges (user_id, badge_name, date_awarded) VALUES (%s, '7 Day Streak', %s)", (user_id, date_val))
                    conn.commit()
                    
            return jsonify({"message": "Attendance marked successfully"}), 201
        except Error as e:
            if e.errno == 1062: # Duplicate entry error
                return jsonify({"error": "Attendance already marked for this date"}), 409
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/get-attendance/<int:user_id>', methods=['GET'])
def attendance_history(user_id):
    if 'role' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if session.get('role') == 'member' and str(session.get('user_id')) != str(user_id):
        return jsonify({"error": "Access Denied"}), 403
        
    conn = get_db_connection()
    if conn:
        try:
            timeline = build_attendance_timeline(conn, user_id)
            return jsonify({
                "user_id": user_id,
                "history": timeline["history"],
                "start_date": timeline["start_date"],
            }), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/attendance-percentage/<int:user_id>', methods=['GET'])
def attendance_percentage(user_id):
    if 'role' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if session.get('role') == 'member' and str(session.get('user_id')) != str(user_id):
        return jsonify({"error": "Access Denied"}), 403
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT user_id FROM Users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404
            timeline = build_attendance_timeline(conn, user_id)
            total_days = timeline["total_days"]
            days_present = timeline["days_present"]
            days_absent = timeline["days_absent"]
            percentage = round((days_present / total_days) * 100, 2) if total_days > 0 else 0

            return jsonify({
                "user_id": user_id,
                "days_present": days_present,
                "days_marked": total_days,
                "days_absent": days_absent,
                "total_days_since_join": total_days,
                "tracking_start_date": timeline["start_date"],
                "attendance_percentage": percentage
            }), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/attendance-overview', methods=['GET'])
def attendance_overview():
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    group_type = (request.args.get('type') or 'member').lower()
    if group_type not in ['member', 'employee']:
        return jsonify({"error": "type must be member or employee"}), 400

    date_param = request.args.get('date')
    from datetime import date
    date_val = date_param or date.today().strftime('%Y-%m-%d')

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_attendance_status_column(conn)
        cursor = conn.cursor(dictionary=True)
        if group_type == 'member':
            cursor.execute("""
                SELECT user_id as id, reg_no, first_name, last_name, email, role
                FROM Users
                WHERE role = 'member'
                ORDER BY user_id DESC
            """)
        else:
            cursor.execute("""
                SELECT user_id as id, reg_no, first_name, last_name, email, role
                FROM Users
                WHERE role IN ('trainer', 'admin')
                ORDER BY user_id DESC
            """)
        users = cursor.fetchall()

        cursor.execute(
            "SELECT user_id, status FROM Attendance WHERE date = %s",
            (date_val,)
        )
        attendance_map = {row['user_id']: row['status'] for row in cursor.fetchall()}

        result = []
        for u in users:
            saved_status = attendance_map.get(u["id"])
            result.append({
                "id": u["id"],
                "reg_no": u.get("reg_no"),
                "first_name": u.get("first_name"),
                "last_name": u.get("last_name"),
                "email": u.get("email"),
                "role": u.get("role"),
                "date": date_val,
                "status": saved_status or "not_marked",
                "marked": saved_status is not None,
                "can_mark": saved_status is None
            })

        return jsonify({
            "type": group_type,
            "date": date_val,
            "records": result,
            "locked": date_val != date.today().strftime('%Y-%m-%d')
        }), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/attendance-status', methods=['POST'])
def set_attendance_status():
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403

    data = request.json or request.form
    user_id = data.get('user_id')
    status = (data.get('status') or '').lower()
    date_val = data.get('date')

    if not user_id or status not in ['present', 'absent']:
        return jsonify({"error": "user_id and status(present/absent) are required"}), 400

    from datetime import date
    date_val = date_val or date.today().strftime('%Y-%m-%d')
    today_str = date.today().strftime('%Y-%m-%d')

    if date_val != today_str:
        return jsonify({"error": "Attendance can only be marked for today"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        ensure_attendance_status_column(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id FROM Users WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Invalid user_id"}), 404

        cursor.execute(
            "SELECT attendance_id, status FROM Attendance WHERE user_id = %s AND date = %s",
            (user_id, date_val)
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({"error": f"Attendance already marked as {existing['status']} for today and cannot be changed"}), 409

        write_cursor = conn.cursor()
        write_cursor.execute(
            "INSERT INTO Attendance (user_id, date, status) VALUES (%s, %s, %s)",
            (user_id, date_val, status)
        )

        conn.commit()
        write_cursor.close()
        return jsonify({"message": f"Attendance marked {status} successfully and locked for today"}), 200
    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- PROGRESS TRACKING API ---

@app.route('/add-progress', methods=['POST'])
def add_progress():
    if session.get('role') not in ['admin', 'owner', 'trainer', 'member']: 
        return jsonify({"error": "Access Denied"}), 403
    
    data = request.json or request.form
    user_id = data.get('user_id')
    weight = data.get('weight')
    bmi = data.get('bmi')
    from datetime import date
    date_val = date.today().strftime('%Y-%m-%d')
    
    # If a member is logged in, they can only add progress for themselves
    if session.get('role') == 'member' and str(session.get('user_id')) != str(user_id):
        return jsonify({"error": "You can only add progress for yourself"}), 403
        
    if not all([user_id, weight, bmi]):
        return jsonify({"error": "user_id, weight, and bmi are required"}), 400
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "INSERT INTO Progress (user_id, weight, bmi, date) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (user_id, weight, bmi, date_val))
            conn.commit()
            return jsonify({"message": "Progress added successfully"}), 201
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/get-progress/<int:user_id>', methods=['GET'])
def progress_history(user_id):
    if 'role' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    if session.get('role') == 'member' and str(session.get('user_id')) != str(user_id):
        return jsonify({"error": "Access Denied"}), 403
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT progress_id, weight, bmi, date FROM Progress WHERE user_id = %s ORDER BY date ASC", (user_id,))
            history = cursor.fetchall()
            for record in history:
                record['date'] = record['date'].strftime('%Y-%m-%d') if record['date'] else None
            return jsonify({"user_id": user_id, "history": history}), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

# --- SCHEDULE / BOOKING API ---

@app.route('/request-slot', methods=['POST'])
def request_schedule():
    if session.get('role') != 'member':
        return jsonify({"error": "Only members can request a schedule slot"}), 403
        
    data = request.json or request.form
    user_id = data.get('user_id') or session.get('user_id')
    trainer_id = data.get('trainer_id')
    date_val = data.get('date') # YYYY-MM-DD
    time_val = data.get('time')
    
    if not all([user_id, trainer_id, date_val, time_val]):
        return jsonify({"error": "user_id, trainer_id, date, and time are required"}), 400
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "INSERT INTO Schedule (user_id, trainer_id, date, time, status) VALUES (%s, %s, %s, %s, 'pending')"
            cursor.execute(query, (user_id, trainer_id, date_val, time_val))
            conn.commit()
            return jsonify({"message": "Schedule requested successfully"}), 201
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/approve-slot/<int:schedule_id>', methods=['PUT'])
def approve_schedule(schedule_id):
    if session.get('role') not in ['admin', 'owner', 'trainer']:
        return jsonify({"error": "Access Denied"}), 403
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            
            if session.get('role') == 'trainer':
                cursor.execute("SELECT trainer_id FROM Schedule WHERE schedule_id = %s", (schedule_id,))
                res = cursor.fetchone()
                if not res or res[0] != session.get('user_id'):
                    return jsonify({"error": "Not authorized to approve this schedule"}), 403
            
            cursor.execute("UPDATE Schedule SET status = 'approved' WHERE schedule_id = %s", (schedule_id,))
            conn.commit()
            return jsonify({"message": "Schedule approved successfully"}), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/get-schedule/<int:user_id>', methods=['GET'])
def get_schedule(user_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM Schedule WHERE user_id = %s OR trainer_id = %s ORDER BY date, time", (user_id, user_id))
            schedules = cursor.fetchall()
            for rec in schedules:
                if rec['date']: rec['date'] = rec['date'].strftime('%Y-%m-%d')
            return jsonify({"schedules": schedules}), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

# --- BADGES API ---

@app.route('/api/badges/assign', methods=['POST'])
def assign_badge():
    if session.get('role') not in ['admin', 'owner', 'trainer']: 
        return jsonify({"error": "Access Denied"}), 403
    
    data = request.json or request.form
    user_id = data.get('user_id')
    badge_name = data.get('badge_name')
    from datetime import date
    date_awarded = data.get('date_awarded') or date.today().strftime('%Y-%m-%d')
    
    if not all([user_id, badge_name]):
        return jsonify({"error": "user_id and badge_name are required"}), 400
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = "INSERT INTO Badges (user_id, badge_name, date_awarded) VALUES (%s, %s, %s)"
            cursor.execute(query, (user_id, badge_name, date_awarded))
            conn.commit()
            return jsonify({"message": f"Badge '{badge_name}' assigned successfully"}), 201
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

@app.route('/get-badges/<int:user_id>', methods=['GET'])
def get_badges(user_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT badge_name, date_awarded FROM Badges WHERE user_id = %s ORDER BY date_awarded DESC", (user_id,))
            badges = cursor.fetchall()
            for b in badges:
                if b['date_awarded']: b['date_awarded'] = b['date_awarded'].strftime('%Y-%m-%d')
            return jsonify({"user_id": user_id, "badges": badges}), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

# --- DIET RECOMMENDATION API ---

@app.route('/diet/<int:user_id>', methods=['GET'])
def diet_recommendation(user_id):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT goal FROM Users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({"error": "User not found"}), 404
                
            goal = user.get('goal', '').lower() if user.get('goal') else ''
            
            if 'loss' in goal or 'weight' in goal and 'gain' not in goal:
                recommendation = "Low calorie diet focusing on lean proteins and complex carbohydrates."
            elif 'gain' in goal or 'muscle' in goal:
                recommendation = "High protein diet with a caloric surplus to support muscle building."
            else:
                recommendation = "Balanced diet including proteins, healthy fats, and fiber-rich carbohydrates."
                
            return jsonify({"user_id": user_id, "diet_recommendation": recommendation}), 200
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    return jsonify({"error": "Database error"}), 500

# ─── BUDGET ──────────────────────────────────────────────────────────────────
@app.route('/api/budget')
def budget_stats():
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        cursor = conn.cursor(dictionary=True)

        # Total revenue collected
        cursor.execute("SELECT COALESCE(SUM(total_price), 0) as total FROM MemberSubscriptions WHERE status = 'active'")
        total_revenue = float(cursor.fetchone()['total'])

        # Active member count
        cursor.execute("SELECT COUNT(*) as cnt FROM Users WHERE role = 'member' AND membership_status = 'active'")
        active_members = cursor.fetchone()['cnt']

        # Total members
        cursor.execute("SELECT COUNT(*) as cnt FROM Users WHERE role = 'member'")
        total_members = cursor.fetchone()['cnt']

        # Trainer add-on revenue
        cursor.execute("SELECT COALESCE(SUM(trainer_addon_price), 0) as total FROM MemberSubscriptions WHERE trainer_addon_enabled = 1 AND status = 'active'")
        addon_revenue = float(cursor.fetchone()['total'])

        # Revenue by plan
        cursor.execute("""
            SELECT plan_name,
                   COUNT(*) as member_count,
                   COALESCE(SUM(total_price), 0) as revenue
            FROM MemberSubscriptions
            WHERE status = 'active'
            GROUP BY plan_name
            ORDER BY revenue DESC
        """)
        plan_breakdown = cursor.fetchall()

        # Monthly revenue trend (last 6 months based on start_date)
        cursor.execute("""
            SELECT DATE_FORMAT(start_date, '%%Y-%%m') as month,
                   COALESCE(SUM(total_price), 0) as revenue,
                   COUNT(*) as subscriptions
            FROM MemberSubscriptions
            WHERE start_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(start_date, '%%Y-%%m')
            ORDER BY month ASC
        """)
        monthly_trend = cursor.fetchall()

        # Recent subscriptions
        cursor.execute("""
            SELECT u.first_name, u.last_name, u.reg_no,
                   ms.plan_name, ms.total_price, ms.start_date, ms.status
            FROM MemberSubscriptions ms
            JOIN Users u ON ms.user_id = u.user_id
            ORDER BY ms.start_date DESC
            LIMIT 10
        """)
        recent = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "total_revenue": total_revenue,
            "active_members": active_members,
            "total_members": total_members,
            "addon_revenue": addon_revenue,
            "plan_revenue": total_revenue - addon_revenue,
            "plan_breakdown": [
                {"plan_name": r["plan_name"], "member_count": r["member_count"], "revenue": float(r["revenue"])}
                for r in plan_breakdown
            ],
            "monthly_trend": [
                {"month": r["month"], "revenue": float(r["revenue"]), "subscriptions": r["subscriptions"]}
                for r in monthly_trend
            ],
            "recent_subscriptions": recent,
        }), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


# ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
def ensure_announcements_table(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            important TINYINT(1) DEFAULT 0,
            author VARCHAR(100) NOT NULL,
            author_role VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    # Backfill columns for databases where Announcements was created earlier.
    migration_queries = [
        """
            ALTER TABLE Announcements
            ADD COLUMN author VARCHAR(100) NOT NULL DEFAULT 'Staff'
        """,
        """
            ALTER TABLE Announcements
            ADD COLUMN author_role VARCHAR(50) NOT NULL DEFAULT ''
        """,
        """
            ALTER TABLE Announcements
            ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        """,
    ]

    for query in migration_queries:
        try:
            cursor.execute(query)
            conn.commit()
        except Exception:
            pass  # Column already exists or table is already up to date.
    cursor.close()


@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    if 'role' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        ensure_announcements_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Announcements ORDER BY important DESC, created_at DESC")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({"announcements": rows}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/announcements', methods=['POST'])
def create_announcement():
    if session.get('role') not in ['admin', 'owner', 'trainer']:
        return jsonify({"error": "Access Denied"}), 403
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    data = request.json or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    important = 1 if data.get('important') else 0
    if not title or not content:
        return jsonify({"error": "Title and content are required"}), 400
    author = f"{session.get('first_name', '')} {session.get('last_name', '')}".strip() or 'Staff'
    author_role = session.get('role', '')
    try:
        ensure_announcements_table(conn)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Announcements (title, content, important, author, author_role) VALUES (%s, %s, %s, %s, %s)",
            (title, content, important, author, author_role)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Announcement created"}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/announcements/<int:announcement_id>', methods=['DELETE'])
def delete_announcement(announcement_id):
    if session.get('role') not in ['admin', 'owner']:
        return jsonify({"error": "Access Denied"}), 403
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Announcements WHERE id = %s", (announcement_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Deleted"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500




# ─── OWNER PRIVILEGE MANAGEMENT ──────────────────────────────────────────────

@app.route('/api/owner/admins', methods=['GET'])
def get_admins_with_privileges():
    """List all admins with their current elevated-access status. Owner only."""
    if not is_owner_or_elevated():
        return jsonify({"error": "Access Denied"}), 403
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        ensure_admin_privileges_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.user_id, u.first_name, u.last_name, u.email, u.reg_no,
                   ap.id AS priv_id,
                   ap.grant_type,
                   ap.expiry_date,
                   ap.created_at AS granted_at
            FROM Users u
            LEFT JOIN AdminPrivileges ap ON ap.user_id = u.user_id
            WHERE u.role = 'admin'
            ORDER BY u.first_name
        """)
        admins = cursor.fetchall()
        now = datetime.datetime.now()
        result = []
        for a in admins:
            has_priv = a['priv_id'] is not None
            active = False
            if has_priv:
                if a['grant_type'] == 'permanent':
                    active = True
                elif a['expiry_date'] and a['expiry_date'] > now:
                    active = True
            result.append({
                'user_id': a['user_id'],
                'first_name': a['first_name'],
                'last_name': a['last_name'],
                'email': a['email'],
                'reg_no': a['reg_no'],
                'has_privilege': has_priv,
                'active_privilege': active,
                'grant_type': a['grant_type'],
                'expiry_date': a['expiry_date'].isoformat() if a['expiry_date'] else None,
                'granted_at': a['granted_at'].isoformat() if a['granted_at'] else None,
            })
        cursor.close()
        conn.close()
        return jsonify({"admins": result}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/owner/grant-access', methods=['POST'])
def grant_owner_access():
    """Grant elevated owner-level access to an admin. Owner only."""
    if not is_owner():
        return jsonify({"error": "Access Denied — only the owner can grant access"}), 403
    data = request.json or {}
    user_id = data.get('user_id')
    grant_type = (data.get('grant_type') or 'permanent').lower()
    expiry_date = data.get('expiry_date')  # ISO string or None

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if grant_type not in ['permanent', 'temporary']:
        return jsonify({"error": "grant_type must be 'permanent' or 'temporary'"}), 400
    if grant_type == 'temporary' and not expiry_date:
        return jsonify({"error": "expiry_date is required for temporary access"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        ensure_admin_privileges_table(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, role FROM Users WHERE user_id = %s", (user_id,))
        target = cursor.fetchone()
        if not target:
            return jsonify({"error": "User not found"}), 404
        if target['role'] != 'admin':
            return jsonify({"error": "Elevated access can only be granted to admins"}), 400

        expiry_dt = None
        if grant_type == 'temporary' and expiry_date:
            try:
                expiry_dt = datetime.datetime.fromisoformat(expiry_date)
            except ValueError:
                return jsonify({"error": "Invalid expiry_date format (use ISO 8601)"}), 400

        write_cursor = conn.cursor()
        write_cursor.execute("""
            INSERT INTO AdminPrivileges (user_id, granted_by, grant_type, expiry_date)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                granted_by = VALUES(granted_by),
                grant_type = VALUES(grant_type),
                expiry_date = VALUES(expiry_date),
                created_at = NOW()
        """, (user_id, session.get('user_id'), grant_type, expiry_dt))
        conn.commit()
        write_cursor.close()
        cursor.close()
        conn.close()
        return jsonify({"message": "Owner-level access granted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/owner/revoke-access/<int:user_id>', methods=['DELETE'])
def revoke_owner_access(user_id):
    """Revoke elevated access from an admin. Owner only."""
    if not is_owner():
        return jsonify({"error": "Access Denied — only the owner can revoke access"}), 403
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        ensure_admin_privileges_table(conn)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM AdminPrivileges WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Access revoked successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


# ─── EMPLOYEE SALARY ─────────────────────────────────────────────────────────

@app.route('/api/owner/employees-salary', methods=['GET'])
def get_employees_salary():
    """Get all employees with their salary. Owner only."""
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        ensure_salary_column(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT user_id, reg_no, first_name, last_name, email, role,
                   COALESCE(salary, 0) AS salary
            FROM Users
            WHERE role IN ('admin', 'trainer')
            ORDER BY role, first_name
        """)
        employees = cursor.fetchall()
        total_payroll = sum(float(e['salary'] or 0) for e in employees)
        cursor.close()
        conn.close()
        return jsonify({
            "employees": [
                {
                    "user_id": e['user_id'],
                    "reg_no": e['reg_no'],
                    "first_name": e['first_name'],
                    "last_name": e['last_name'],
                    "email": e['email'],
                    "role": e['role'],
                    "salary": float(e['salary'] or 0),
                }
                for e in employees
            ],
            "total_payroll": total_payroll,
        }), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/owner/employees-salary/<int:user_id>', methods=['PUT'])
def update_employee_salary(user_id):
    """Update salary for a specific employee. Owner only."""
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403
    data = request.json or {}
    salary = data.get('salary')
    if salary is None:
        return jsonify({"error": "salary is required"}), 400
    try:
        salary = float(salary)
        if salary < 0:
            return jsonify({"error": "Salary cannot be negative"}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid salary value"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        ensure_salary_column(conn)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, role FROM Users WHERE user_id = %s", (user_id,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"error": "User not found"}), 404
        if emp['role'] not in ['admin', 'trainer']:
            return jsonify({"error": "Salary can only be set for admin or trainer roles"}), 400
        write_cursor = conn.cursor()
        write_cursor.execute("UPDATE Users SET salary = %s WHERE user_id = %s", (salary, user_id))
        conn.commit()
        write_cursor.close()
        cursor.close()
        conn.close()
        return jsonify({"message": "Salary updated successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
