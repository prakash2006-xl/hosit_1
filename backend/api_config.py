import os

def load_env_key():
    for path in ['.env', '../.env', 'backend/.env']:
        if os.path.exists(path):
            with open(path, 'r') as f:
                for line in f:
                    if line.startswith('EXPO_PUBLIC_OPENROUTER_API_KEY='):
                        return line.split('=', 1)[1].strip()
    return os.environ.get('OPENROUTER_API_KEY', 'YOUR_OPENROUTER_API_KEY')

OPENROUTER_API_KEY = load_env_key()
OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'

OPENROUTER_FALLBACK_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'openrouter/free',
]

OPENROUTER_VISION_FALLBACK_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'meta-llama/llama-3.2-90b-vision-instruct:free',
    'openrouter/free',
]
