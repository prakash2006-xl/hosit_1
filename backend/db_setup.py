import mysql.connector
from db_config import DB_CONFIG
from werkzeug.security import generate_password_hash

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
            ('phone', 'VARCHAR(20)')
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

        # 7. Laboratory Management Tables (separate from AI health assessment tables)
        print("Ensuring laboratory management tables exist...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS laboratories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                logo_url TEXT,
                rating FLOAT DEFAULT 4.5,
                address TEXT,
                latitude FLOAT,
                longitude FLOAT,
                opening_hours VARCHAR(100),
                contact_number VARCHAR(30),
                home_collection BOOLEAN DEFAULT TRUE,
                description TEXT,
                is_open BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        lab_columns = [
            ('logo_url', 'TEXT'), ('rating', 'FLOAT DEFAULT 4.5'), ('address', 'TEXT'),
            ('latitude', 'FLOAT'), ('longitude', 'FLOAT'), ('opening_hours', 'VARCHAR(100)'),
            ('contact_number', 'VARCHAR(30)'), ('home_collection', 'BOOLEAN DEFAULT TRUE'),
            ('description', 'TEXT'), ('is_open', 'BOOLEAN DEFAULT TRUE')
        ]
        for col_name, col_type in lab_columns:
            cursor.execute(f"SHOW COLUMNS FROM laboratories LIKE '{col_name}'")
            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE laboratories ADD COLUMN {col_name} {col_type}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lab_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lab_id INT NOT NULL,
                test_name VARCHAR(150) NOT NULL,
                price DECIMAL(10,2) NOT NULL DEFAULT 0,
                estimated_result_time VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lab_appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                lab_id INT NOT NULL,
                selected_tests TEXT NOT NULL,
                appointment_date DATE NOT NULL,
                appointment_time VARCHAR(20) NOT NULL,
                status VARCHAR(30) DEFAULT 'Appointment Confirmed',
                total_amount DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lab_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                appointment_id INT,
                user_id INT NOT NULL,
                lab_id INT NOT NULL,
                doctor_id INT,
                file_name VARCHAR(255),
                file_type VARCHAR(50),
                file_url TEXT,
                extracted_values TEXT,
                analysis_json TEXT,
                status VARCHAR(30) DEFAULT 'AI Analysis Completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (appointment_id) REFERENCES lab_appointments(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                doctor_id INT,
                lab_id INT,
                title VARCHAR(180) NOT NULL,
                message TEXT,
                type VARCHAR(50),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
            )
        """)

        # 8. Diet Monitoring Tables
        print("Ensuring diet monitoring tables exist...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meal_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                meal_type VARCHAR(50) NOT NULL,
                meal_time VARCHAR(20),
                calories FLOAT DEFAULT 0,
                protein FLOAT DEFAULT 0,
                carbs FLOAT DEFAULT 0,
                fat FLOAT DEFAULT 0,
                fiber FLOAT DEFAULT 0,
                water_ml FLOAT DEFAULT 0,
                image_url TEXT,
                notes TEXT,
                logged_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS diet_prescriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                doctor_id INT NOT NULL,
                diet_name VARCHAR(150) NOT NULL,
                duration_days INT DEFAULT 7,
                goal VARCHAR(100),
                meal_plan TEXT,
                nutrition_summary TEXT,
                water_intake_goal VARCHAR(100),
                exercise_recommendation TEXT,
                sleep_recommendation TEXT,
                restrictions TEXT,
                allowed_foods TEXT,
                avoid_foods TEXT,
                special_instructions TEXT,
                issue_date DATE NOT NULL,
                expiry_date DATE NOT NULL,
                status VARCHAR(30) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS diet_adherence (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                prescription_id INT NOT NULL,
                meal_type VARCHAR(50) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                logged_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_meal_adherence (user_id, prescription_id, meal_type, logged_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (prescription_id) REFERENCES diet_prescriptions(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("SELECT COUNT(*) FROM laboratories")
        if cursor.fetchone()[0] == 0:
            lab_password = generate_password_hash('demo123')
            labs = [
                ('Hosit Diagnostics', 'lab@hosit.ai', lab_password, 4.8, 'MG Road, Bengaluru', 12.9716, 77.5946, '7:00 AM - 8:00 PM', '+91 90000 11111', True, 'Full-service preventive health laboratory with home sample collection.'),
                ('CityCare Labs', 'citycare@hosit.ai', lab_password, 4.5, 'Indiranagar, Bengaluru', 12.9784, 77.6408, '8:00 AM - 7:00 PM', '+91 90000 22222', True, 'Accredited lab for routine blood tests and metabolic panels.'),
                ('WellPath Laboratory', 'wellpath@hosit.ai', lab_password, 4.3, 'Koramangala, Bengaluru', 12.9352, 77.6245, '9:00 AM - 6:00 PM', '+91 90000 33333', False, 'Fast reporting for preventive screening packages.')
            ]
            cursor.executemany("""
                INSERT INTO laboratories
                (name, email, password, rating, address, latitude, longitude, opening_hours, contact_number, home_collection, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, labs)

        cursor.execute("SELECT COUNT(*) FROM lab_tests")
        if cursor.fetchone()[0] == 0:
            cursor.execute("SELECT id FROM laboratories ORDER BY id")
            lab_ids = [row[0] for row in cursor.fetchall()]
            default_tests = [
                ('CBC', 350, '6 Hours'), ('HbA1c', 450, '12 Hours'),
                ('Lipid Profile', 650, '24 Hours'), ('Thyroid Profile', 600, '24 Hours'),
                ('Vitamin D', 900, '24 Hours'), ('Fasting Blood Sugar', 180, '4 Hours')
            ]
            for lab_id in lab_ids:
                cursor.executemany(
                    "INSERT INTO lab_tests (lab_id, test_name, price, estimated_result_time) VALUES (%s, %s, %s, %s)",
                    [(lab_id, name, price, result_time) for name, price, result_time in default_tests]
                )

        conn.commit()

        print("\n✅ Database and tables are ready!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error during setup: {e}")

if __name__ == "__main__":
    setup_database()
