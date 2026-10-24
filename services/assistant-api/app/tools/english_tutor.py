"""
Personalised English Learning Tutor & Telugu-to-English Natural Translator.
Provides daily practical conversational lessons, spaced repetition, revision prompts,
and natural conversational English translation for Ramya AI.
"""
import re
import uuid
import logging
from datetime import datetime, date
from typing import Dict, Any, Optional, List
from app.database.db import db

logger = logging.getLogger("ramya.tools.english_tutor")

# Curated idiomatic conversational translations for Telugu and daily intents
IDIOMATIC_TRANSLATIONS = [
    {
        "patterns": [
            r"arrive\s+in\s+ten\s+minutes",
            r"be\s+there\s+in\s+ten\s+minutes",
            r"10\s+minutes\s+lo\s+vast(a|anu)",
            r"పది\s+నిమిషాల్లో\s+(వస్తాను|అక్కడ\s+ఉంటాను)"
        ],
        "natural_english": "I'll be there in ten minutes.",
        "simple_explanation": "In natural English, 'I'll be there in ten minutes' sounds friendly and confident."
    },
    {
        "patterns": [
            r"have\s+you\s+eaten",
            r"tinnara",
            r"bhojanam\s+chesara",
            r"భోజనం\s+చేశారా",
            r"తిన్నారా"
        ],
        "natural_english": "Have you eaten?",
        "simple_explanation": "Use 'Have you eaten?' to politely ask about someone's meal or well-being."
    },
    {
        "patterns": [
            r"catch\s+up\s+later",
            r"tarvata\s+matladadam",
            r"తర్వాత\s+మాట్లాడుకుందాం"
        ],
        "natural_english": "Let's catch up later.",
        "simple_explanation": "'Catch up' is the natural, friendly idiom for talking or meeting again soon."
    },
    {
        "patterns": [
            r"running\s+(a\s+bit\s+)?late",
            r"late\s+avutondi",
            r"ఆలస్యం\s+అవుతోంది"
        ],
        "natural_english": "I'm running a bit late.",
        "simple_explanation": "Use 'I'm running a bit late' instead of 'I am coming late' for natural everyday communication."
    },
    {
        "patterns": [
            r"repeat\s+that",
            r"malli\s+cheppandi",
            r"మళ్ళీ\s+చెప్పండి"
        ],
        "natural_english": "Could you please repeat that?",
        "simple_explanation": "A polite and professional phrase when you need someone to say something again."
    },
    {
        "patterns": [
            r"how\s+are\s+you",
            r"bagunnara",
            r"బాగున్నారా"
        ],
        "natural_english": "How are you doing?",
        "simple_explanation": "'How are you doing?' or 'How's it going?' is much more conversational than formal textbooks."
    }
]

