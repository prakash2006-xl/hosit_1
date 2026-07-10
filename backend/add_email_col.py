import mysql.connector
from db_config import DB_CONFIG

def migrate_email():
    print("Connecting to database...")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Adding email column to health_logs table...")
        try:
            # Check if column exists first to avoid error, or just try-catch
            cursor.execute("ALTER TABLE health_logs ADD COLUMN email VARCHAR(100);")
            print("Column 'email' added successfully.")
        except mysql.connector.Error as err:
            print(f"Skipping/Error: {err}")

        conn.commit()
        cursor.close()
        conn.close()
        
    except mysql.connector.Error as err:
        print(f"Database Connection Error: {err}")

if __name__ == "__main__":
    migrate_email()
