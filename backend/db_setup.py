import mysql.connector
from db_config import DB_CONFIG

def setup_database():
    try:
        # Connect initially without database to create it
        config_no_db = DB_CONFIG.copy()
        db_name = config_no_db.pop('database')
        
        conn = mysql.connector.connect(**config_no_db)
        cursor = conn.cursor()
        
        print(f"Checking/Creating database: {db_name}...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")
        
        # 1. Users Table
        print("Ensuring 'users' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                age INT,
                gender VARCHAR(20),
                height FLOAT,
                weight FLOAT,
                bmi FLOAT,
                bp_status VARCHAR(50),
                sugar_status VARCHAR(50),
                activity_level VARCHAR(50),
                smoking VARCHAR(10),
                alcohol VARCHAR(10),
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Migrations for existing Users table
        user_columns = [
            ('height', 'FLOAT'), ('weight', 'FLOAT'), ('bmi', 'FLOAT'),
            ('bp_status', 'VARCHAR(50)'), ('sugar_status', 'VARCHAR(50)'),
            ('activity_level', 'VARCHAR(50)'),            ('smoking', 'VARCHAR(10)'),
            ('alcohol', 'VARCHAR(10)'), ('sleep_hours', 'FLOAT'),
            ('phone', 'VARCHAR(20)'), ('allergies', 'TEXT'),
            ('existing_diseases', 'TEXT'), ('current_medications', 'TEXT'),
            ('past_surgeries', 'TEXT'), ('family_history', 'TEXT'),
            ('blood_group', 'VARCHAR(10)'), ('medical_reports', 'TEXT')
        ]
        
        for col_name, col_type in user_columns:
            cursor.execute(f"SHOW COLUMNS FROM users LIKE '{col_name}'")
            if not cursor.fetchone():
                print(f"Adding missing '{col_name}' column to 'users'...")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        
        # 2. Health Logs Table
        print("Ensuring 'health_logs' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS health_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(100),
                email VARCHAR(100),
                age INT,
                gender VARCHAR(20),
                height FLOAT,
                weight FLOAT,
                bmi FLOAT,
                bp_status VARCHAR(50),
                sugar_status VARCHAR(50),
                activity_level VARCHAR(50),
                smoking VARCHAR(10),
                alcohol VARCHAR(10),
                sleep_hours FLOAT,
                log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check if email column exists in health_logs (for existing DBs)
        cursor.execute("SHOW COLUMNS FROM health_logs LIKE 'email'")
        if not cursor.fetchone():
            print("Adding missing 'email' column to 'health_logs'...")
            cursor.execute("ALTER TABLE health_logs ADD COLUMN email VARCHAR(100) AFTER name")

        # Check if user_id column exists (for very old versions)
        cursor.execute("SHOW COLUMNS FROM health_logs LIKE 'user_id'")
        if not cursor.fetchone():
            print("Adding missing 'user_id' column to 'health_logs'...")
            cursor.execute("ALTER TABLE health_logs ADD COLUMN user_id INT FIRST")
        
        # 3. Predictions Table
        print("Ensuring 'predictions' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                log_id INT,
                diabetes_risk VARCHAR(50),
                heart_risk VARCHAR(50),
                obesity_risk VARCHAR(50),
                hypertension_risk VARCHAR(50),
                recommendations TEXT,
                FOREIGN KEY (log_id) REFERENCES health_logs(id) ON DELETE CASCADE
            )
        """)
        
        # 4. Conversational Logs Table
        print("Ensuring 'conversational_logs' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversational_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                user_message TEXT,
                ai_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 5. Doctors Table
        print("Ensuring 'doctors' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doctors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                specialization VARCHAR(100),
                hospital_name VARCHAR(100),
                latitude FLOAT,
                longitude FLOAT,
                is_available BOOLEAN DEFAULT FALSE,
                phone VARCHAR(20),
                patient_queue TEXT, -- JSON string of connected user IDs
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migrations for existing Doctors table
        doctor_columns = [
            ('specialization', 'VARCHAR(100)'),
            ('hospital_name', 'VARCHAR(100)'),
            ('latitude', 'FLOAT'),
            ('longitude', 'FLOAT'),
            ('is_available', 'BOOLEAN DEFAULT FALSE'),
            ('patient_queue', 'TEXT'),
            ('pending_requests', 'TEXT'),
            ('phone', 'VARCHAR(20)')
        ]
        
        for col_name, col_type in doctor_columns:
            cursor.execute(f"SHOW COLUMNS FROM doctors LIKE '{col_name}'")
            if not cursor.fetchone():
                print(f"Adding missing '{col_name}' column to 'doctors'...")
                cursor.execute(f"ALTER TABLE doctors ADD COLUMN {col_name} {col_type}")

        # 6. Prescribed Activities Table
        print("Ensuring 'prescribed_activities' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prescribed_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                doctor_id INT NOT NULL,
                activity_name VARCHAR(255) NOT NULL,
                scheduled_time VARCHAR(10) NOT NULL, -- Format: HH:MM (24-hour)
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
            )
        """)

        # 7. SOS Alerts Table
        print("Ensuring 'sos_alerts' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sos_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                doctor_id INT,
                status VARCHAR(20) DEFAULT 'Searching',
                latitude FLOAT NOT NULL,
                longitude FLOAT NOT NULL,
                health_details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accepted_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
            )
        """)

        # 8. Emergency Contacts Table
        print("Ensuring 'emergency_contacts' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emergency_contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                relation VARCHAR(50),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 9. Emergency Events Table (Immutable Audit Log)
        print("Ensuring 'emergency_events' table exists...")
        cursor.execute("DROP TABLE IF EXISTS emergency_events")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emergency_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(50) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                event_date VARCHAR(20) NOT NULL,
                event_time VARCHAR(20) NOT NULL,
                trigger_type VARCHAR(50) NOT NULL, -- 'Manual' or 'Automatic'
                location VARCHAR(100) NOT NULL, -- 'Lat, Lng'
                contacts_notified INT DEFAULT 0,
                call_108_status VARCHAR(50) DEFAULT 'Skipped', -- 'Called', 'Skipped', 'Failed'
                status VARCHAR(50) NOT NULL, -- 'Completed', 'Cancelled', 'Active'
                latitude FLOAT,
                longitude FLOAT,
                battery_percentage INT,
                health_details TEXT,
                audio_recording_uri VARCHAR(255),
                camera_image_front VARCHAR(255),
                camera_image_rear VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL DEFAULT NULL,
                audit_trail TEXT, -- JSON array of milestones/logs
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 10. Consultations Table
        print("Ensuring 'consultations' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS consultations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                doctor_id INT NOT NULL,
                patient_id INT NOT NULL,
                symptoms TEXT,
                clinical_findings TEXT,
                diagnosis TEXT,
                vitals TEXT, -- JSON string
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 11. Prescriptions Table
        print("Ensuring 'prescriptions' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prescriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                consultation_id INT,
                doctor_id INT NOT NULL,
                patient_id INT NOT NULL,
                diagnosis TEXT,
                lifestyle_advice TEXT,
                diet_advice TEXT,
                follow_up_date VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 12. Prescription Medicines Table
        print("Ensuring 'prescription_medicines' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prescription_medicines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                prescription_id INT NOT NULL,
                medicine_name VARCHAR(255) NOT NULL,
                dosage VARCHAR(100),
                frequency VARCHAR(100),
                duration VARCHAR(100),
                instructions TEXT,
                FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
            )
        """)

        # 13. Recommended Tests Table
        print("Ensuring 'recommended_tests' table exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recommended_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                prescription_id INT NOT NULL,
                test_name VARCHAR(255) NOT NULL,
                FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
            )
        """)

        conn.commit()

        print("\n[SUCCESS] Database and tables are ready!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Error during setup: {e}")

if __name__ == "__main__":
    setup_database()
