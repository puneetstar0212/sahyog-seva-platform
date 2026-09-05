import os
import json

class BhashiniNLPService:
    """
    Mock implementation of the MeitY ULCA (Bhashini) API.
    In a real scenario, this would use BHASHINI_USER_ID, BHASHINI_API_KEY, and PIPELINE_ID
    to perform HTTP requests to the Bhashini inference endpoints.
    """
    
    def __init__(self):
        self.api_key = os.getenv("BHASHINI_API_KEY", "MOCK_KEY")
        
    def translate_text(self, text, source_lang, target_lang):
        """
        Neural Machine Translation (NMT)
        Mocks the translation of text.
        """
        if not text:
            return ""
            
        print(f"[Bhashini] Translating '{text}' from {source_lang} to {target_lang}...")
        
        # Simple mock dictionary for demonstration
        mock_dictionary = {
            "en": {
                "hi": {
                    "hello": "नमस्ते",
                    "i need a plumber": "मुझे एक प्लम्बर की आवश्यकता है",
                    "payment completed": "भुगतान पूरा हुआ",
                    "how much does it cost?": "इसकी कीमत कितनी है?"
                }
            }
        }
        
        lower_text = text.lower()
        if source_lang in mock_dictionary and target_lang in mock_dictionary[source_lang]:
            if lower_text in mock_dictionary[source_lang][target_lang]:
                return mock_dictionary[source_lang][target_lang][lower_text]
                
        # Fallback to returning a mocked string
        return f"[MOCK_TRANSLATION_{target_lang.upper()}]: {text}"

    def speech_to_text(self, audio_base64, source_lang):
        """
        Automatic Speech Recognition (ASR)
        Mocks converting base64 audio to text.
        """
        print(f"[Bhashini] Recognizing speech in {source_lang}...")
        return "I need a plumber for my sink"
        
    def text_to_speech(self, text, target_lang):
        """
        Text-to-Speech (TTS)
        Mocks converting text to base64 audio.
        """
        print(f"[Bhashini] Synthesizing speech for '{text}' in {target_lang}...")
        return "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" # Mock empty WAV base64
