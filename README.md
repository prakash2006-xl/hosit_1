# HOSIT - AI-Based Personalized Preventive Healthcare System 🩺

A comprehensive mobile application built with **React Native (Expo)** and **Python (Flask)** that leverages AI rule-based logic to provide personalized health risk predictions and preventive recommendations.

## 📝 Feature Description / Project Capabilities Statement
The proposed system includes an AI-driven health risk prediction engine that generates a numerical health risk score for lifestyle-related diseases such as diabetes, heart disease, obesity, and hypertension. Based on user-provided health, lifestyle, and behavioral inputs, the system delivers personalized daily wellness and preventive plans covering diet, physical activity, sleep, and hydration. To improve transparency and user trust, the system highlights key factors influencing the risk through explainable AI insights. A what-if simulation feature allows users to observe how lifestyle changes can reduce future health risks in real time. The platform also supports symptom-based risk mapping, age-specific preventive guidance, progress tracking over time, and emergency alerts for high-risk conditions. All recommendations are localized and designed with a privacy-first approach, ensuring proactive, user-friendly, and preventive healthcare support rather than medical diagnosis.

## 🚀 Key Features

- **AI Health Risk Prediction**: Analyzes user data (age, weight, height, blood pressure, etc.) to predict risks for Diabetes, Heart Disease, Obesity, and Hypertension.
- **Personalized Recommendations**: Provides tailored advice on diet, exercise, and lifestyle based on individual risk profiles.
- **Interactive Health Chatbot**: A seamless chat interface for health assessments and general inquiries.
- **Image-Based Assistance**: Capability to handle image-related healthcare queries (Image Chat).
- **Comprehensive Dashboard**: Visual results for health logs and BMI calculation.
- **Backend Logging**: Securely stores health data and predictions in a MySQL database.

## 🛠️ Tech Stack

### Frontend
- **React Native** (Expo)
- **Expo Router** (File-based routing)
- **React Navigation**
- **React Native Reanimated & Haptics** (Smooth UI interactions)

### Backend
- **Python (Flask)**
- **Flask-CORS** (Handling cross-origin requests)
- **MySQL** (Database for health logs and predictions)
- **MySQL Connector Python**

## 📥 Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MySQL Server
- Expo Go app (on your mobile device)

### 2. Frontend Setup
```bash
# Navigate to the root directory
npm install

# Start the Expo development server
npx expo start
```
Scan the QR code with the Expo Go app to run it on your device.

### 3. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up your MySQL database
# Run the schema.sql script in your MySQL environment
# Update db_config.py with your database credentials

# Run the Flask API
python app.py
```

## 📁 Project Structure

```text
├── app/                  # Expo Router pages (Screens)
├── backend/              # Flask API and Database scripts
├── components/           # Reusable UI components (ChatBot, UI elements)
├── constants/            # Application constants and config
├── hooks/                # Custom React hooks
├── assets/               # Images and fonts
├── app.json              # Expo configuration
└── README.md             # Project documentation
```

## 🤝 Contributing
Feel free to fork this repository and submit pull requests for any enhancements or bug fixes.

---
*Created for proactive health management and preventive care.*
# hosit_1
