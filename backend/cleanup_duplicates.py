import mysql.connector
from db_config import DB_CONFIG

def cleanup_duplicates():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        print("Starting cleanup of duplicate health logs...")
        
        # 1. Identify duplicates based on user_id (where present)
        cursor.execute("""
            SELECT user_id, MAX(id) as latest_id, COUNT(*) as count 
            FROM health_logs 
            WHERE user_id IS NOT NULL 
            GROUP BY user_id 
            HAVING count > 1
        """)
        user_duplicates = cursor.fetchall()
        
        for dup in user_duplicates:
            user_id = dup['user_id']
            latest_id = dup['latest_id']
            print(f"Cleaning user_id {user_id}: keeping log {latest_id}, removing others.")
            # Delete other logs for this user (foreign key takes care of predictions if ON DELETE CASCADE is set)
            cursor.execute("DELETE FROM health_logs WHERE user_id = %s AND id != %s", (user_id, latest_id))
            
        # 2. Identify duplicates based on email (where user_id is NULL)
        cursor.execute("""
            SELECT email, MAX(id) as latest_id, COUNT(*) as count 
            FROM health_logs 
            WHERE user_id IS NULL AND email IS NOT NULL AND email != ''
            GROUP BY email 
            HAVING count > 1
        """)
        email_duplicates = cursor.fetchall()
        
        for dup in email_duplicates:
            email = dup['email']
            latest_id = dup['latest_id']
            print(f"Cleaning email {email}: keeping log {latest_id}, removing others.")
            cursor.execute("DELETE FROM health_logs WHERE email = %s AND user_id IS NULL AND id != %s", (email, latest_id))
            
        conn.commit()
        print("Cleanup completed successfully.")
        
    except mysql.connector.Error as err:
        print(f"Error during cleanup: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    cleanup_duplicates()
