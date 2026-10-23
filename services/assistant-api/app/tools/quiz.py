"""
Quiz and Learning Center for Ramya AI.
Provides topic-based and document-based multiple-choice quizzes,
voice explanations, and score tracking.
"""
import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.database.db import db

logger = logging.getLogger("ramya.tools.quiz")

DEFAULT_QUESTION_BANK = [
    {
        "id": "q1",
        "topic": "Artificial Intelligence",
        "question": "What is the primary role of a wake-word detection engine in a voice assistant?",
        "options": [
            "Continuous cloud speech recognition",
            "Low-power local acoustic keyword spotting",
            "Synthesizing high fidelity speech audio",
            "Managing database transactions"
        ],
        "correctIndex": 1,
        "explanation": "A wake-word engine operates locally with low compute to spot specific keywords like 'Hey Ramya' before activating the full voice pipeline."
    },
    {
        "id": "q2",
        "topic": "Computer Architecture",
        "question": "Which memory type provides the fastest access time to the CPU?",
        "options": [
            "DRAM Main Memory",
            "L1 Cache Registers",
            "Solid State Drive (NVMe)",
            "L3 Shared Cache"
        ],
        "correctIndex": 1,
        "explanation": "L1 cache and CPU registers sit directly on the CPU die and have single-cycle or sub-nanosecond access latency."
    },
    {
        "id": "q3",
        "topic": "Python Programming",
        "question": "What is the primary purpose of Python's 'asyncio' library?",
        "options": [
            "Compiling Python bytecode to C",
            "Writing asynchronous concurrent code using coroutines",
            "Performing multi-threaded CPU-heavy matrix math",
            "Rendering desktop GUI windows"
        ],
        "correctIndex": 1,
        "explanation": "asyncio provides single-threaded concurrent code execution using an event loop and coroutines (async/await) optimized for I/O bound tasks."
    },
    {
        "id": "q4",
        "topic": "Operating Systems",
        "question": "On Windows, which API subsystem provides UI tree automation and accessibility element discovery?",
        "options": [
            "DirectX 12",
            "Windows UI Automation (UIA)",
            "Winsock 2",
            "Kernel Device Driver Framework"
        ],
        "correctIndex": 1,
        "explanation": "Windows UI Automation (UIA) allows assistive technologies and automation tools to examine and interact with user interface elements."
    }
]

class QuizManager:
    def get_questions(self, topic: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns quiz questions filtered by topic or all."""
        if not topic or topic.lower() == "all":
            return DEFAULT_QUESTION_BANK
        return [q for q in DEFAULT_QUESTION_BANK if topic.lower() in q["topic"].lower()]

    def verify_answer(self, question_id: str, selected_index: int) -> Dict[str, Any]:
        """Checks selected answer and returns explanation."""
        matched = next((q for q in DEFAULT_QUESTION_BANK if q["id"] == question_id), None)
        if not matched:
            return {"success": False, "message": "Question not found."}

        is_correct = (selected_index == matched["correctIndex"])
        return {
            "success": True,
            "isCorrect": is_correct,
            "correctIndex": matched["correctIndex"],
            "explanation": matched["explanation"],
            "message": "Correct answer!" if is_correct else f"Incorrect. The correct option was: {matched['options'][matched['correctIndex']]}."
        }

quiz_manager = QuizManager()
