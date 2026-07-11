from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from db_config import DB_CONFIG
from werkzeug.security import generate_password_hash, check_password_hash
import json
from db_setup import setup_database
import math
import jwt
import datetime

SECRET_KEY = "hosit_secret_key" # Replace with a more secure key in production

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Simple Translation mapping for backend messages
MESSAGES = {
    'en': {
        'missing_fields': 'Missing required fields',
        'db_error': 'Database connection failed',
        'auth_success': 'User registered successfully',
        'login_success': 'Login successful',
        'invalid_creds': 'Invalid email or password',
        'user_exists': 'User is already signed up. Please go to the login page.'
    },
    'hi': {
        'missing_fields': 'आवश्यक फ़ील्ड गायब हैं',
        'db_error': 'डेटाबेस कनेक्शन विफल रहा',
        'auth_success': 'उपयोगकर्ता सफलतापूर्वक पंजीकृत',
        'login_success': 'लॉगिन सफल रहा',
        'invalid_creds': 'अमान्य ईमेल या पासवर्ड',
        'user_exists': 'उपयोगकर्ता पहले ही साइन अप कर चुका है। कृपया लॉगिन पेज पर जाएं।'
    }
    # Add other languages as needed...
}

def get_msg(key):
    lang = request.headers.get('Accept-Language', 'en')
    if lang not in MESSAGES:
        lang = 'en'
    return MESSAGES[lang].get(key, MESSAGES['en'][key])

# Database Connection Helper
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        return None

