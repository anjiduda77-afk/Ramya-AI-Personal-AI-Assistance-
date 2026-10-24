"""
Emotional Awareness & Empathy Engine for Ramya AI.
Recognizes conversational cues indicating confusion, frustration, urgency, or excitement,
and shapes response tone appropriately without claiming human consciousness or sentience.
"""
import re
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("ramya.intelligence.emotion")

class EmotionalEngine:
    # Lexicons for conversational cues
    CONFUSION_PATTERNS = [
        r"\b(?:i\s+don['’]?t\s+understand|what\s+do\s+you\s+mean|i['’]?m\s+confused|doesn['’]?t\s+make\s+sense|explain\s+simply|too\s+complicated)\b"
    ]
    FRUSTRATION_PATTERNS = [
        r"\b(?:this\s+isn['’]?t\s+working|why\s+can['’]?t\s+you|ugh|annoying|wrong\s+again|not\s+what\s+i\s+asked|stop\s+failing|useless)\b"
    ]
    URGENCY_PATTERNS = [
        r"\b(?:urgent|hurry|quickly|fast|asap|right\s+now|emergency|immediately)\b"
    ]
    EXCITEMENT_PATTERNS = [
        r"\b(?:awesome|love\s+it|great\s+job|amazing|wow|fantastic|thank\s+you\s+so\s+much|perfect)\b"
    ]

    def detect_emotion(self, query: str) -> str:
        """
        Analyzes query for emotional tone.
        Returns: 'confused' | 'frustrated' | 'urgent' | 'excited' | 'neutral'
        """
        lower = query.lower().strip()

        for pat in self.CONFUSION_PATTERNS:
            if re.search(pat, lower):
                return "confused"

        for pat in self.FRUSTRATION_PATTERNS:
            if re.search(pat, lower):
                return "frustrated"

        for pat in self.URGENCY_PATTERNS:
            if re.search(pat, lower):
                return "urgent"

        for pat in self.EXCITEMENT_PATTERNS:
            if re.search(pat, lower):
                return "excited"

        return "neutral"

    def adapt_response(self, raw_message: str, spoken_response: str, emotion: str) -> Tuple[str, str]:
        """
        Adapts user-facing message and spoken response based on detected emotion.
        Never claims biological consciousness or emotions.
        """
        if emotion == "confused":
            prefix = "Let me break that down simply:\n\n"
            spoken_prefix = "Let me explain that simply. "
            return prefix + raw_message, spoken_prefix + spoken_response

        elif emotion == "frustrated":
            prefix = "I understand this has been challenging. Let's fix this right now:\n\n"
            spoken_prefix = "I understand. Let's get this sorted out right away. "
            return prefix + raw_message, spoken_prefix + spoken_response

        elif emotion == "urgent":
            # For urgent requests, eliminate wordiness
            clean_spoken = spoken_response.replace("Certainly!", "").replace("Sure,", "").strip()
            return raw_message, clean_spoken

        elif emotion == "excited":
            spoken_prefix = "Glad to help! "
            return raw_message, spoken_prefix + spoken_response

        return raw_message, spoken_response

emotional_engine = EmotionalEngine()