class EnglishTutor:
    def __init__(self):
        pass

    def get_progress(self) -> Dict[str, Any]:
        """Retrieves user's learning progress and pending revision item."""
        with db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, current_level, total_learned, streak_days, last_lesson_date, pending_revision_sentence
                FROM english_learning_progress
                WHERE id = 'current';
                """
            ).fetchone()
            
            total_records = conn.execute("SELECT COUNT(*) FROM english_learning_records;").fetchone()[0]
            mastered_count = conn.execute("SELECT COUNT(*) FROM english_learning_records WHERE status = 'mastered' OR status = 'revised';").fetchone()[0]

            if not row:
                return {
                    "current_level": "Beginner",
                    "total_learned": mastered_count,
                    "total_lessons_available": total_records,
                    "streak_days": 1,
                    "last_lesson_date": None,
                    "pending_revision_sentence": "Have you eaten?",
                    "needs_revision_prompt": True
                }

            return {
                "current_level": row[1],
                "total_learned": mastered_count,
                "total_lessons_available": total_records,
                "streak_days": row[3],
                "last_lesson_date": row[4],
                "pending_revision_sentence": row[5] or "Have you eaten?",
                "needs_revision_prompt": bool(row[5])
            }

    def start_or_check_daily_session(self) -> Dict[str, Any]:
        """
        Initiates daily English practice.
        If a previous lesson exists, proactively asks:
        'Would you like to revise yesterday's sentence before learning a new one?'
        """
        progress = self.get_progress()
        prev_sentence = progress.get("pending_revision_sentence")

        if prev_sentence:
            lesson_info = self.get_lesson_by_sentence(prev_sentence)
            prompt_question = f"Would you like to revise yesterday’s sentence before learning a new one?"
            spoken = f"Hello! Would you like to revise yesterday’s sentence before learning a new one?"
            return {
                "status": "awaiting_choice",
                "message": prompt_question,
                "spoken_response": spoken,
                "needs_revision_prompt": True,
                "previous_sentence": prev_sentence,
                "lesson_details": lesson_info,
                "options": ["Revise yesterday's sentence", "Learn a new sentence"]
            }

        # Otherwise give next lesson directly
        return self.get_next_lesson()

    def process_choice(self, user_choice: str) -> Dict[str, Any]:
        """
        Handles the user's choice:
        - Revision: repeats and tests previous lesson.
        - New Lesson: advances to next sentence.
        """
        lower = user_choice.lower().strip()
        progress = self.get_progress()
        prev_sentence = progress.get("pending_revision_sentence", "Have you eaten?")

        # Check if user wants revision
        if any(w in lower for w in ["revise", "revision", "repeat", "yesterday", "yes", "sure", "ok", "okay"]):
            lesson = self.get_lesson_by_sentence(prev_sentence)
            if not lesson:
                lesson = self.get_lesson_by_day(1)

            # Record revision in database
            with db.get_connection() as conn:
                conn.execute(
                    """
                    UPDATE english_learning_records
                    SET status = 'revised', review_count = review_count + 1, last_reviewed = CURRENT_TIMESTAMP
                    WHERE id = ?;
                    """,
                    (lesson["id"],)
                )

            spoken = f"Yesterday’s sentence was: '{lesson['sentence_en']}'. In Telugu: {lesson['meaning_telugu']}. Let's practice saying it together."
            message = (
                f"**Revision Lesson:**\n\n"
                f"**Sentence:** \"{lesson['sentence_en']}\"\n\n"
                f"**Telugu Meaning:** {lesson['meaning_telugu']}\n\n"
                f"**Simple English:** {lesson['meaning_simple_en']}\n\n"
                f"💡 **Grammar & Practical Tip:** {lesson.get('grammar_note', '')}\n\n"
                f"**Speaking Practice:** Try saying \"{lesson['sentence_en']}\" out loud!"
            )
            return {
                "status": "revision_active",
                "message": message,
                "spoken_response": spoken,
                "lesson": lesson,
                "is_revision": True
            }

        # Otherwise user chose new lesson
        return self.get_next_lesson()

    def get_next_lesson(self) -> Dict[str, Any]:
        """Fetches the next unlearned or subsequent lesson."""
        with db.get_connection() as conn:
            # Find next lesson that has not been revised or mastered, or next day
            row = conn.execute(
                """
                SELECT id, lesson_day, sentence_en, meaning_telugu, meaning_simple_en, grammar_note, status, review_count
                FROM english_learning_records
                WHERE status = 'new'
                ORDER BY lesson_day ASC
                LIMIT 1;
                """
            ).fetchone()

            if not row:
                # If all lessons visited, pick the one reviewed longest ago (spaced repetition)
                row = conn.execute(
                    """
                    SELECT id, lesson_day, sentence_en, meaning_telugu, meaning_simple_en, grammar_note, status, review_count
                    FROM english_learning_records
                    ORDER BY last_reviewed ASC
                    LIMIT 1;
                    """
                ).fetchone()

            if not row:
                return {
                    "status": "completed",
                    "message": "You have completed all available daily lessons! Excellent work.",
                    "spoken_response": "You have completed all current lessons! Great job."
                }

            lesson = {
                "id": row[0],
                "lesson_day": row[1],
                "sentence_en": row[2],
                "meaning_telugu": row[3],
                "meaning_simple_en": row[4],
                "grammar_note": row[5],
                "status": row[6],
                "review_count": row[7]
            }

            # Update progress: set this sentence as pending revision for next time
            today_str = date.today().isoformat()
            conn.execute(
                """
                UPDATE english_learning_progress
                SET last_lesson_date = ?, pending_revision_sentence = ?, total_learned = total_learned + 1
                WHERE id = 'current';
                """,
                (today_str, lesson["sentence_en"])
            )
            conn.execute(
                """
                UPDATE english_learning_records
                SET status = 'learning', last_reviewed = CURRENT_TIMESTAMP
                WHERE id = ?;
                """,
                (lesson["id"],)
            )

        spoken = f"Today’s English sentence is: '{lesson['sentence_en']}'. It means: {lesson['meaning_telugu']}."
        message = (
            f"**Today's English Lesson (Day {lesson['lesson_day']}):**\n\n"
            f"🎯 **Sentence:** \"{lesson['sentence_en']}\"\n\n"
            f"🗣️ **Telugu Meaning:** {lesson['meaning_telugu']}\n\n"
            f"📖 **Simple English:** {lesson['meaning_simple_en']}\n\n"
            f"💡 **Practical Usage:** {lesson['grammar_note']}\n\n"
            f"**Pronunciation Tip:** Say it smoothly: *\"{lesson['sentence_en']}\"*"
        )
        return {
            "status": "new_lesson",
            "message": message,
            "spoken_response": spoken,
            "lesson": lesson,
            "is_revision": False
        }

    def get_lesson_by_sentence(self, sentence: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific lesson record by English sentence."""
        with db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, lesson_day, sentence_en, meaning_telugu, meaning_simple_en, grammar_note, status, review_count
                FROM english_learning_records
                WHERE LOWER(sentence_en) = LOWER(?) OR sentence_en LIKE ?
                LIMIT 1;
                """,
                (sentence.strip(), f"%{sentence.strip()}%")
            ).fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "lesson_day": row[1],
                "sentence_en": row[2],
                "meaning_telugu": row[3],
                "meaning_simple_en": row[4],
                "grammar_note": row[5],
                "status": row[6],
                "review_count": row[7]
            }

    def get_lesson_by_day(self, day: int) -> Optional[Dict[str, Any]]:
        """Retrieves a lesson record by day number."""
        with db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, lesson_day, sentence_en, meaning_telugu, meaning_simple_en, grammar_note, status, review_count
                FROM english_learning_records
                WHERE lesson_day = ?;
                """,
                (day,)
            ).fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "lesson_day": row[1],
                "sentence_en": row[2],
                "meaning_telugu": row[3],
                "meaning_simple_en": row[4],
                "grammar_note": row[5],
                "status": row[6],
                "review_count": row[7]
            }

    def translate_telugu_or_intent_to_natural_english(self, user_query: str) -> Dict[str, Any]:
        """
        Translates Telugu speech or natural voice requests into idiomatic English.
        Example:
        User: "Tell my friend in English that I will arrive in ten minutes."
        Output: "I'll be there in ten minutes."
        """
        clean_text = user_query.strip()
        lower = clean_text.lower()

        # Check curated idiomatic translations first
        for item in IDIOMATIC_TRANSLATIONS:
            for pattern in item["patterns"]:
                if re.search(pattern, lower, re.IGNORECASE):
                    return {
                        "original": clean_text,
                        "natural_english": item["natural_english"],
                        "explanation": item["simple_explanation"],
                        "source": "idiomatic_engine"
                    }

        # Handle explicit request prefixes
        # e.g. "Tell my friend in English that..." -> strip intent and translate core
        match = re.search(r"(?:tell\s+(?:my\s+friend|them|him|her)\s+in\s+english\s+that|say\s+in\s+english\s+that|translate\s+to\s+english:?)\s+(.+)", lower)
        core_intent = match.group(1).strip() if match else lower

        for item in IDIOMATIC_TRANSLATIONS:
            for pattern in item["patterns"]:
                if re.search(pattern, core_intent, re.IGNORECASE):
                    return {
                        "original": clean_text,
                        "natural_english": item["natural_english"],
                        "explanation": item["simple_explanation"],
                        "source": "idiomatic_engine"
                    }

        # Fallback heuristic for common arrival or daily phrases
        if "arrive" in core_intent or "reach" in core_intent or "coming" in core_intent:
            mins_match = re.search(r"(\d+|five|ten|fifteen|twenty|thirty)\s*minutes?", core_intent)
            mins = mins_match.group(1) if mins_match else "a few"
            natural = f"I'll be there in {mins} minutes."
            return {
                "original": clean_text,
                "natural_english": natural,
                "explanation": "Use 'I'll be there in ... minutes' for natural conversational arrival.",
                "source": "heuristic_engine"
            }

        # Default clean English formatting
        return {
            "original": clean_text,
            "natural_english": core_intent.capitalize(),
            "explanation": "Clear, direct conversational English.",
            "source": "default_engine"
        }

english_tutor = EnglishTutor()
