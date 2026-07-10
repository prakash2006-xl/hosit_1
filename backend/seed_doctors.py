import mysql.connector
from db_config import DB_CONFIG
from werkzeug.security import generate_password_hash
import json

def seed_doctors():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Sample Doctors
        doctors = [
            {
                "name": "Arjun Mehta",
                "email": "arjun@hosit.ai",
                "password": "password123",
                "specialization": "Cardiologist",
                "hospital_name": "Apollo Heart Institute",
                "lat": 12.9716, # Bangalore center
                "lon": 77.5946,
                "is_available": True
            },
            {
                "name": "Sarah Khan",
                "email": "sarah@hosit.ai",
                "password": "password123",
                "specialization": "Endocrinologist (Diabetologist)",
                "hospital_name": "Fortis Hospital",
                "lat": 12.9800,
                "lon": 77.6000,
                "is_available": True
            },
            {
                "name": "Vikram Singh",
                "email": "vikram@hosit.ai",
                "password": "password123",
                "specialization": "General Physician",
                "hospital_name": "Manipal Clinic",
                "lat": 12.9600,
                "lon": 77.5800,
                "is_available": True
            },
            {
                "name": "Priya Sharma",
                "email": "priya@hosit.ai",
                "password": "password123",
                "specialization": "Surgeon",
                "hospital_name": "St. Johns Hospital",
                "lat": 12.9500,
                "lon": 77.5900,
                "is_available": False
            }
        ]

        print("Seeding doctors...")
        for doc in doctors:
            # Check if exists
            cursor.execute("SELECT id FROM doctors WHERE email = %s", (doc['email'],))
            if cursor.fetchone():
                print(f"Doctor {doc['name']} already exists.")
                continue

            hashed = generate_password_hash(doc['password'])
            cursor.execute(
                "INSERT INTO doctors (name, email, password, specialization, hospital_name, latitude, longitude, is_available, patient_queue) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (doc['name'], doc['email'], hashed, doc['specialization'], doc['hospital_name'], doc['lat'], doc['lon'], doc['is_available'], json.dumps([]))
            )

        conn.commit()
        print("✅ Seeding complete!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Seeding error: {e}")

if __name__ == "__main__":
    seed_doctors()
