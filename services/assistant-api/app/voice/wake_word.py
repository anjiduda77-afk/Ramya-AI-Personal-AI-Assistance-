"""
Wake-word detection engine for Ramya AI.
Detects primary wake phrase 'Hey Ramya' and variants ('Hello Ramya', 'Ramya', 'Okey Ramya'),
preserving the original case of user arguments.
"""
import re
from typing import Tuple, Optional

WAKE_PATTERNS = [
    r"\bhey\s+ramya\b",
    r"\bhello\s+ramya\b",
    r"\bokey\s+ramya\b",
    r"\bok\s+ramya\b",
    r"\bramya\b"
]

class WakeWordDetector:
    def detect_in_text(self, text: str) -> Tuple[bool, Optional[str], str]:
        """
        Detects wake word in text while preserving casing of the remainder.
        Returns: (is_detected, detected_phrase, remaining_command)
        """
        lower_text = text.lower()
        for pat in WAKE_PATTERNS:
            match = re.search(pat, lower_text)
            if match:
                phrase = match.group(0)
                start, end = match.span()
                # Slice from original text to preserve title casing
                remaining = (text[:start] + " " + text[end:]).strip(" ,:;-")
                # Remove common polite prefixes
                remaining = re.sub(r"^(please|can you|could you)\s+", "", remaining, flags=re.IGNORECASE).strip()
                return True, phrase, remaining
        return False, None, text.strip()

wake_word_detector = WakeWordDetector()
