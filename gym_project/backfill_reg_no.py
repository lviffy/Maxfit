import mysql.connector

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='Mayadinkp2806@',
        database='gym_db'
    )
    cursor = conn.cursor(dictionary=True)

    # Find all users that don't have a registration number yet
    cursor.execute("SELECT user_id, role FROM Users WHERE reg_no IS NULL OR reg_no = ''")
    users = cursor.fetchall()
    
    if not users:
        print("All existing users already have a Registration Number!")
    else:
        update_cursor = conn.cursor()
        for u in users:
            # Map existing role to the MEM / EMP format
            role = u.get('role', 'member').lower()
            prefix = 'MEM' if role == 'member' else 'EMP'
            
            # Format using their definitive user_id
            new_reg_no = f"{prefix}{u['user_id']:04d}"
            
            update_cursor.execute("UPDATE Users SET reg_no = %s WHERE user_id = %s", (new_reg_no, u['user_id']))

        conn.commit()
        update_cursor.close()
        print(f"Success! Backfilled {len(users)} existing users with uniquely generated Registration Numbers!")

    cursor.close()
    conn.close()

except mysql.connector.Error as e:
    print(f"Database error occurred: {e}")
except Exception as e:
    print(f"Error occurred: {e}")
