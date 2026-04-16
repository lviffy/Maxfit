from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import qrcode
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = 'super_secret_gym_key' # Needed for session tracking

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Mayadinkp2806@', # User's actual password
            database='gym_db'
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
                
                new_user_id = cursor.lastrowid
                if not new_user_id:
                    cursor.execute("SELECT user_id FROM Users WHERE reg_no = %s", (reg_no,))
                    res = cursor.fetchone()
                    if res: new_user_id = res[0]
                    
                if new_user_id:
                    os.makedirs('static/qrcodes', exist_ok=True)
                    qr_img = qrcode.make(f"http://127.0.0.1:5000/member-details/{new_user_id}")
                    qr_img.save(os.path.join('static', 'qrcodes', f"{reg_no}.png"))

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
                    
                    role = session['role']
                    
                    if request.is_json:
                        return jsonify({
                            'id': str(session['user_id']),
                            'role': role,
                            'email': user['email'],
                            'firstName': user['first_name'],
                            'lastName': user['last_name']
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
    if session.get('role') not in ['admin', 'owner']: return "Access Denied", 403
        
    if request.method == 'POST':
        conn = get_db_connection()
        if conn:
            from datetime import date, timedelta
            duration_days = int(request.form.get('duration', 30))
            join_date = date.today()
            expiry_date = join_date + timedelta(days=duration_days)
            price = request.form.get('price', 0)
            
            dob = request.form.get('dob')
            age = request.form.get('age')
            height_cm = float(request.form.get('height'))
            weight = float(request.form.get('weight'))
            address = request.form.get('address')
            goal = request.form.get('goal')
            source = request.form.get('source')
            
            height_m = height_cm / 100
            bmi = round(weight / (height_m * height_m), 2)
            
            reg_no = generate_reg_no('member')
            cursor = conn.cursor()
            query = """INSERT INTO Users 
                       (reg_no, first_name, last_name, email, password, role, membership_status, join_date, expiry_date, price,
                        age, height, weight, bmi, address, dob, goal, source) 
                       VALUES (%s, %s, %s, %s, %s, 'member', 'active', %s, %s, %s,
                               %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(query, (
                reg_no,
                request.form.get('first_name'), request.form.get('last_name'), 
                request.form.get('email'), request.form.get('password'),
                join_date, expiry_date, price,
                age, height_cm, weight, bmi, address, dob, goal, source
            ))
            conn.commit()
            
            new_user_id = cursor.lastrowid
            if not new_user_id:
                cursor.execute("SELECT user_id FROM Users WHERE reg_no = %s", (reg_no,))
                res = cursor.fetchone()
                if res: new_user_id = res[0]
                
            if new_user_id:
                os.makedirs('static/qrcodes', exist_ok=True)
                qr_img = qrcode.make(f"http://127.0.0.1:5000/member-details/{new_user_id}")
                qr_img.save(os.path.join('static', 'qrcodes', f"{reg_no}.png"))
                
            cursor.close()
            conn.close()
            return redirect(url_for('members'))
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
                   u.join_date, u.expiry_date, u.price, u.trainer_id,
                   t.first_name as trainer_name, t.last_name as trainer_last_name,
                   u.age, u.height, u.weight, u.bmi, u.address, u.dob, u.goal, u.source
            FROM Users u 
            LEFT JOIN Users t ON u.trainer_id = t.user_id 
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
        
        # Calculate remaining days dynamically
        from datetime import date
        today = date.today()
        for m in members_list:
            if m.get('expiry_date'):
                diff = (m['expiry_date'] - today).days
                m['remaining_days'] = diff if diff > 0 else 0
            else:
                m['remaining_days'] = 'N/A'
                
        if request.is_json:
            return jsonify({"members": members_list, "trainers": trainers_list})
                
        return render_template('members.html', members=members_list, trainers=trainers_list, search=search_query, membership_status=membership_status, trainer_id=trainer_id, expiry_date=expiry_date)
    
    if request.is_json: return jsonify({"error": "DB Connection failed"}), 500
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
        if request.is_json: return jsonify({"error": "Access Denied"}), 403
        return "Access Denied", 403
    conn = get_db_connection()
    if conn:
        data = request.json or request.form
        cursor = conn.cursor()
        
        updates = []
        params = []
        if 'membership_status' in data:
            updates.append("membership_status = %s")
            params.append(data.get('membership_status'))
        if 'price' in data:
            updates.append("price = %s")
            params.append(data.get('price'))
        if 'join_date' in data:
            updates.append("join_date = %s")
            params.append(data.get('join_date') or None)
        if 'expiry_date' in data:
            updates.append("expiry_date = %s")
            params.append(data.get('expiry_date') or None)
        if 'trainer_id' in data:
            tid = data.get('trainer_id')
            updates.append("trainer_id = %s")
            params.append(None if tid in ['', 'None', None, 'Unassigned'] else tid)
            
        if updates:
            params.append(user_id)
            query = f"UPDATE Users SET {', '.join(updates)} WHERE user_id = %s"
            cursor.execute(query, tuple(params))
            conn.commit()
            
        cursor.close()
        conn.close()
        if request.is_json: return jsonify({"message": "Updated successfully"}), 200
        return redirect(url_for('members'))
    if request.is_json: return jsonify({"error": "DB Error"}), 500
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
                   u.join_date, u.expiry_date, u.price, u.trainer_id,
                   t.first_name as trainer_first, t.last_name as trainer_last,
                   u.age, u.height, u.weight, u.bmi, u.address, u.dob, u.goal, u.source
            FROM Users u
            LEFT JOIN Users t ON u.trainer_id = t.user_id
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
            cursor = conn.cursor()
            query = "INSERT INTO Attendance (user_id, date) VALUES (%s, %s)"
            cursor.execute(query, (user_id, date_val))
            conn.commit()
            
            # Badge Logic: 7 Day Streak
            cursor.execute("SELECT COUNT(*) FROM Attendance WHERE user_id = %s", (user_id,))
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
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT attendance_id, date FROM Attendance WHERE user_id = %s ORDER BY date DESC", (user_id,))
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

@app.route('/attendance-percentage/<int:user_id>', methods=['GET'])
def attendance_percentage(user_id):
    if 'role' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT join_date FROM Users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user or not user.get('join_date'):
                return jsonify({"error": "User not found or join_date is not set"}), 404
                
            join_date = user['join_date']
            from datetime import date
            today = date.today()
            
            total_days = (today - join_date).days + 1
            if total_days <= 0:
                total_days = 1
                
            cursor.execute("SELECT COUNT(*) as days_present FROM Attendance WHERE user_id = %s AND date <= %s", (user_id, today))
            result = cursor.fetchone()
            days_present = result['days_present'] if result else 0
            
            percentage = round((days_present / total_days) * 100, 2)
            
            return jsonify({
                "user_id": user_id,
                "days_present": days_present,
                "total_days_since_join": total_days,
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
    if not is_owner():
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

        cursor.execute("SELECT user_id FROM Attendance WHERE date = %s", (date_val,))
        present_ids = {row['user_id'] for row in cursor.fetchall()}

        result = []
        for u in users:
            result.append({
                "id": u["id"],
                "reg_no": u.get("reg_no"),
                "first_name": u.get("first_name"),
                "last_name": u.get("last_name"),
                "email": u.get("email"),
                "role": u.get("role"),
                "date": date_val,
                "status": "present" if u["id"] in present_ids else "absent"
            })

        return jsonify({"type": group_type, "date": date_val, "records": result}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/attendance-status', methods=['POST'])
def set_attendance_status():
    if not is_owner():
        return jsonify({"error": "Access Denied"}), 403

    data = request.json or request.form
    user_id = data.get('user_id')
    status = (data.get('status') or '').lower()
    date_val = data.get('date')

    if not user_id or status not in ['present', 'absent']:
        return jsonify({"error": "user_id and status(present/absent) are required"}), 400

    from datetime import date
    date_val = date_val or date.today().strftime('%Y-%m-%d')

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM Users WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Invalid user_id"}), 404

        if status == 'present':
            cursor.execute(
                "INSERT INTO Attendance (user_id, date) VALUES (%s, %s) ON DUPLICATE KEY UPDATE date = VALUES(date)",
                (user_id, date_val)
            )
        else:
            cursor.execute("DELETE FROM Attendance WHERE user_id = %s AND date = %s", (user_id, date_val))

        conn.commit()
        return jsonify({"message": f"Attendance marked {status} successfully"}), 200
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

if __name__ == '__main__':
    app.run(debug=True)
