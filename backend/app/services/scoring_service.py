"""
Scoring service for all modules
Implements heuristic-based scoring (no paid APIs)
"""

import re
from typing import Dict, List
import math


class ScoringService:
    """Service for scoring various module responses"""
    
    # Common filler words for fluency analysis
    FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 
                    'so', 'well', 'i mean', 'kind of', 'sort of', 'right', 'okay']
    
    @staticmethod
    def score_speaking(transcript: str, expected_duration: int = None) -> Dict:
        """
        Score speaking response using heuristic NLP
        
        Returns:
            - fluency: words per minute and flow
            - clarity: sentence structure
            - vocabulary: word diversity
            - confidence: overall speaking confidence
        """
        if not transcript or len(transcript.strip()) < 10:
            return {
                'fluency': 0,
                'clarity': 0,
                'vocabulary': 0,
                'confidence': 0,
                'overall': 0,
                'feedback': 'Response too short for analysis'
            }
        
        words = transcript.lower().split()
        word_count = len(words)
        sentences = re.split(r'[.!?]+', transcript)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = max(1, len(sentences))
        
        # Calculate unique words (vocabulary diversity)
        unique_words = set(words)
        vocabulary_ratio = len(unique_words) / word_count if word_count > 0 else 0
        
        # Count filler words
        filler_count = sum(1 for word in words if word in ScoringService.FILLER_WORDS)
        filler_ratio = filler_count / word_count if word_count > 0 else 0
        
        # Average sentence length
        avg_sentence_length = word_count / sentence_count
        
        # Calculate scores (0-100)
        
        # Fluency: fewer fillers = better
        fluency = max(0, min(100, 100 - (filler_ratio * 200)))
        
        # Clarity: optimal sentence length is 10-20 words
        if avg_sentence_length < 5:
            clarity = 50  # Too short
        elif avg_sentence_length > 30:
            clarity = 60  # Too long
        else:
            clarity = min(100, 70 + (avg_sentence_length / 20) * 30)
        
        # Vocabulary: higher diversity = better
        vocabulary = min(100, vocabulary_ratio * 150)
        
        # Confidence: combination of word count and structure
        confidence = min(100, (word_count / 100) * 50 + (sentence_count / 5) * 50)
        
        # Overall weighted score
        overall = (fluency * 0.3 + clarity * 0.25 + vocabulary * 0.25 + confidence * 0.2)
        
        # Generate feedback
        feedback_points = []
        if fluency < 70:
            feedback_points.append("Try to reduce filler words like 'um' and 'uh'")
        if clarity < 70:
            feedback_points.append("Focus on clear, well-structured sentences")
        if vocabulary < 70:
            feedback_points.append("Use a more diverse vocabulary")
        if confidence < 70:
            feedback_points.append("Speak more confidently with complete thoughts")
        
        if not feedback_points:
            feedback_points.append("Great job! Keep practicing to maintain your skills")
        
        return {
            'fluency': round(fluency, 1),
            'clarity': round(clarity, 1),
            'vocabulary': round(vocabulary, 1),
            'confidence': round(confidence, 1),
            'overall': round(overall, 1),
            'word_count': word_count,
            'sentence_count': sentence_count,
            'filler_count': filler_count,
            'feedback': '. '.join(feedback_points)
        }
    
    @staticmethod
    def score_reading(user_answers: List[Dict], correct_answers: List[Dict]) -> Dict:
        """Score reading comprehension answers"""
        if not user_answers or not correct_answers:
            return {'score': 0, 'correct': 0, 'total': 0, 'percentage': 0}
        
        correct_count = 0
        total = len(correct_answers)
        
        for user_ans, correct_ans in zip(user_answers, correct_answers):
            user_text = str(user_ans.get('answer', '')).lower().strip()
            correct_text = str(correct_ans.get('answer', '')).lower().strip()
            
            if user_text == correct_text:
                correct_count += 1
        
        percentage = (correct_count / total * 100) if total > 0 else 0
        
        return {
            'score': round(percentage, 1),
            'correct': correct_count,
            'total': total,
            'percentage': round(percentage, 1),
            'feedback': ScoringService._get_reading_feedback(percentage)
        }
    
    @staticmethod
    def score_grammar(user_answer: str, correct_answer: str, question_type: str = 'mcq') -> Dict:
        """Score grammar exercise"""
        is_correct = user_answer.lower().strip() == correct_answer.lower().strip()
        
        return {
            'is_correct': is_correct,
            'score': 100 if is_correct else 0,
            'user_answer': user_answer,
            'correct_answer': correct_answer
        }
    
    @staticmethod
    def score_essay(text: str, grammar_issues: List[Dict] = None) -> Dict:
        """
        Score essay based on multiple factors
        
        Returns scores for:
        - grammar: based on error count
        - clarity: sentence structure
        - vocabulary: word diversity and complexity
        - structure: paragraph organization
        """
        if not text or len(text.strip()) < 50:
            return {
                'grammar': 0,
                'clarity': 0,
                'vocabulary': 0,
                'structure': 0,
                'overall': 0,
                'feedback': 'Essay too short for analysis'
            }
        
        words = text.lower().split()
        word_count = len(words)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = max(1, len(sentences))
        paragraphs = text.split('\n\n')
        paragraph_count = len([p for p in paragraphs if p.strip()])
        
        # Grammar score (based on error count)
        error_count = len(grammar_issues) if grammar_issues else 0
        grammar_penalty = min(50, error_count * 5)  # 5 points per error, max 50
        grammar = max(0, 100 - grammar_penalty)
        
        # Clarity score
        avg_sentence_length = word_count / sentence_count
        if 10 <= avg_sentence_length <= 25:
            clarity = 90
        elif 5 <= avg_sentence_length < 10 or 25 < avg_sentence_length <= 35:
            clarity = 70
        else:
            clarity = 50
        
        # Vocabulary score
        unique_words = set(words)
        vocabulary_ratio = len(unique_words) / word_count
        
        # Check for complex words (> 6 letters)
        complex_words = [w for w in words if len(w) > 6]
        complexity_ratio = len(complex_words) / word_count
        
        vocabulary = min(100, vocabulary_ratio * 100 + complexity_ratio * 50)
        
        # Structure score (based on paragraphs)
        if paragraph_count >= 3:
            structure = 90
        elif paragraph_count == 2:
            structure = 70
        else:
            structure = 50
        
        # Word count bonus
        if word_count >= 250:
            structure += 10
        
        structure = min(100, structure)
        
        # Overall score
        overall = (grammar * 0.3 + clarity * 0.25 + vocabulary * 0.25 + structure * 0.2)
        
        # Feedback
        feedback_points = []
        if grammar < 70:
            feedback_points.append(f"Review grammar - {error_count} issues found")
        if clarity < 70:
            feedback_points.append("Work on sentence structure and clarity")
        if vocabulary < 70:
            feedback_points.append("Use more diverse and sophisticated vocabulary")
        if structure < 70:
            feedback_points.append("Organize your essay into clear paragraphs")
        
        if not feedback_points:
            feedback_points.append("Excellent essay! Keep up the great work")
        
        return {
            'grammar': round(grammar, 1),
            'clarity': round(clarity, 1),
            'vocabulary': round(vocabulary, 1),
            'structure': round(structure, 1),
            'overall': round(overall, 1),
            'word_count': word_count,
            'sentence_count': sentence_count,
            'paragraph_count': paragraph_count,
            'feedback': '. '.join(feedback_points)
        }
    
    @staticmethod
    def score_critical_thinking(response: str, keywords: List[str] = None, min_words: int = 100) -> Dict:
        """
        Score critical thinking / JAM response
        
        Evaluates:
        - Content coverage (keyword density)
        - Structure and organization
        - Argument quality
        """
        if not response or len(response.strip()) < 20:
            return {
                'content': 0,
                'structure': 0,
                'argument': 0,
                'overall': 0,
                'feedback': 'Response too short for analysis'
            }
        
        words = response.lower().split()
        word_count = len(words)
        sentences = re.split(r'[.!?]+', response)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # Content score (keyword coverage)
        if keywords:
            keywords_found = sum(1 for kw in keywords if kw.lower() in response.lower())
            keyword_coverage = keywords_found / len(keywords)
            content = min(100, keyword_coverage * 100 + 20)  # Base 20 points
        else:
            # Without keywords, score based on word count
            content = min(100, (word_count / min_words) * 80 + 20)
        
        # Structure score
        if len(sentences) >= 5:
            structure = 85
        elif len(sentences) >= 3:
            structure = 70
        else:
            structure = 50
        
        # Argument quality (looking for transitional words)
        transition_words = ['however', 'therefore', 'moreover', 'furthermore', 
                          'consequently', 'additionally', 'in conclusion', 
                          'first', 'second', 'finally', 'because', 'although']
        transition_count = sum(1 for tw in transition_words if tw in response.lower())
        argument = min(100, 50 + transition_count * 10)
        
        # Overall
        overall = (content * 0.4 + structure * 0.3 + argument * 0.3)
        
        # Feedback
        feedback_points = []
        if content < 70:
            feedback_points.append("Try to cover more key points in your response")
        if structure < 70:
            feedback_points.append("Develop your ideas with more sentences")
        if argument < 70:
            feedback_points.append("Use transitional words to connect your ideas")
        
        if not feedback_points:
            feedback_points.append("Well-structured response with good arguments!")
        
        return {
            'content': round(content, 1),
            'structure': round(structure, 1),
            'argument': round(argument, 1),
            'overall': round(overall, 1),
            'word_count': word_count,
            'sentence_count': len(sentences),
            'feedback': '. '.join(feedback_points)
        }
    
    @staticmethod
    def _get_reading_feedback(percentage: float) -> str:
        """Generate feedback based on reading score"""
        if percentage >= 90:
            return "Excellent comprehension! You understood the passage very well."
        elif percentage >= 70:
            return "Good understanding. Review the questions you missed."
        elif percentage >= 50:
            return "Fair comprehension. Try reading more slowly and carefully."
        else:
            return "Keep practicing! Focus on understanding key ideas in passages."
