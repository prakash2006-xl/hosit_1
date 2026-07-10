import mysql.connector
from db_config import DB_CONFIG

try:
    print(f"Attempting to connect to {DB_CONFIG['host']}...")
    conn = mysql.connector.connect(**DB_CONFIG)
    if conn.is_connected():
        print("✅ SUCCESS: Connected to MySQL database!")
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        print("Tables found:", tables)
        conn.close()
    else:
        print("❌ FAILED: Connection established but not connected?")
except mysql.connector.Error as err:
    print(f"❌ ERROR: {err}")
    if err.errno == 1049:
        print("💡 TIP: The database 'healthcare_db' does not exist. Please import the schema.sql file or create the database manually.")
    elif err.errno == 2003:
        print("💡 TIP: Could not connect to host. Is XAMPP MySQL running?")
    elif err.errno == 1045:
        print("💡 TIP: Access denied. Check your username and password in db_config.py.")
