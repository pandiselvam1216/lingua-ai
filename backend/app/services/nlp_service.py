"""
NLP Service for text analysis
Uses heuristic methods - no paid APIs
"""

import re
from typing import Dict, List, Tuple
from collections import Counter


class NLPService:
    """Natural Language Processing utilities"""
    
    # Common English stop words
    STOP_WORDS = {
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
        'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
        'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
        'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here'
    }
    
    @staticmethod
    def analyze_text(text: str) -> Dict:
        """Comprehensive text analysis"""
        if not text:
            return {'error': 'No text provided'}
        
        # Basic counts
        char_count = len(text)
        words = text.split()
        word_count = len(words)
        
        # Sentence analysis
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = len(sentences)
        
        # Paragraph analysis
        paragraphs = text.split('\n\n')
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        paragraph_count = len(paragraphs)
        
        # Word frequency (excluding stop words)
        words_lower = [w.lower().strip('.,!?;:()[]{}"\'-') for w in words]
        content_words = [w for w in words_lower if w and w not in NLPService.STOP_WORDS]
        word_freq = Counter(content_words).most_common(10)
        
        # Average word length
        avg_word_length = sum(len(w) for w in words_lower) / word_count if word_count > 0 else 0
        
        # Average sentence length
        avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
        
        # Vocabulary diversity
        unique_words = set(words_lower)
        vocabulary_diversity = len(unique_words) / word_count if word_count > 0 else 0
        
        # Reading level estimate (Flesch-Kincaid approximation)
        syllable_count = NLPService._count_syllables(text)
        reading_level = NLPService._calculate_reading_level(
            word_count, sentence_count, syllable_count
        )
        
        return {
            'char_count': char_count,
            'word_count': word_count,
            'sentence_count': sentence_count,
            'paragraph_count': paragraph_count,
            'avg_word_length': round(avg_word_length, 2),
            'avg_sentence_length': round(avg_sentence_length, 2),
            'vocabulary_diversity': round(vocabulary_diversity, 3),
            'reading_level': reading_level,
            'top_words': word_freq,
            'unique_word_count': len(unique_words)
        }
    
    @staticmethod
    def extract_keywords(text: str, top_n: int = 10) -> List[Tuple[str, int]]:
        """Extract key words from text"""
        if not text:
            return []
        
        words = text.lower().split()
        words = [w.strip('.,!?;:()[]{}"\'-') for w in words]
        content_words = [w for w in words if w and w not in NLPService.STOP_WORDS and len(w) > 2]
        
        return Counter(content_words).most_common(top_n)
    
    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        """Calculate simple word-based similarity between two texts"""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    @staticmethod
    def check_keyword_presence(text: str, keywords: List[str]) -> Dict:
        """Check which keywords are present in text"""
        text_lower = text.lower()
        
        found = []
        missing = []
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                found.append(keyword)
            else:
                missing.append(keyword)
        
        coverage = len(found) / len(keywords) if keywords else 0
        
        return {
            'found': found,
            'missing': missing,
            'coverage': round(coverage, 2),
            'coverage_percent': round(coverage * 100, 1)
        }
    
    @staticmethod
    def _count_syllables(text: str) -> int:
        """Estimate syllable count in text"""
        text = text.lower()
        words = text.split()
        total_syllables = 0
        
        for word in words:
            word = re.sub(r'[^a-z]', '', word)
            if not word:
                continue
            
            # Count vowel groups
            syllables = len(re.findall(r'[aeiouy]+', word))
            
            # Adjust for silent e
            if word.endswith('e'):
                syllables -= 1
            
            # Adjust for -le endings
            if word.endswith('le') and len(word) > 2 and word[-3] not in 'aeiou':
                syllables += 1
            
            total_syllables += max(1, syllables)
        
        return total_syllables
    
    @staticmethod
    def _calculate_reading_level(words: int, sentences: int, syllables: int) -> Dict:
        """Calculate approximate reading level"""
        if words == 0 or sentences == 0:
            return {'level': 'Unknown', 'grade': 0}
        
        # Flesch-Kincaid Grade Level
        fk_grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
        fk_grade = max(0, min(18, fk_grade))  # Clamp to reasonable range
        
        # Determine level description
        if fk_grade <= 5:
            level = 'Elementary'
        elif fk_grade <= 8:
            level = 'Middle School'
        elif fk_grade <= 12:
            level = 'High School'
        else:
            level = 'College'
        
        return {
            'level': level,
            'grade': round(fk_grade, 1)
        }
    
    @staticmethod
    def detect_language_issues(text: str) -> List[Dict]:
        """
        Detect common language issues using patterns
        (Supplement to LanguageTool API)
        """
        issues = []
        
        # Double spaces
        if '  ' in text:
            issues.append({
                'type': 'whitespace',
                'message': 'Multiple consecutive spaces detected',
                'suggestion': 'Use single spaces between words'
            })
        
        # Sentence doesn't start with capital
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for i, sentence in enumerate(sentences):
            if sentence and sentence[0].islower():
                issues.append({
                    'type': 'capitalization',
                    'message': f'Sentence {i+1} does not start with a capital letter',
                    'context': sentence[:50]
                })
        
        # Common confused words
        confused_patterns = [
            (r'\btheir\s+is\b', "Consider 'there is' instead of 'their is'"),
            (r'\byour\s+welcome\b', "Consider \"you're welcome\" instead of 'your welcome'"),
            (r'\bits\s+a\s+\w+\s+its\b', "Check usage of 'its' vs \"it's\""),
            (r'\bi\b', "'I' should be capitalized"),
        ]
        
        for pattern, message in confused_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                issues.append({
                    'type': 'grammar',
                    'message': message
                })
        
        return issues
