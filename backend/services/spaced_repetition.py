"""
SM-2 Spaced Repetition Algorithm (same as Anki).
Updates a flashcard's interval, repetitions, and ease factor based on rating.
"""
from datetime import date, timedelta
from models.schemas import Flashcard, FlashcardRating


def update_card(card: Flashcard, rating: FlashcardRating) -> Flashcard:
    """
    SM-2 algorithm:
    - again (0): reset repetitions, short interval
    - hard  (3): correct but difficult
    - good  (4): correct with some effort
    - easy  (5): perfect recall

    Returns updated card with new interval, ease_factor, due_date.
    """
    q = _rating_to_q(rating)

    if q < 3:
        # Incorrect — reset
        card.repetitions = 0
        card.interval = 1
    else:
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.ease_factor)
        card.repetitions += 1

    # Update ease factor (clamp minimum at 1.3)
    card.ease_factor = max(1.3, card.ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

    # Set next due date
    card.due_date = (date.today() + timedelta(days=card.interval)).isoformat()

    return card


def _rating_to_q(rating: FlashcardRating) -> int:
    mapping = {
        FlashcardRating.again: 0,
        FlashcardRating.hard: 3,
        FlashcardRating.good: 4,
        FlashcardRating.easy: 5,
    }
    return mapping[rating]


def mastery_from_cards(cards: list[Flashcard]) -> dict[str, float]:
    """
    Compute per-topic mastery (0.0–1.0) based on ease_factor and repetitions.
    ease_factor starts at 2.5; higher = better recall.
    """
    topic_scores: dict[str, list[float]] = {}
    for card in cards:
        score = min(1.0, (card.ease_factor - 1.3) / (5.0 - 1.3) * 0.7 +
                    min(card.repetitions, 5) / 5 * 0.3)
        topic_scores.setdefault(card.topic, []).append(score)

    return {
        topic: round(sum(scores) / len(scores), 3)
        for topic, scores in topic_scores.items()
    }
