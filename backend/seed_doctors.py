import mysql.connector
from db_config import DB_CONFIG
from werkzeug.security import generate_password_hash
import json

def seed_doctors():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Clean existing doctors to avoid duplicates and ensure exactly 10 clean records
        print("Clearing old doctor records...")
        cursor.execute("DELETE FROM doctors")

        # 10 Sample Doctors
        doctors = [
            {
                "name": "Arjun Mehta",
                "email": "arjun@hosit.ai",
                "password": "password123",
                "specialization": "Cardiologist",
                "hospital_name": "Apollo Heart Institute",
                "lat": 12.9716,
                "lon": 77.5946,
                "is_available": True,
                "phone": "+919876543210"
            },
            {
                "name": "Sarah Khan",
                "email": "sarah@hosit.ai",
                "password": "password123",
                "specialization": "Endocrinologist (Diabetologist)",
                "hospital_name": "Fortis Hospital",
                "lat": 12.9800,
                "lon": 77.6000,
                "is_available": True,
                "phone": "+919876543211"
            },
            {
                "name": "Vikram Singh",
                "email": "vikram@hosit.ai",
                "password": "password123",
                "specialization": "General Physician",
                "hospital_name": "Manipal Clinic",
                "lat": 12.9600,
                "lon": 77.5800,
                "is_available": True,
                "phone": "+919876543212"
            },
            {
                "name": "Priya Sharma",
                "email": "priya@hosit.ai",
                "password": "password123",
                "specialization": "Pediatrician",
                "hospital_name": "St. Johns Hospital",
                "lat": 12.9500,
                "lon": 77.5900,
                "is_available": True,
                "phone": "+919876543213"
            },
            {
                "name": "Amit Patel",
                "email": "amit@hosit.ai",
                "password": "password123",
                "specialization": "Neurologist",
                "hospital_name": "Max Super Speciality",
                "lat": 12.9400,
                "lon": 77.5700,
                "is_available": True,
                "phone": "+919876543214"
            },
            {
                "name": "Neha Reddy",
                "email": "neha@hosit.ai",
                "password": "password123",
                "specialization": "Dermatologist",
                "hospital_name": "Yashoda Hospitals",
                "lat": 12.9300,
                "lon": 77.5600,
                "is_available": True,
                "phone": "+919876543215"
            },
            {
                "name": "Rajesh Kumar",
                "email": "rajesh@hosit.ai",
                "password": "password123",
                "specialization": "Orthopedic Surgeon",
                "hospital_name": "Rockland Hospital",
                "lat": 12.9200,
                "lon": 77.5500,
                "is_available": True,
                "phone": "+919876543216"
            },
            {
                "name": "Kavita Rao",
                "email": "kavita@hosit.ai",
                "password": "password123",
                "specialization": "Psychiatrist",
                "hospital_name": "NIMHANS",
                "lat": 12.9100,
                "lon": 77.5400,
                "is_available": True,
                "phone": "+919876543217"
            },
            {
                "name": "Manoj Bajpayee",
                "email": "manoj@hosit.ai",
                "password": "password123",
                "specialization": "Endocrinologist (Diabetologist)",
                "hospital_name": "Columbia Asia Hospital",
                "lat": 12.9000,
                "lon": 77.5300,
                "is_available": True,
                "phone": "+919876543218"
            },
            {
                "name": "Deepa Joshi",
                "email": "deepa@hosit.ai",
                "password": "password123",
                "specialization": "Cardiologist",
                "hospital_name": "Cloudnine Hospital",
                "lat": 12.8900,
                "lon": 77.5200,
                "is_available": True,
                "phone": "+919876543219"
            }
        ]

        print("Seeding doctors...")
        for doc in doctors:
            hashed = generate_password_hash(doc['password'])
            cursor.execute(
                "INSERT INTO doctors (name, email, password, specialization, hospital_name, latitude, longitude, is_available, phone, patient_queue) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (doc['name'], doc['email'], hashed, doc['specialization'], doc['hospital_name'], doc['lat'], doc['lon'], doc['is_available'], doc['phone'], json.dumps([]))
            )

        conn.commit()
        print("[SUCCESS] Doctor seeding complete! 10 sample doctors are ready.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Seeding error: {e}")

if __name__ == "__main__":
    seed_doctors()

