"""
Unit tests for Ramya AI Personalised English Learning Tutor & Telugu Translator.
Verifies daily lesson progression, previous day sentence revision check,
and natural Telugu-to-English meaning translation.
"""
import pytest
from app.tools.english_tutor import english_tutor
from app.database.db import db

@pytest.fixture(autouse=True)
def reset_english_state():
    with db.get_connection() as conn:
        conn.execute("UPDATE english_learning_records SET status = 'revised' WHERE id = 'lesson-1';")
        conn.execute("UPDATE english_learning_records SET status = 'new' WHERE id != 'lesson-1';")
        conn.execute("UPDATE english_learning_progress SET pending_revision_sentence = 'Have you eaten?' WHERE id = 'current';")
    yield

def test_daily_revision_check():
    # Progress starts with Day 1 sentence "Have you eaten?" pending revision
    session = english_tutor.start_or_check_daily_session()
    assert session["status"] == "awaiting_choice"
    assert "Would you like to revise yesterday’s sentence before learning a new one?" in session["message"]
    assert session["needs_revision_prompt"] is True

def test_revision_choice_execution():
    # User chooses revision
    rev = english_tutor.process_choice("revise")
    assert rev["status"] == "revision_active"
    assert rev["is_revision"] is True
    assert "sentence_en" in rev["lesson"]
    assert "meaning_telugu" in rev["lesson"]
    assert len(rev["lesson"]["sentence_en"]) > 0

def test_new_lesson_progression():
    # User chooses next lesson
    nxt = english_tutor.process_choice("new")
    assert nxt["status"] == "new_lesson"
    assert nxt["is_revision"] is False
    assert nxt["lesson"]["lesson_day"] >= 2
    assert "sentence_en" in nxt["lesson"]

def test_telugu_to_natural_english_translation():
    # 1. Exact user prompt requirement from spec:
    # "Tell my friend in English that I will arrive in ten minutes." -> "I'll be there in ten minutes."
    res1 = english_tutor.translate_telugu_or_intent_to_natural_english("Tell my friend in English that I will arrive in ten minutes")
    assert res1["natural_english"] == "I'll be there in ten minutes."

    # 2. Telugu script input
    res2 = english_tutor.translate_telugu_or_intent_to_natural_english("నేను పది నిమిషాల్లో అక్కడ ఉంటాను")
    assert "ten minutes" in res2["natural_english"].lower()

    # 3. Daily question "Have you eaten?"
    res3 = english_tutor.translate_telugu_or_intent_to_natural_english("మీరు భోజనం చేశారా?")
    assert res3["natural_english"] == "Have you eaten?"