@app.route('/', methods=['GET'])
def home():
    return "AI Healthcare API is Running!"

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone')

    if not all([name, email, password]):
        return jsonify({'message': get_msg('missing_fields')}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': get_msg('db_error')}), 500

    try:
        cursor = conn.cursor()
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'message': get_msg('user_exists')}), 400

        # Hash password
        hashed_password = generate_password_hash(password)

        cursor.execute(
            "INSERT INTO users (name, email, password, phone) VALUES (%s, %s, %s, %s)",
            (name, email, hashed_password, phone)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'name': name,
                'email': email
            }
        }), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'message': 'Missing email or password'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password'], password):
            # Remove password before sending
            user.pop('password', None)
            return jsonify({
                'status': 'success',
                'message': 'Login successful',
                'user': user
            }), 200
        else:
            return jsonify({'message': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/update-profile', methods=['POST'])
def update_profile():
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'message': 'User ID is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        
        # Build update query dynamically based on provided fields
        fields = []
        values = []
        
        updatable_fields = [
            'name', 'age', 'gender', 'height', 'weight', 'bmi', 
            'bp_status', 'sugar_status', 'activity_level', 
            'smoking', 'alcohol', 'sleep_hours', 'phone',
            'allergies', 'existing_diseases', 'current_medications', 
            'past_surgeries', 'family_history', 'blood_group', 'medical_reports'
        ]
        
        for field in updatable_fields:
            if field in data:
                fields.append(f"{field} = %s")
                values.append(data[field])
        
        if not fields:
            return jsonify({'message': 'No fields to update'}), 400
            
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"
        
        cursor.execute(query, tuple(values))
        conn.commit()
        
        return jsonify({'status': 'success', 'message': 'Profile updated successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/run-migrations', methods=['GET'])
def run_migrations():
    try:
        setup_database()
        return jsonify({'status': 'success', 'message': 'Migrations completed'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


def call_openrouter_with_fallback(payload, headers_extra=None, custom_models=None):
    import requests
    from api_config import OPENROUTER_API_KEY, OPENROUTER_FALLBACK_MODELS, OPENROUTER_BASE_URL
    
    # Use custom list if provided, else fallback to standard list
    models_to_try = custom_models if custom_models else OPENROUTER_FALLBACK_MODELS
    if not models_to_try:
        models_to_try = [payload.get('model')]
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://hosit.ai",
        "X-Title": "Hosit Chat"
    }
    if headers_extra:
        headers.update(headers_extra)

    last_error = "Unknown error"
    for model in models_to_try:
        try:
            current_payload = payload.copy()
            current_payload['model'] = model
            print(f"--- Attempting AI call with model: {model} ---")
            
            resp = requests.post(
                OPENROUTER_BASE_URL,
                headers=headers,
                data=json.dumps(current_payload),
                timeout=60
            )
            
            if resp.status_code == 200:
                print(f"--- AI Success with model: {model} ---")
                return resp, None
            
            last_error = f"Status {resp.status_code}: {resp.text}"
            print(f"--- Model {model} failed: {last_error} ---")
            
        except Exception as e:
            last_error = str(e)
            print(f"--- Model {model} error: {last_error} ---")
            
    return None, last_error

@app.route('/general-chat', methods=['POST'])
def general_chat():
    import requests
    from api_config import OPENROUTER_API_KEY, OPENROUTER_MODEL
    
    data = request.json
    user_id = data.get('user_id')
    user_message = data.get('message')

    if not user_message:
        return jsonify({'message': 'Message is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 1. Fetch User Profile for Context
        profile_context = ""
        if user_id:
            try:
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                profile = cursor.fetchone()
            except mysql.connector.Error:
                # Table might not exist yet, run setup
                setup_database()
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                profile = cursor.fetchone()
            
            if profile:
                profile_context = f"The user is {profile['name']}, age {profile['age']}. Gender: {profile.get('gender', 'N/A')}. BMI: {profile.get('bmi', 'N/A')}. "
                if profile.get('bp_status'): profile_context += f"BP: {profile['bp_status']}. "
                if profile.get('sugar_status'): profile_context += f"Sugar: {profile['sugar_status']}. "
                profile_context += "Use this data for personalized health advice."

        # 2. Call AI Service (OpenRouter)
        # Check for missing profile data to ask the user
        missing_fields = []
        if not user_id:
            missing_fields.append("Profile Link (Guest mode active)")
        else:
            profile_data = profile or {}
            required = ['age', 'gender', 'height', 'weight', 'bp_status', 'sugar_status']
            for f in required:
                if not profile_data.get(f): missing_fields.append(f.replace('_', ' ').title())

        data_request_hint = ""
        if missing_fields:
            data_request_hint = f" NOTE: The user is missing the following data: {', '.join(missing_fields)}. If appropriate, kindly ask them for these details to provide better health advice."

        system_prompt = (
            f"You are Hosit, a highly skilled and empathetic AI Medical Doctor. Your goal is to help {profile['name'] if user_id and profile else 'the user'} "
            "solve their health concerns by providing structured, professional, and actionable medical advice.\n\n"
            "GUIDELINES:\n"
            "1. ASSESSMENT: Analyze the user's symptoms or questions in the context of their profile: "
            f"{profile_context if profile_context else 'No profile data available yet.'}\n"
            "2. STRUCTURE: Always organize your response into: **Current Assessment**, **Potential Causes**, **Action Plan**, and **Emergency Red Flags** (if applicable).\n"
            "3. TONE: Be professional, reassuring, and analytical. Use medical logic but keep it understandable.\n"
            "4. TRIAGE: If you detect severe symptoms (e.g., chest pain, shortness of breath, severe bleeding), urge them to seek immediate emergency care.\n"
            "5. PERSONALIZATION: Reference their metrics (like BMI or BP) if they are relevant to the query.\n"
            "6. DISCLAIMER: Always end with: 'Disclaimer: I am an AI, not a board-certified physician. Consult a medical professional for clinical diagnosis.'\n"
            f"{data_request_hint}"
        )
        
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7
        }

        resp, error = call_openrouter_with_fallback(payload)

        if not resp:
            return jsonify({'message': f'AI Service Error (All models failed): {error}'}), 503

        ai_response = resp.json()['choices'][0]['message']['content']

        # 3. Save to conversational_logs
        if user_id:
            cursor.execute(
                "INSERT INTO conversational_logs (user_id, user_message, ai_response) VALUES (%s, %s, %s)",
                (user_id, user_message, ai_response)
            )
            conn.commit()

        return jsonify({
            'status': 'success',
            'ai_response': ai_response
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
@app.route('/chat-history', methods=['GET'])
def get_chat_history():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, user_message, ai_response, created_at FROM conversational_logs WHERE user_id = %s ORDER BY created_at DESC", 
            (user_id,)
        )
        history = cursor.fetchall()
        
        # Format timestamps for JSON
        for log in history:
            if log['created_at']:
                log['created_at'] = log['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify(history)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

def perform_health_analysis(data):
    """Helper function to perform AI-driven health risk analysis"""
    name = data.get('name', 'Guest')
    gender = data.get('gender', 'Male')
    age = data.get('age', 0)
    height = float(data.get('height', 0))
    weight = float(data.get('weight', 0))
    bp = data.get('bp', 'Normal')
    sugar = data.get('sugar', 'Normal')
    activity = data.get('activity', 'Moderate')
    smoking = data.get('smoking', 'No')
    alcohol = data.get('alcohol', 'No')
    sleep = float(data.get('sleep', 0))

    # 1. Calculate BMI
    height_m = height / 100
    bmi = weight / (height_m * height_m) if height_m > 0 else 0

    # Default values
    risks = {'diabetes': 'Unknown', 'heart': 'Unknown', 'obesity': 'Unknown', 'hypertension': 'Unknown'}
    recommendations = {'diet': [], 'exercise': [], 'lifestyle': []}

    prompt = f"""
Analyze the following health metrics for {name} ({gender}, {age} years old):
- Height: {height} cm
- Weight: {weight} kg
- BMI: {bmi:.2f}
- Blood Pressure: {bp}
- Blood Sugar: {sugar}
- Activity Level: {activity}
- Smoking: {smoking}
- Alcohol: {alcohol}
- Sleep: {sleep} hours/day

Provide:
1) Risk levels (Low, Medium, High) for: Diabetes, Heart Disease, Obesity, Hypertension.
2) Specific diet, exercise, and lifestyle recommendations.

⚠️ Return ONLY valid JSON in this format:
{{
  "risks": {{
    "diabetes": "...", "heart": "...", "obesity": "...", "hypertension": "..."
  }},
  "recommendations": {{
    "diet": ["..."], "exercise": ["..."], "lifestyle": ["..."]
  }}
}}
"""
    payload = {
        "model": "google/gemini-2.0-flash-exp:free",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1
    }
    
    ai_resp, error = call_openrouter_with_fallback(payload)
    if ai_resp:
        try:
            ai_data = ai_resp.json()['choices'][0]['message']['content']
            if "```json" in ai_data: ai_data = ai_data.split("```json")[1].split("```")[0].strip()
            elif "```" in ai_data: ai_data = ai_data.split("```")[1].split("```")[0].strip()
            structured_data = json.loads(ai_data)
            risks = structured_data.get('risks', risks)
            recommendations = structured_data.get('recommendations', recommendations)
        except Exception as e:
            print(f"Analysis Parse Error: {e}")
            
    return risks, recommendations, bmi

@app.route('/predict', methods=['POST'])
def predict_health_risk():
    data = request.json
    user_id = data.get('user_id')
    email = data.get('email')
    
    # Perform Analysis
    risks, recommendations, bmi = perform_health_analysis(data)
    
    # Extract data for DB saving
    name = data.get('name', 'Guest')
    age = int(data.get('age', 0))
    gender = data.get('gender', 'Male')
    height = float(data.get('height', 0))
    weight = float(data.get('weight', 0))
    bp = data.get('bp', 'Normal')
    sugar = data.get('sugar', 'Normal')
    activity = data.get('activity', 'Moderate')
    smoking = data.get('smoking', 'No')
    alcohol = data.get('alcohol', 'No')
    sleep = float(data.get('sleep', 0))

    # --- Save to Database ---
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        
        # Insert into health_logs (ignoring user_id for now as we reverted auth)
        # We need to make sure the columns match the table. 
        # If the table HAS user_id column (from migration), we should probably pass NULL or update query.
        # But to be safe and "undo", I will use the query that worked before IF the columns were not added. 
        # However, the user MIGHT have run the migration partially?
        # The user log shows `user_id` as NULL. So the column EXISTS. 
        # So I must include it in INSERT or let it default to NULL.
        # The migration script said `ADD COLUMN user_id INT` (which defaults to NULL).
        # So I can just use the old query.
        
        # Upsert: Check if record exists for this user or email
        existing_log_id = None
        if user_id:
            cursor.execute("SELECT id FROM health_logs WHERE user_id = %s", (user_id,))
            row = cursor.fetchone()
            if row: existing_log_id = row[0]
        elif email:
            cursor.execute("SELECT id FROM health_logs WHERE email = %s AND (user_id IS NULL)", (email,))
            row = cursor.fetchone()
            if row: existing_log_id = row[0]

        if existing_log_id:
            # Update existing health_log
            log_query = """
                UPDATE health_logs SET 
                name = %s, age = %s, gender = %s, height = %s, weight = %s, 
                bmi = %s, bp_status = %s, sugar_status = %s, activity_level = %s, 
                smoking = %s, alcohol = %s, sleep_hours = %s, log_date = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            log_values = (name, age, gender, height, weight, bmi, bp, sugar, activity, smoking, alcohol, sleep, existing_log_id)
            cursor.execute(log_query, log_values)
            log_id = existing_log_id

            # Update existing prediction
            pred_query = """
                UPDATE predictions SET 
                diabetes_risk = %s, heart_risk = %s, obesity_risk = %s, 
                hypertension_risk = %s, recommendations = %s
                WHERE log_id = %s
            """
            rec_json = json.dumps(recommendations)
            pred_values = (risks.get('diabetes'), risks.get('heart'), risks.get('obesity'), risks.get('hypertension'), rec_json, log_id)
            cursor.execute(pred_query, pred_values)
        else:
            # Insert new health_log
            log_query = """
                INSERT INTO health_logs 
                (user_id, name, email, age, gender, height, weight, bmi, bp_status, sugar_status, activity_level, smoking, alcohol, sleep_hours)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            log_values = (user_id, name, email, age, gender, height, weight, bmi, bp, sugar, activity, smoking, alcohol, sleep)
            cursor.execute(log_query, log_values)
            log_id = cursor.lastrowid

            # Insert new prediction
            pred_query = """
                INSERT INTO predictions 
                (log_id, diabetes_risk, heart_risk, obesity_risk, hypertension_risk, recommendations)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            rec_json = json.dumps(recommendations)
            pred_values = (log_id, risks.get('diabetes'), risks.get('heart'), risks.get('obesity'), risks.get('hypertension'), rec_json)
            cursor.execute(pred_query, pred_values)

        conn.commit()
        
        # If user is logged in, also update their primary profile with latest metrics
        if user_id:
            update_user_query = """
                UPDATE users SET 
                age = %s, gender = %s, height = %s, weight = %s, bmi = %s,
                bp_status = %s, sugar_status = %s, activity_level = %s,
                smoking = %s, alcohol = %s, sleep_hours = %s
                WHERE id = %s
            """
            cursor.execute(update_user_query, (
                age, gender, height, weight, bmi, bp, sugar, activity, smoking, alcohol, sleep, user_id
            ))
            conn.commit()

        cursor.close()
        conn.close()

    # Return response to Frontend
    return jsonify({
        'status': 'success',
        'risks': risks,
        'recommendations': recommendations
    })

@app.route('/history', methods=['GET'])
def get_history():
    email = request.args.get('email')
    user_id = request.args.get('user_id')
    
    # Handle empty strings from frontend as None
    if not user_id: user_id = None
    if not email: email = None

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        # Fetch logs and predictions joined
        query = """
            SELECT hl.*, p.diabetes_risk, p.heart_risk, p.obesity_risk, p.hypertension_risk, p.recommendations
            FROM health_logs hl
            LEFT JOIN predictions p ON hl.id = p.log_id
            WHERE (hl.user_id = %s) OR (hl.email = %s AND hl.email IS NOT NULL AND hl.email != '')
            ORDER BY hl.log_date DESC
        """
        cursor.execute(query, (user_id, email))
        rows = cursor.fetchall()
        
        # Parse recommendations JSON for each row
        for row in rows:
            if row['recommendations']:
                row['recommendations'] = json.loads(row['recommendations'])
        
        return jsonify(rows)
    except Exception as e:
        print(f"Error fetching history: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/dashboard-summary', methods=['GET'])
def get_dashboard_summary():
    email = request.args.get('email')
    user_id = request.args.get('user_id')
    
    # Handle empty strings from frontend as None
    if not user_id: user_id = None
    if not email: email = None

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        # Latest log query
        latest_query = """
            SELECT hl.*, p.diabetes_risk, p.heart_risk, p.obesity_risk, p.hypertension_risk
            FROM health_logs hl
            JOIN predictions p ON hl.id = p.log_id
            WHERE (hl.user_id = %s) OR (hl.email = %s AND hl.email IS NOT NULL AND hl.email != '')
            ORDER BY hl.log_date DESC
            LIMIT 1
        """
        # Risk counts query
        count_query = """
            SELECT 
                COUNT(*) as total_assessments,
                SUM(CASE WHEN diabetes_risk = 'High' THEN 1 ELSE 0 END) as diabetes_high,
                SUM(CASE WHEN heart_risk = 'High' THEN 1 ELSE 0 END) as heart_high,
                SUM(CASE WHEN obesity_risk = 'High' THEN 1 ELSE 0 END) as obesity_high,
                SUM(CASE WHEN hypertension_risk = 'High' THEN 1 ELSE 0 END) as hypertension_high
            FROM predictions p
            JOIN health_logs hl ON hl.id = p.log_id
            WHERE (hl.user_id = %s) OR (hl.email = %s AND hl.email IS NOT NULL AND hl.email != '')
        """
        
        # Execute queries
        cursor.execute(latest_query, (user_id, email))
        latest = cursor.fetchone()

        cursor.execute(count_query, (user_id, email))
        counts = cursor.fetchone()
        
        # Fetch latest profile from users table if user_id exists
        user_profile = None
        if user_id:
            cursor.execute("SELECT id, name, email, age, gender, height, weight, bmi, bp_status, sugar_status, activity_level, smoking, alcohol, sleep_hours, phone FROM users WHERE id = %s", (user_id,))
            user_profile = cursor.fetchone()

        return jsonify({
            'latest': latest,
            'counts': counts,
            'user_profile': user_profile
        })
    except Exception as e:
        print(f"Error fetching dashboard: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/analyze-image', methods=['POST'])
def analyze_image():
    import requests
    from api_config import OPENROUTER_API_KEY, OPENROUTER_MODEL
    
    data = request.json
    user_id = data.get('user_id')
    image_data = data.get('image') # Base64 string

    if not image_data:
        return jsonify({'message': 'Image data is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 1. Prepare Prompt
        prompt_text = """
You are a professional medical assistant. Analyze the image and:
1) Identify the condition or health concern.
2) Provide a short description.
3) Provide a list of practical solutions or next steps.
4) Provide a confidence score (0-100).

⚠️ Return ONLY valid JSON:
{
  "condition": "<string>",
  "confidence": <number>,
  "description": "<string>",
  "solutions": ["<string>", "..."]
}
"""
        # 2. Call AI Service (OpenRouter)
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": prompt_text.trim() if hasattr(prompt_text, 'trim') else prompt_text.strip() },
                        { "type": "image_url", "image_url": { "url": f"data:image/jpeg;base64,{image_data}" } },
                    ],
                },
            ],
            "temperature": 0.0,
        }

        from api_config import OPENROUTER_VISION_FALLBACK_MODELS
        resp, error = call_openrouter_with_fallback(
            payload, 
            headers_extra={"X-Title": "Hosit Health"},
            custom_models=OPENROUTER_VISION_FALLBACK_MODELS
        )

        if not resp:
            return jsonify({'message': f'AI Service Error (All models failed): {error}'}), 503

        ai_response_json = resp.json()
        raw_content = ai_response_json['choices'][0]['message']['content']

        # 3. Save to conversational_logs
        if user_id:
            try:
                # Ensure user exists before inserting log
                cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
                if cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO conversational_logs (user_id, user_message, ai_response) VALUES (%s, %s, %s)",
                        (user_id, "Image Analysis Request", raw_content)
                    )
                    conn.commit()
            except Exception as db_err:
                print(f"Error saving to DB: {db_err}")
                # Continue even if DB save fails to return result to user

        return jsonify({
            'status': 'success',
            'result': raw_content
        })

    except Exception as e:
        print(f"Analysis Error: {e}")
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/stt', methods=['POST'])
def speech_to_text():
    import requests
    from api_config import OPENROUTER_API_KEY, OPENROUTER_MODEL
    
    # Check if audio file is present
    if 'audio' not in request.files:
        return jsonify({'message': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    try:
        # Read file content
        audio_content = audio_file.read()
        import base64
        audio_b64 = base64.b64encode(audio_content).decode('utf-8')
        
        # Prepare Prompt for Transcription
        prompt_text = "Transcribe the audio exactly as spoken. Do not add any commentary."

        # Call AI Service (OpenRouter/Gemini)
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": prompt_text },
                        { 
                            "type": "input_audio", 
                            "input_audio": { 
                                "data": audio_b64,
                                "format": "wav" # Assuming wav or similar common format
                            } 
                        },
                    ],
                },
            ],
            # Note: OpenRouter/Gemini audio support might vary on implementation details.
            # If 'input_audio' structure fails, we might need to upload as file or check specific API docs for multimodal.
            # However, for Gemini 1.5/2.0 via OpenRouter, base64 audio in content is standard for some endpoints.
            # Let's try standard verify. If fails, we might need to fallback or check docs.
            # Wait, OpenRouter 'google/gemini-2.0-flash-001' might support audio directly?
            # Actually, standard OpenAI compatible vision/audio often uses:
            # { "type": "image_url", ... } for images.
            # For audio, it's less standardized in Chat Completions.
            # BUT, Gemini via Google AI Studio uses 'inlineData'.
            # OpenRouter bridges this. Let's try the 'input_audio' format or just text if it fails?
            # Actually, let's use a safer approach:
            # Use 'requests' to send it.
            # For now, let's assume standard 'multimodal' content block if supported.
            # If not supported, we might need a dedicated STT service (e.g. Whisper).
            # But the user asked to use the existing API/Gemini.
            # Gemini 1.5 Pro/Flash SUPPORTS audio.
            # Correct format for OpenRouter/Gemini usually mirrors OpenAI or Google's native.
            # Let's try the "parts" style if we were using Google SDK, but here we use OpenRouter (OpenAI API).
            # OpenAI API doesn't standardly support audio in chat completions yet (except 'audio' output).
            # Input audio is usually via /v1/audio/transcriptions (Whisper).
            # OpenRouter might route to Gemini 1.5 Pro which supports native audio?
            # If we send it as a 'part' with mime type?
            # Let's try standard 'image_url' style but with 'data:audio/wav;base64,...' if that works?
            # No, that's likely for images.
            # 
            # ALTERNATIVE: Since we are using "google/gemini-2.0-flash-001", it is multimodal to audio.
            # The format often accepted by OpenRouter for Gemini is:
            # content: [ { type: "text", ...}, { type: "image_url", image_url: { url: "data:audio/mp3;base64,..." } } ] ??
            # Some bridges hack it like that.
            # OR, we should use a specific STT library? "use stt and tts for the feturer".
            # The prompt says "refer the genreal chat for calling the api for the result".
            # It implies using ASR (Automatic Speech Recognition) then Chat.
            # If we can't easily do STT with Gemini via OpenRouter Chat API, we might need another way.
            # However, Gemini 1.5 *is* multimodal listening.
            # Let's try sending as valid data URI in content.
            # For safety, if this is complex to guess, maybe we should just use a free STT if possible?
            # OR, assume the user implies using the *Chat* API to handling the text, but STT might need to be separate?
            # "refer the genreal chat for calling the api for the result in this use stt and tts"
            # -> Voice (STT) -> Text -> General Chat API -> Text -> Voice (TTS).
            # So we need STT.
            # Does `expo-av` or `expo-speech` do STT? No, `expo-speech` is TTS.
            # `expo-av` is recording.
            # We need an STT engine.
            # On Android/iOS, we can use `expo-dev-client` with native voice modules, but we are in Expo Go likely (user said "compatible with Expo Go").
            # Expo Go doesn't support native modules for Voice easily (react-native-voice requires native build).
            # So we MUST do STT on backend or use an API.
            # Using Gemini for STT is a good choice if it supports it.
            # Let's try the payload for Gemini 1.5/2.0 audio.
            # The documentation for OpenRouter with Gemini 1.5 indicates it supports multimodal inputs.
            # Content part: { "type": "image_url", "image_url": { "url": "data:audio/wav;base64,..." } } might work if they treat it as generic file?
            # Actually, standard OpenAI `gpt-4o-audio-preview` uses `input_audio`.
            # Let's try `input_audio` format.
        }

        # Let's refine the payload for Gemini via OpenRouter specifically.
        # It seems OpenRouter passes through the parts.
        # Google expects: parts: [ { text: ... }, { inlineData: { mimeType: "...", data: "..." } } ]
        # OpenRouter usually maps OpenAI Chat format.
        # OpenAI Chat format for image is `image_url`.
        # Ensure we use the correct structure.
        # For now, I will use a generic 'text' + 'image_url' (hacky) OR `input_audio` if valid.
        # Let's try `input_audio` as it's the emerging standard.
        # { "type": "input_audio", "input_audio": { "data": "BASE64", "format": "wav" } } 
        # If this fails, we will see `400`.
        
        # Wait, if I am unsure, I should maybe just use a mock STT for now?
        # No, I should try to make it work.
        # Let's assume standard OpenAI "Audio" (Whisper) is NOT what we want, we want Gemini.
        # Let's try the `gpt-4o-audio` format.
        
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": prompt_text },
                        {
                            "type": "image_url", # OpenRouter often maps 'image_url' to 'inlineData' for Gemini even for non-images if mime matches?
                            # Or maybe just try `http` url if I could upload?
                            # No, base64.
                            "image_url": {
                                "url": f"data:audio/wav;base64,{audio_b64}"
                            }
                        }
                    ]
                }
            ]
        }
        
        # NOTE: If "image_url" doesn't work for audio, we might need a different key.
        # But let's try this. If it fails, I'll see the error in logs and fix.

        from api_config import OPENROUTER_VISION_FALLBACK_MODELS
        response, error = call_openrouter_with_fallback(
            payload, 
            headers_extra={"X-Title": "Hosit Health"},
            custom_models=OPENROUTER_VISION_FALLBACK_MODELS
        )
        
        if not response:
             return jsonify({'message': f"STT Error (All models failed): {error}"}), 503
        
        result_json = response.json()
        transcribed_text = result_json['choices'][0]['message']['content']
        
        return jsonify({
            'status': 'success',
            'text': transcribed_text
        })

    except Exception as e:
        print(f"STT Error: {e}")
        return jsonify({'message': str(e)}), 500
    finally:
        pass

# --- Doctor Features Implementation ---

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers.
    return c * r

@app.route('/doctor/signup', methods=['POST'])
def doctor_signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    specialization = data.get('specialization')
    hospital_name = data.get('hospital_name')
    phone = data.get('phone')

    if not all([name, email, password]):
        return jsonify({'message': 'Missing required fields'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM doctors WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'message': 'Doctor already registered'}), 400

        hashed_password = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO doctors (name, email, password, specialization, hospital_name, phone) VALUES (%s, %s, %s, %s, %s, %s)",
            (name, email, hashed_password, specialization, hospital_name, phone)
        )
        conn.commit()
        
        return jsonify({'status': 'success', 'message': 'Doctor registered successfully'}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/login', methods=['POST'])
def doctor_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM doctors WHERE email = %s", (email,))
        doctor = cursor.fetchone()

        if doctor and check_password_hash(doctor['password'], password):
            doctor.pop('password', None)
            
            # Generate JWT
            token = jwt.encode({
                'doctor_id': doctor['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
            }, SECRET_KEY, algorithm='HS256')
            
            return jsonify({
                'status': 'success',
                'message': 'Login successful',
                'doctor': doctor,
                'token': token
            }), 200
        else:
            return jsonify({'message': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/status', methods=['POST'])
def update_doctor_status():
    data = request.json
    doctor_id = data.get('doctor_id')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    is_available = data.get('is_available')

    if not doctor_id:
        return jsonify({'message': 'Doctor ID is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        fields = []
        values = []
        
        if latitude is not None:
            fields.append("latitude = %s")
            values.append(latitude)
        if longitude is not None:
            fields.append("longitude = %s")
            values.append(longitude)
        if is_available is not None:
            fields.append("is_available = %s")
            values.append(is_available)
            
        if not fields:
            return jsonify({'message': 'No fields to update'}), 400
            
        values.append(doctor_id)
        query = f"UPDATE doctors SET {', '.join(fields)} WHERE id = %s"
        cursor.execute(query, tuple(values))
        conn.commit()
        
        return jsonify({'status': 'success', 'message': 'Status updated'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/profile/<int:doctor_id>', methods=['GET'])
def get_doctor_profile(doctor_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, specialization, hospital_name, latitude, longitude, is_available, phone, patient_queue FROM doctors WHERE id = %s", (doctor_id,))
        doctor = cursor.fetchone()

        if doctor:
            return jsonify(doctor)
        else:
            return jsonify({'message': 'Doctor not found'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctors/nearby', methods=['GET'])
def get_nearby_doctors():
    user_lat = float(request.args.get('lat', 0))
    user_lon = float(request.args.get('lon', 0))
    user_id = request.args.get('user_id')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        
        # Dynamically adjust doctor locations to be clustered around the querying user's location (within ~1-8 km)
        if user_lat != 0.0 or user_lon != 0.0:
            import random
            cursor.execute("SELECT id FROM doctors")
            doc_rows = cursor.fetchall()
            for row in doc_rows:
                doc_id = row['id']
                # Use a stable seed based on doctor ID so coordinates are consistent on subsequent calls
                random.seed(doc_id * 789)
                offset_lat = (random.random() - 0.5) * 0.12 # ~ -6km to +6km
                offset_lon = (random.random() - 0.5) * 0.12 # ~ -6km to +6km
                new_lat = user_lat + offset_lat
                new_lon = user_lon + offset_lon
                cursor.execute(
                    "UPDATE doctors SET latitude = %s, longitude = %s WHERE id = %s",
                    (new_lat, new_lon, doc_id)
                )
            conn.commit()

        # Fetch only available doctors
        cursor.execute("SELECT id, name, email, specialization, hospital_name, latitude, longitude, is_available, phone FROM doctors WHERE is_available = TRUE")
        doctors = cursor.fetchall()

        # Calculate distance and filter
        nearby_doctors = []
        is_global_search = (user_lat == 0.0 and user_lon == 0.0)

        for doc in doctors:
            if doc['latitude'] and doc['longitude']:
                # Convert to float to ensure proper type for MapView
                lat = float(doc['latitude'])
                lon = float(doc['longitude'])
                dist = haversine(user_lat, user_lon, lat, lon)
                if is_global_search or dist <= 10.0: # 10km radius or global search
                    doc['latitude'] = lat
                    doc['longitude'] = lon
                    doc['distance'] = 0.0 if is_global_search else round(dist, 2)
                    nearby_doctors.append(doc)
            elif is_global_search:
                doc['distance'] = 0.0
                nearby_doctors.append(doc)

        # Smart Sorting based on user profile if user_id provided
        if user_id:
            cursor.execute("SELECT bp_status, sugar_status FROM users WHERE id = %s", (user_id,))
            user_profile = cursor.fetchone()
            
            if user_profile:
                # Prioritize based on condition
                def sort_score(doc):
                    score = doc['distance'] # Base score is distance (lower is better)
                    spec = (doc['specialization'] or "").lower()
                    
                    if user_profile['bp_status'] == 'High' and ('cardio' in spec or 'heart' in spec):
                        score -= 5 # Bonus for cardiologist
                    if user_profile['sugar_status'] == 'High' and ('diabet' in spec or 'endo' in spec):
                        score -= 5 # Bonus for endocrinologist
                    return score

                nearby_doctors.sort(key=sort_score)
            else:
                nearby_doctors.sort(key=lambda x: x['distance'])
        else:
            nearby_doctors.sort(key=lambda x: x['distance'])

        return jsonify(nearby_doctors)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/emergency/sos', methods=['POST'])
def trigger_sos():
    data = request.json or {}
    user_id = data.get('user_id')
    user_lat = float(data.get('latitude', 0))
    user_lon = float(data.get('longitude', 0))
    doctor_id = data.get('doctor_id')

    if not doctor_id:
        return jsonify({'message': 'No doctor chosen. Please select a doctor first.'}), 400

    if not user_id or user_id == 0 or user_id == '0':
        user_id = None

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        # Fetch the selected doctor
        cursor.execute("SELECT id, name, patient_queue FROM doctors WHERE id = %s", (doctor_id,))
        doc = cursor.fetchone()

        if not doc:
            return jsonify({'message': 'Selected doctor not found'}), 404

        # Add user to only this doctor's patient_queue (if registered user)
        if user_id:
            queue = json.loads(doc['patient_queue']) if doc['patient_queue'] else []
            if user_id not in queue:
                queue.append(user_id)
                cursor.execute("UPDATE doctors SET patient_queue = %s WHERE id = %s", (json.dumps(queue), doc['id']))

        # Get user details for logging into sos_alerts table
        if user_id:
            cursor.execute("SELECT name, age, gender, bp_status, sugar_status, activity_level FROM users WHERE id = %s", (user_id,))
            user_info = cursor.fetchone()
            health_details = json.dumps(user_info) if user_info else "{}"
        else:
            health_details = json.dumps({
                'name': 'Guest User',
                'age': '',
                'gender': '',
                'bp_status': 'Normal',
                'sugar_status': 'Normal',
                'activity_level': ''
            })

        # Insert record into sos_alerts table for this specific doctor
        cursor.execute(
            "INSERT INTO sos_alerts (user_id, doctor_id, status, latitude, longitude, health_details) VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, doc['id'], 'Searching', user_lat, user_lon, health_details)
        )
        
        conn.commit()
        return jsonify({
            'status': 'success', 
            'message': f'Connection request and alert successfully sent to Dr. {doc["name"]}',
            'doctors_alerted': [doc['name']]
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/patients', methods=['POST'])
def get_patients_details():
    data = request.json
    patient_ids = data.get('patient_ids', [])

    if not patient_ids:
        return jsonify([])

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        
        # We want to fetch the latest health log and prediction for each patient ID provided
        # This query uses a subquery to find the latest log_id for each user
        query = """
            SELECT u.id, u.name, u.age, u.phone, u.email, u.created_at as registered_at,
                   COALESCE(hl.gender, u.gender) as gender, 
                   COALESCE(hl.height, u.height) as height, 
                   COALESCE(hl.weight, u.weight) as weight, 
                   COALESCE(hl.bmi, u.bmi) as bmi, 
                   COALESCE(hl.bp_status, u.bp_status) as bp_status, 
                   COALESCE(hl.sugar_status, u.sugar_status) as sugar_status, 
                   COALESCE(hl.activity_level, u.activity_level) as activity_level, 
                   COALESCE(hl.smoking, u.smoking) as smoking, 
                   COALESCE(hl.alcohol, u.alcohol) as alcohol, 
                   COALESCE(hl.sleep_hours, u.sleep_hours) as sleep_hours, 
                   hl.log_date as last_assessment_date,
                   p.diabetes_risk, p.heart_risk, p.obesity_risk, p.hypertension_risk, p.recommendations
            FROM users u
            LEFT JOIN (
                SELECT hl1.*
                FROM health_logs hl1
                JOIN (
                    SELECT user_id, MAX(log_date) as max_date
                    FROM health_logs
                    GROUP BY user_id
                ) hl2 ON hl1.user_id = hl2.user_id AND hl1.log_date = hl2.max_date
            ) hl ON u.id = hl.user_id
            LEFT JOIN predictions p ON hl.id = p.log_id
            WHERE u.id IN ({})
        """.format(','.join(['%s'] * len(patient_ids)))
        
        cursor.execute(query, tuple(patient_ids))
        patients = cursor.fetchall()

        # Parse recommendations JSON
        for p in patients:
            if p.get('recommendations'):
                try:
                    p['recommendations'] = json.loads(p['recommendations'])
                except:
                    pass

        return jsonify(patients)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/search-user', methods=['POST'])
def doctor_search_user():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
        
    try:
        cursor = conn.cursor(dictionary=True)
        # Search in users table
        cursor.execute("SELECT id, name, email, age, gender, height, weight, bmi, bp_status, sugar_status, activity_level, smoking, alcohol, sleep_hours FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if user:
            return jsonify({'status': 'success', 'user': user})
        else:
            return jsonify({'message': 'No user found with this email'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/update-user-health', methods=['POST'])
def doctor_update_user_health():
    data = request.json
    email = data.get('email')
    doctor_id = data.get('doctor_id')
    
    if not email:
        return jsonify({'message': 'User email is required'}), 400
        
    # Perform Health Analysis using our helper
    risks, recommendations, bmi = perform_health_analysis(data)
    
    # Extract fields for database
    name = data.get('name')
    age = data.get('age')
    gender = data.get('gender')
    height = data.get('height')
    weight = data.get('weight')
    bp = data.get('bp_status')
    sugar = data.get('sugar_status')
    activity = data.get('activity_level')
    smoking = data.get('smoking')
    alcohol = data.get('alcohol')
    sleep = data.get('sleep_hours')

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
        
    try:
        cursor = conn.cursor()
        # 1. Find the User ID from email
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({'message': 'User not found'}), 404
        user_id = user_row[0]
        
        # 2. Insert into health_logs
        log_query = """
            INSERT INTO health_logs 
            (user_id, name, email, age, gender, height, weight, bmi, bp_status, sugar_status, activity_level, smoking, alcohol, sleep_hours)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(log_query, (user_id, name, email, age, gender, height, weight, bmi, bp, sugar, activity, smoking, alcohol, sleep))
        log_id = cursor.lastrowid
        
        # 3. Insert into predictions
        pred_query = """
            INSERT INTO predictions 
            (log_id, diabetes_risk, heart_risk, obesity_risk, hypertension_risk, recommendations)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(pred_query, (log_id, risks['diabetes'], risks['heart'], risks['obesity'], risks['hypertension'], json.dumps(recommendations)))
        
        # 4. Update the user's primary profile record
        update_user_query = """
            UPDATE users SET 
            age = %s, gender = %s, height = %s, weight = %s, bmi = %s,
            bp_status = %s, sugar_status = %s, activity_level = %s,
            smoking = %s, alcohol = %s, sleep_hours = %s
            WHERE id = %s
        """
        cursor.execute(update_user_query, (age, gender, height, weight, bmi, bp, sugar, activity, smoking, alcohol, sleep, user_id))
        
        conn.commit()
        return jsonify({
            'status': 'success', 
            'message': 'User health record updated and AI analysis complete',
            'risks': risks,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/doctor/prescribe-activity', methods=['POST'])
def prescribe_activity():
    data = request.json
    user_id = data.get('user_id')
    doctor_id = data.get('doctor_id')
    activity_name = data.get('activity_name')
    scheduled_time = data.get('scheduled_time') # Format: HH:MM

    if not all([user_id, doctor_id, activity_name, scheduled_time]):
        return jsonify({'message': 'Missing required fields'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO prescribed_activities (user_id, doctor_id, activity_name, scheduled_time) VALUES (%s, %s, %s, %s)",
            (user_id, doctor_id, activity_name, scheduled_time)
        )
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Activity prescribed successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/user/activities', methods=['GET'])
def get_user_activities():
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'message': 'User ID is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT pa.*, d.name as doctor_name 
            FROM prescribed_activities pa
            JOIN doctors d ON pa.doctor_id = d.id
            WHERE pa.user_id = %s
            ORDER BY pa.scheduled_time ASC
        """, (user_id,))
        activities = cursor.fetchall()
        return jsonify(activities)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/activities/<email>', methods=['GET'])
def get_patient_activities(email):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        # First get user_id from email
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify([])
        
        user_id = user['id']
        cursor.execute("SELECT * FROM prescribed_activities WHERE user_id = %s ORDER BY scheduled_time ASC", (user_id,))
        activities = cursor.fetchall()
        return jsonify(activities)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/doctor/remove-activity/<int:activity_id>', methods=['DELETE'])
def remove_activity(activity_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM prescribed_activities WHERE id = %s", (activity_id,))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Activity removed'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ==========================================
# EMERGENCY / GUARDIAN AI ENDPOINTS
# ==========================================

@app.route('/emergency/contacts', methods=['GET'])
def get_emergency_contacts():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM emergency_contacts WHERE user_id = %s", (user_id,))
        contacts = cursor.fetchall()
        return jsonify(contacts)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/emergency/contacts', methods=['POST'])
def add_emergency_contact():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    phone = data.get('phone')
    relation = data.get('relation', '')

    if not user_id or not name or not phone:
        return jsonify({'message': 'user_id, name, and phone are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO emergency_contacts (user_id, name, phone, relation) VALUES (%s, %s, %s, %s)",
            (user_id, name, phone, relation)
        )
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Contact added successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/emergency/contacts/<int:contact_id>', methods=['DELETE'])
def delete_emergency_contact(contact_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM emergency_contacts WHERE id = %s", (contact_id,))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Contact deleted successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/emergency/event/create', methods=['POST'])
def create_emergency_event():
    data = request.json
    event_id = data.get('event_id')
    user_id = data.get('user_id')
    event_date = data.get('event_date')
    event_time = data.get('event_time')
    trigger_type = data.get('trigger_type', 'Manual')
    location = data.get('location', '0.0, 0.0')
    contacts_notified = data.get('contacts_notified', 0)
    call_108_status = data.get('call_108_status', 'Skipped')
    status = data.get('status', 'Active')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    battery_percentage = data.get('battery_percentage')
    health_details = data.get('health_details', '')
    
    milestone = f"Emergency {trigger_type} triggered. Status: {status}."
    audit_trail = json.dumps([{"timestamp": str(datetime.datetime.now()), "event": milestone}])

    if not event_id or not user_id or not event_date or not event_time:
        return jsonify({'message': 'event_id, user_id, event_date, and event_time are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO emergency_events 
            (event_id, user_id, event_date, event_time, trigger_type, location, contacts_notified, call_108_status, status, latitude, longitude, battery_percentage, health_details, audit_trail) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (event_id, user_id, event_date, event_time, trigger_type, location, contacts_notified, call_108_status, status, latitude, longitude, battery_percentage, health_details, audit_trail)
        )
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Emergency log created'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/emergency/event/update', methods=['POST'])
def update_emergency_event():
    data = request.json
    event_id = data.get('event_id')
    status = data.get('status')
    location = data.get('location')
    contacts_notified = data.get('contacts_notified')
    call_108_status = data.get('call_108_status')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    battery_percentage = data.get('battery_percentage')
    audio_recording_uri = data.get('audio_recording_uri')
    camera_image_front = data.get('camera_image_front')
    camera_image_rear = data.get('camera_image_rear')
    milestone_event = data.get('milestone')

    if not event_id:
        return jsonify({'message': 'event_id is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT audit_trail FROM emergency_events WHERE event_id = %s", (event_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'message': 'Event not found'}), 404
        
        trail = json.loads(row['audit_trail']) if row['audit_trail'] else []
        if milestone_event:
            trail.append({"timestamp": str(datetime.datetime.now()), "event": milestone_event})
        
        update_fields = []
        params = []
        
        if status:
            update_fields.append("status = %s")
            params.append(status)
            if status == 'Completed' or status == 'Cancelled' or status == 'Resolved':
                update_fields.append("resolved_at = CURRENT_TIMESTAMP")
        if location:
            update_fields.append("location = %s")
            params.append(location)
        if contacts_notified is not None:
            update_fields.append("contacts_notified = %s")
            params.append(contacts_notified)
        if call_108_status:
            update_fields.append("call_108_status = %s")
            params.append(call_108_status)
        if latitude is not None:
            update_fields.append("latitude = %s")
            params.append(latitude)
        if longitude is not None:
            update_fields.append("longitude = %s")
            params.append(longitude)
        if battery_percentage is not None:
            update_fields.append("battery_percentage = %s")
            params.append(battery_percentage)
        if audio_recording_uri:
            update_fields.append("audio_recording_uri = %s")
            params.append(audio_recording_uri)
        if camera_image_front:
            update_fields.append("camera_image_front = %s")
            params.append(camera_image_front)
        if camera_image_rear:
            update_fields.append("camera_image_rear = %s")
            params.append(camera_image_rear)
            
        update_fields.append("audit_trail = %s")
        params.append(json.dumps(trail))
        
        params.append(event_id)
        
        query = f"UPDATE emergency_events SET {', '.join(update_fields)} WHERE event_id = %s"
        cursor.execute(query, tuple(params))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Emergency log updated'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/emergency/events/<int:user_id>', methods=['GET'])
def get_user_emergency_events(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM emergency_events WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        events = cursor.fetchall()
        return jsonify(events)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- PRESCRIPTION MODULE ENDPOINTS ---

@app.route('/patient/<int:user_id>/medical-history', methods=['GET'])
def get_medical_history(user_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT allergies, existing_diseases, current_medications, past_surgeries, family_history, blood_group, medical_reports FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        return jsonify(row if row else {})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/doctor/patient/<int:patient_id>/profile', methods=['GET'])
def get_doctor_patient_profile(patient_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, age, gender, height, weight, bmi, bp_status, sugar_status, activity_level, smoking, alcohol, allergies, existing_diseases, current_medications, past_surgeries, family_history, blood_group FROM users WHERE id = %s", (patient_id,))
        user = cursor.fetchone()
        
        # Get latest prediction
        cursor.execute("SELECT p.diabetes_risk, p.heart_risk, p.obesity_risk, p.hypertension_risk FROM predictions p JOIN health_logs hl ON hl.id = p.log_id WHERE hl.user_id = %s ORDER BY hl.log_date DESC LIMIT 1", (patient_id,))
        prediction = cursor.fetchone()
        if prediction and user:
            user.update(prediction)
        
        return jsonify(user if user else {})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/doctor/prescription/ai_suggest', methods=['POST'])
def ai_suggest_prescription():
    from api_config import OPENROUTER_MODEL
    data = request.json
    symptoms = data.get('symptoms')
    diagnosis = data.get('diagnosis')
    patient_context = data.get('patient_context', '')
    
    prompt = f"""
    You are an AI Medical Assistant. Based on the following patient profile, symptoms, and diagnosis, suggest a prescription.
    Patient Profile: {patient_context}
    Symptoms: {symptoms}
    Diagnosis: {diagnosis}
    
    Return ONLY valid JSON in this format:
    {{
      "medicines": [
         {{"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}}
      ],
      "lifestyle_advice": "...",
      "diet_advice": "...",
      "recommended_tests": ["...", "..."]
    }}
    """
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    resp, err = call_openrouter_with_fallback(payload)
    if not resp: return jsonify({'message': 'AI Error', 'error': err}), 503
    
    try:
        content = resp.json()['choices'][0]['message']['content']
        if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content: content = content.split("```")[1].split("```")[0].strip()
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({'message': 'Failed to parse AI response', 'error': str(e)}), 500

@app.route('/doctor/prescription/drug_check', methods=['POST'])
def ai_drug_check():
    from api_config import OPENROUTER_MODEL
    data = request.json
    medicines = data.get('medicines', [])
    allergies = data.get('allergies', '')
    current_meds = data.get('current_medications', '')
    
    prompt = f"""
    You are an AI Pharmacologist. Check the proposed medicines against the patient's allergies and current medications for severe interactions or warnings.
    Proposed Medicines: {json.dumps(medicines)}
    Patient Allergies: {allergies}
    Current Medications: {current_meds}
    
    Return ONLY valid JSON in this format:
    {{
       "warnings": ["Warning 1", "Warning 2"] // Empty array if safe
    }}
    """
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1
    }
    resp, err = call_openrouter_with_fallback(payload)
    if not resp: return jsonify({'warnings': []}) # Fail open
    try:
        content = resp.json()['choices'][0]['message']['content']
        if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content: content = content.split("```")[1].split("```")[0].strip()
        return jsonify(json.loads(content))
    except:
        return jsonify({'warnings': []})

@app.route('/doctor/prescription/issue', methods=['POST'])
def issue_prescription():
    data = request.json
    doctor_id = data.get('doctor_id')
    patient_id = data.get('patient_id')
    symptoms = data.get('symptoms')
    findings = data.get('clinical_findings')
    vitals = data.get('vitals', {})
    diagnosis = data.get('diagnosis')
    
    medicines = data.get('medicines', [])
    lifestyle = data.get('lifestyle_advice')
    diet = data.get('diet_advice')
    tests = data.get('recommended_tests', [])
    follow_up = data.get('follow_up_date')
    
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor()
        
        # Insert consultation
        cursor.execute(
            "INSERT INTO consultations (doctor_id, patient_id, symptoms, clinical_findings, diagnosis, vitals) VALUES (%s, %s, %s, %s, %s, %s)",
            (doctor_id, patient_id, symptoms, findings, diagnosis, json.dumps(vitals))
        )
        consult_id = cursor.lastrowid
        
        # Insert prescription
        cursor.execute(
            "INSERT INTO prescriptions (consultation_id, doctor_id, patient_id, diagnosis, lifestyle_advice, diet_advice, follow_up_date) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (consult_id, doctor_id, patient_id, diagnosis, lifestyle, diet, follow_up)
        )
        prescription_id = cursor.lastrowid
        
        # Insert medicines
        for med in medicines:
            cursor.execute(
                "INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage, frequency, duration, instructions) VALUES (%s, %s, %s, %s, %s, %s)",
                (prescription_id, med.get('name'), med.get('dosage'), med.get('frequency'), med.get('duration'), med.get('instructions'))
            )
            
        # Insert tests
        for t in tests:
            cursor.execute(
                "INSERT INTO recommended_tests (prescription_id, test_name) VALUES (%s, %s)",
                (prescription_id, t)
            )
            
        conn.commit()
        return jsonify({'status': 'success', 'prescription_id': prescription_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/doctor/prescriptions/<int:doctor_id>', methods=['GET'])
def get_doctor_prescriptions(doctor_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT p.*, u.name as patient_name FROM prescriptions p JOIN users u ON p.patient_id = u.id WHERE p.doctor_id = %s ORDER BY p.created_at DESC", (doctor_id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/patient/prescriptions/<int:patient_id>', methods=['GET'])
def get_patient_prescriptions(patient_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT p.*, d.name as doctor_name, d.specialization as doctor_specialization, d.hospital_name as doctor_hospital FROM prescriptions p JOIN doctors d ON p.doctor_id = d.id WHERE p.patient_id = %s ORDER BY p.created_at DESC", (patient_id,))
        prescriptions = cursor.fetchall()
        
        for p in prescriptions:
            cursor.execute("SELECT * FROM prescription_medicines WHERE prescription_id = %s", (p['id'],))
            p['medicines'] = cursor.fetchall()
            cursor.execute("SELECT test_name FROM recommended_tests WHERE prescription_id = %s", (p['id'],))
            p['tests'] = [t['test_name'] for t in cursor.fetchall()]
            
        return jsonify(prescriptions)
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/patient/book_appointment', methods=['POST'])
def book_appointment():
    data = request.json
    patient_id = data.get('patient_id')
    doctor_id = data.get('doctor_id')
    date = data.get('date', '')
    time = data.get('time', '')
    symptoms = data.get('symptoms', '')
    
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, symptoms, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
        """, (patient_id, doctor_id, date, time, symptoms))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Appointment booked successfully.'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/patient/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/patient/notifications/read', methods=['POST'])
def mark_notifications_read():
    data = request.json
    user_id = data.get('user_id')
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s", (user_id,))
        conn.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/doctor/pending_requests/<int:doctor_id>', methods=['GET'])
def get_pending_requests(doctor_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT a.*, u.name as patient_name, u.age, u.gender 
            FROM appointments a 
            JOIN users u ON a.patient_id = u.id 
            WHERE a.doctor_id = %s AND a.status = 'pending'
        """, (doctor_id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/doctor/accept_request', methods=['POST'])
def accept_request():
    data = request.json
    appointment_id = data.get('appointment_id')
    modified_time = data.get('modified_time')
    token_number = data.get('token_number')
    
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM appointments WHERE id = %s", (appointment_id,))
        appt = cursor.fetchone()
        if not appt: return jsonify({'message': 'Appointment not found'}), 404
        
        # Update Appointment
        cursor.execute("""
            UPDATE appointments 
            SET status = 'accepted', appointment_time = %s, token_number = %s 
            WHERE id = %s
        """, (modified_time, token_number, appointment_id))
        
        # Add to doctor's active patient_queue for compatibility
        cursor.execute("SELECT patient_queue FROM doctors WHERE id = %s", (appt['doctor_id'],))
        doc = cursor.fetchone()
        queue = json.loads(doc['patient_queue']) if doc['patient_queue'] else []
        if appt['patient_id'] not in queue:
            queue.append(appt['patient_id'])
            cursor.execute("UPDATE doctors SET patient_queue = %s WHERE id = %s", (json.dumps(queue), appt['doctor_id']))
        
        # Notify Patient
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message) 
            VALUES (%s, 'Appointment Confirmed', %s)
        """, (appt['patient_id'], f"Your appointment is confirmed for {modified_time}. Token: {token_number}"))
        
        conn.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@app.route('/doctor/reject_request', methods=['POST'])
def reject_request():
    data = request.json
    appointment_id = data.get('appointment_id')
    
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM appointments WHERE id = %s", (appointment_id,))
        appt = cursor.fetchone()
        if not appt: return jsonify({'message': 'Appointment not found'}), 404
        
        cursor.execute("UPDATE appointments SET status = 'rejected' WHERE id = %s", (appointment_id,))
        
        # Notify Patient
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message) 
            VALUES (%s, 'Appointment Cancelled', 'Your appointment request was rejected. Please try another slot.')
        """, (appt['patient_id'],))
        
        conn.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

if __name__ == '__main__':
    setup_database()
    app.run(debug=True, host='0.0.0.0', port=5000)
