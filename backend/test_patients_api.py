import requests
import json

BASE_URL = "http://localhost:5000"

def test_get_patients():
    print("Testing /doctor/patients endpoint...")
    
    # We'll try to find some user IDs from the database first or just use common ones
    # For testing, let's assume IDs 1 and 2 exist
    payload = {
        "patient_ids": [1, 2, 3]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/doctor/patients", json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            patients = response.json()
            print(f"Received {len(patients)} patients")
            for p in patients:
                print(f"- ID: {p['id']}, Name: {p['name']}, Risk: {p.get('heart_risk', 'N/A')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_get_patients()
