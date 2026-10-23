"""
Voice Activity Detection (VAD) and Silence Endpointing for Ramya AI.
"""
import math
import struct
from typing import Tuple

class SimpleVAD:
    def __init__(self, energy_threshold: float = 0.02, silence_duration_sec: float = 1.2):
        self.energy_threshold = energy_threshold
        self.silence_duration_sec = silence_duration_sec
        self.consecutive_silent_frames = 0

    def calculate_rms(self, pcm_bytes: bytes) -> float:
        """Calculates RMS energy for 16-bit PCM audio."""
        if not pcm_bytes:
            return 0.0
        count = len(pcm_bytes) // 2
        if count == 0:
            return 0.0
        format_str = f"<{count}h"
        try:
            shorts = struct.unpack(format_str, pcm_bytes)
            sum_squares = sum(s * s for s in shorts)
            mean_square = sum_squares / count
            return math.sqrt(mean_square) / 32768.0
        except Exception:
            return 0.0

    def process_frame(self, pcm_bytes: bytes) -> Tuple[bool, float, bool]:
        """
        Processes audio frame.
        Returns: (is_speech, rms_energy, is_silence_endpoint)
        """
        rms = self.calculate_rms(pcm_bytes)
        is_speech = rms >= self.energy_threshold

        if not is_speech:
            self.consecutive_silent_frames += 1
        else:
            self.consecutive_silent_frames = 0

        # Assuming 100ms frames, 12 silent frames = 1.2s silence
        is_endpoint = (self.consecutive_silent_frames >= int(self.silence_duration_sec * 10))
        return is_speech, rms, is_endpoint

    def reset(self):
        self.consecutive_silent_frames = 0

vad = SimpleVAD()
