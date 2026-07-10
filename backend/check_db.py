import mysql.connector
from db_config import DB_CONFIG

def check_db():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        print("--- Health Logs ---")
        cursor.execute("SELECT id, user_id, name, email FROM health_logs ORDER BY log_date DESC LIMIT 5")
        logs = cursor.fetchall()
        for log in logs:
            print(log)
            
        print("\n--- Users ---")
        cursor.execute("SELECT id, name, email FROM users LIMIT 5")
        users = cursor.fetchall()
        for user in users:
            print(user)
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
