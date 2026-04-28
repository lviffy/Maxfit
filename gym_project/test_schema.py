import mysql.connector
import os

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Mayadinkp2806@'
}

def execute_schema():
    try:
        # Connect to MySQL (without specifying database so we can run CREATE DATABASE)
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Read the schema file
        with open('schema.sql', 'r') as file:
            sql_script = file.read()
            
        # Execute the script (split by semicolon if needed, but multi=True is better)
        for result in cursor.execute(sql_script, multi=True):
            print(f"Executed: {result.statement[:50]}...")
            if result.with_rows:
                print("Rows produced:", result.fetchall())
                
        conn.commit()
        print("\n✅ SUCCESS: All tables in schema.sql were created perfectly!")
        
    except mysql.connector.Error as err:
        print(f"\n❌ ERROR: {err}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    execute_schema()
