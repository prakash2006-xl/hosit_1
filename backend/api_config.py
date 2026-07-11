import os

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
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
