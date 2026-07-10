
import requests
import base64
import json

# Setup
API_URL = "http://localhost:5000/stt"
# We need a small dummy audio file.
# Since we can't easily record, we will try to send a text file as audio and expect an error or some response,
# OR we can try to find a base64 of a small WAV.
# This might be tricky.
# Let's just create a dummy file and see if endpoint receives it.

def test_stt_endpoint():
    print("Testing /stt endpoint...")
    
    # Create dummy file
    with open("dummy.wav", "wb") as f:
        f.write(b"RIFF....WAVEfmt ....data....") # corrupted wav header

    files = {'audio': ('dummy.wav', open('dummy.wav', 'rb'), 'audio/wav')}
    
    try:
        response = requests.post(API_URL, files=files, timeout=60)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # We expect a 503 (STT Error) because the audio is garbage, OR a 200 with valid JSON if AI tries to interpret it.
        # But we want to ensure it HIT the endpoint and tried to call OpenRouter.
        
        if response.status_code in [200, 503, 500]:
            print("✅ Endpoint reachable")
            if "STT Error" in response.text or "success" in response.text:
                 print("✅ Logic executed (Attempted AI call)")
        else:
             print("❌ Unexpected status")

    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    test_stt_endpoint()
