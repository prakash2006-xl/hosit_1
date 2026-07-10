import mysql.connector
from db_config import DB_CONFIG

def check_columns():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        for table in ['users', 'doctors']:
            print(f"\n--- Columns in '{table}' ---")
            cursor.execute(f"SHOW COLUMNS FROM {table}")
            columns = cursor.fetchall()
            for col in columns:
                print(col)
                
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
