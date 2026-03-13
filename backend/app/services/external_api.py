"""
External API service for free third-party APIs
- LanguageTool (Grammar checking)
- Free Dictionary API (Word definitions)
"""

import requests
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ExternalAPIService:
    """Service for external free API integrations"""
    
    LANGUAGE_TOOL_URL = "https://api.languagetool.org/v2/check"
    DICTIONARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"
    
    @staticmethod
    def check_grammar(text: str, language: str = 'en-US') -> Dict:
        """
        Check grammar using LanguageTool public API
        No API key required
        """
        if not text:
            return {'success': False, 'error': 'No text provided'}
        
        try:
            response = requests.post(
                ExternalAPIService.LANGUAGE_TOOL_URL,
                data={
                    'text': text,
                    'language': language,
                    'enabledOnly': 'false'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                matches = data.get('matches', [])
                
                # Process matches into cleaner format
                issues = []
                for match in matches:
                    issue = {
                        'message': match.get('message', ''),
                        'short_message': match.get('shortMessage', ''),
                        'offset': match.get('offset', 0),
                        'length': match.get('length', 0),
                        'context': match.get('context', {}).get('text', ''),
                        'type': match.get('rule', {}).get('issueType', 'unknown'),
                        'category': match.get('rule', {}).get('category', {}).get('name', ''),
                        'replacements': [r.get('value', '') for r in match.get('replacements', [])[:3]]
                    }
                    issues.append(issue)
                
                return {
                    'success': True,
                    'issues': issues,
                    'issue_count': len(issues),
                    'language': data.get('language', {}).get('name', language)
                }
            else:
                logger.warning(f"LanguageTool API error: {response.status_code}")
                return {
                    'success': False,
                    'error': f'API error: {response.status_code}',
                    'issues': []
                }
                
        except requests.Timeout:
            logger.error("LanguageTool API timeout")
            return {
                'success': False,
                'error': 'API timeout - please try again',
                'issues': []
            }
        except requests.RequestException as e:
            logger.error(f"LanguageTool API error: {str(e)}")
            return {
                'success': False,
                'error': 'Unable to connect to grammar service',
                'issues': []
            }
    
    @staticmethod
    def get_word_definition(word: str) -> Dict:
        """
        Get word definition from Free Dictionary API
        No API key required
        """
        if not word:
            return {'success': False, 'error': 'No word provided'}
        
        word = word.strip().lower()
        
        try:
            response = requests.get(
                f"{ExternalAPIService.DICTIONARY_API_URL}/{word}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    entry = data[0]
                    
                    # Extract phonetics
                    phonetics = entry.get('phonetics', [])
                    phonetic_text = ''
                    audio_url = ''
                    for p in phonetics:
                        if p.get('text'):
                            phonetic_text = p.get('text', '')
                        if p.get('audio'):
                            audio_url = p.get('audio', '')
                        if phonetic_text and audio_url:
                            break
                    
                    # Extract meanings
                    meanings = []
                    for meaning in entry.get('meanings', []):
                        part_of_speech = meaning.get('partOfSpeech', '')
                        definitions = []
                        for defn in meaning.get('definitions', [])[:3]:  # Limit to 3 definitions
                            definitions.append({
                                'definition': defn.get('definition', ''),
                                'example': defn.get('example', ''),
                                'synonyms': defn.get('synonyms', [])[:5],
                                'antonyms': defn.get('antonyms', [])[:5]
                            })
                        
                        meanings.append({
                            'part_of_speech': part_of_speech,
                            'definitions': definitions,
                            'synonyms': meaning.get('synonyms', [])[:10],
                            'antonyms': meaning.get('antonyms', [])[:10]
                        })
                    
                    return {
                        'success': True,
                        'word': entry.get('word', word),
                        'phonetic': phonetic_text,
                        'audio_url': audio_url,
                        'meanings': meanings,
                        'source_urls': entry.get('sourceUrls', [])
                    }
                
                return {
                    'success': False,
                    'error': 'Word not found'
                }
                
            elif response.status_code == 404:
                return {
                    'success': False,
                    'error': 'Word not found in dictionary'
                }
            else:
                logger.warning(f"Dictionary API error: {response.status_code}")
                return {
                    'success': False,
                    'error': f'API error: {response.status_code}'
                }
                
        except requests.Timeout:
            logger.error("Dictionary API timeout")
            return {
                'success': False,
                'error': 'API timeout - please try again'
            }
        except requests.RequestException as e:
            logger.error(f"Dictionary API error: {str(e)}")
            return {
                'success': False,
                'error': 'Unable to connect to dictionary service'
            }
    
    @staticmethod
    def get_synonyms(word: str) -> List[str]:
        """Get synonyms for a word"""
        result = ExternalAPIService.get_word_definition(word)
        
        if not result.get('success'):
            return []
        
        synonyms = set()
        for meaning in result.get('meanings', []):
            synonyms.update(meaning.get('synonyms', []))
            for defn in meaning.get('definitions', []):
                synonyms.update(defn.get('synonyms', []))
        
        return list(synonyms)[:20]
    
    @staticmethod
    def get_antonyms(word: str) -> List[str]:
        """Get antonyms for a word"""
        result = ExternalAPIService.get_word_definition(word)
        
        if not result.get('success'):
            return []
        
        antonyms = set()
        for meaning in result.get('meanings', []):
            antonyms.update(meaning.get('antonyms', []))
            for defn in meaning.get('definitions', []):
                antonyms.update(defn.get('antonyms', []))
        
        return list(antonyms)[:20]
