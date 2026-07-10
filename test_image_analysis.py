
import requests
import json
import base64
import mysql.connector

# DB Config needs to be imported or duplicated. Let's try to import from backend if running from root.
# But python path issues might arise.
# Let's just hardcode or read from file.
# Since we are running this script, we can just assume DB_CONFIG is available if we run it from backend dir?
# Or just copy the config for the test.

DB_CONFIG = {
    'user': 'root',
    'password': '',
    'host': 'localhost',
    'database': 'healthcare_db'
}

# 1. Setup
API_URL = "http://localhost:5000/analyze-image"

# Small 1x1 white pixel jpeg base64
dummy_image_b64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=="

def test_analyze_image():
    print("Testing /analyze-image endpoint...")
    
    # Check initial log count
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM conversational_logs")
        initial_count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"Initial DB Count: {initial_count}")
    except Exception as e:
        print(f"DB Error (Initial Check): {e}")
        # Proceed even if DB check fails, maybe DB name is different?
        # But we need to know if it logged.

    # Send Request
    # We need a valid user_id. Let's find one.
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users LIMIT 1")
        user = cursor.fetchone()
        user_id = user[0] if user else 1
        cursor.close()
        conn.close()
    except:
        user_id = 1

    payload = {
        "user_id": user_id,
        "image": dummy_image_b64
    }

    try:
        print(f"Sending POST to {API_URL} with user_id={user_id}")
        response = requests.post(API_URL, json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        # print(f"Response: {response.text}") # Might be large
        
        if response.status_code == 200:
            print("✅ API Call Successful")
            data = response.json()
            if data.get('status') == 'success':
                print("✅ Status is 'success'")
            else:
                print(f"❌ Status is {data.get('status')}")
        else:
            print(f"❌ API Call Failed: {response.text}")
            return

    except Exception as e:
        print(f"Request Error: {e}")
        return

    # Verify DB
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM conversational_logs")
        final_count = cursor.fetchone()[0]
        
        if final_count > initial_count:
            print(f"✅ DB Record Created (New Count: {final_count})")
            
            # Fetch the record
            cursor.execute("SELECT user_message, ai_response FROM conversational_logs ORDER BY id DESC LIMIT 1")
            log = cursor.fetchone()
            print(f"Log Message: {log[0]}")
            print(f"Log Response Length: {len(log[1])}")
        else:
            print("❌ DB Record NOT Created (Count unchanged)")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"DB Verify Error: {e}")

if __name__ == "__main__":
    test_analyze_image()
