

// export const API_URL = 'https://aswinkumar.zethub.in';

// console.log('🌍 Using Production API URL:', API_URL);


// export const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY';
// export const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';




import Constants from 'expo-constants';
import { Platform } from 'react-native';

// =======================================================================
// API CONFIGURATION
// =======================================================================
// Automatically detects your machine's local IP for Expo Go.
// =======================================================================

const getApiUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:5000';
    }

    // Get host URI (includes IP and port, e.g., '192.168.1.5:8081')
    const hostUri = Constants.expoConfig?.hostUri;

    if (!hostUri) {
        // Fallback for production or when hostUri is unavailable
        return 'http://localhost:5000';
    }

    // Extract IP address and use backend port 5000
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
};

export const API_URL = getApiUrl();

console.log('Detected Backend API URL:', API_URL);

// Manual overrides (keep for reference)
// Android Emulator: 'http://10.0.2.2:5000'
// Standard: 'http://10.20.39.105:5000'

// export const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY';
// export const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';

export const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';
export const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const OPENROUTER_FALLBACK_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'openrouter/free',
];

export const OPENROUTER_VISION_FALLBACK_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'meta-llama/llama-3.2-90b-vision-instruct:free',
    'openrouter/free',
];

// Placeholder for key