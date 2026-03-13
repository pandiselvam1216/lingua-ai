import json
import os
from typing import List, Dict

class FeedbackTrainer:
    """Simple trainer for speaking feedback.
    Stores keyword->feedback mappings in a JSON file.
    """
    _data_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'feedback_training.json')

    @classmethod
    def _ensure_file(cls):
        dir_path = os.path.dirname(cls._data_file)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
        if not os.path.isfile(cls._data_file):
            with open(cls._data_file, 'w', encoding='utf-8') as f:
                json.dump([], f)

    @classmethod
    def load_rules(cls) -> List[Dict[str, str]]:
        cls._ensure_file()
        with open(cls._data_file, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                return []
            except json.JSONDecodeError:
                return []

    @classmethod
    def save_rule(cls, keyword: str, feedback: str) -> None:
        """Add a new keyword->feedback rule.
        If the keyword already exists, it will be updated.
        """
        cls._ensure_file()
        rules = cls.load_rules()
        # Update existing rule if present
        for rule in rules:
            if rule.get('keyword') == keyword:
                rule['feedback'] = feedback
                break
        else:
            rules.append({'keyword': keyword, 'feedback': feedback})
        with open(cls._data_file, 'w', encoding='utf-8') as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)

    @classmethod
    def get_feedback(cls, transcript: str) -> List[str]:
        """Return list of feedback strings that match keywords in the transcript."""
        rules = cls.load_rules()
        feedbacks = []
        lowered = transcript.lower()
        for rule in rules:
            kw = rule.get('keyword', '').lower()
            if kw and kw in lowered:
                feedbacks.append(rule.get('feedback', ''))
        return feedbacks
