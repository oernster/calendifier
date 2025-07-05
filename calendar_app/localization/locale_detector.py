"""
Locale Detection System for Calendifier

This module provides comprehensive locale detection and management capabilities
for the Calendifier application, supporting 13 major international languages.
"""

import locale
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class LocaleDetector:
    """
    Detects and manages locale information for the Calendifier application.
    
    Supports 13 major international languages with comprehensive
    locale detection, validation, and information retrieval.
    """
    
    # Default locale
    DEFAULT_LOCALE = 'en_GB'
    
    # Major International Languages - 14 core languages including UK English
    SUPPORTED_LOCALES = {
        # Core International Languages
        'en_US': {'name': 'English (United States)', 'native': 'English (US)', 'batch': 1},
        'en_GB': {'name': 'English (United Kingdom)', 'native': 'English (UK)', 'batch': 1},
        'es_ES': {'name': 'Spanish (Spain)', 'native': 'Español', 'batch': 1},
        'fr_FR': {'name': 'French (France)', 'native': 'Français', 'batch': 1},
        'de_DE': {'name': 'German (Germany)', 'native': 'Deutsch', 'batch': 1},
        'it_IT': {'name': 'Italian (Italy)', 'native': 'Italiano', 'batch': 1},
        'pt_BR': {'name': 'Portuguese (Brazil)', 'native': 'Português (Brasil)', 'batch': 1},
        'ru_RU': {'name': 'Russian (Russia)', 'native': 'Русский', 'batch': 1},
        'zh_CN': {'name': 'Chinese (Simplified)', 'native': '简体中文', 'batch': 1},
        'zh_TW': {'name': 'Chinese (Traditional)', 'native': '繁體中文', 'batch': 1},
        'ja_JP': {'name': 'Japanese (Japan)', 'native': '日本語', 'batch': 1},
        'ko_KR': {'name': 'Korean (South Korea)', 'native': '한국어', 'batch': 1},
        'hi_IN': {'name': 'Hindi (India)', 'native': 'हिन्दी', 'batch': 1},
        'ar_SA': {'name': 'Arabic (Saudi Arabia)', 'native': 'العربية (السعودية)', 'batch': 1}
    }
    
    def __init__(self):
        """Initialize the locale detector."""
        self._system_locale = None
        self._detected_locale = None
        
    def detect_system_locale(self) -> str:
        """
        Detect the system's current locale.
        
        Returns:
            str: Detected locale code or 'en_US' as fallback
        """
        if self._system_locale:
            return self._system_locale
            
        try:
            # Try multiple methods to detect system locale
            detected = None
            
            # Method 1: Python locale module
            try:
                system_locale = locale.getdefaultlocale()[0]
                if system_locale:
                    detected = self._normalize_locale(system_locale)
            except Exception:
                pass
            
            # Method 2: Environment variables
            if not detected:
                for env_var in ['LC_ALL', 'LC_MESSAGES', 'LANG', 'LANGUAGE']:
                    env_locale = os.environ.get(env_var)
                    if env_locale:
                        detected = self._normalize_locale(env_locale.split(':')[0])
                        break
            
            # Method 3: Windows specific
            if not detected and os.name == 'nt':
                try:
                    import ctypes
                    windll = ctypes.windll.kernel32
                    windll.GetUserDefaultUILanguage()
                    # This is a simplified approach - in practice you'd map the language ID
                    detected = 'en_GB'
                except Exception:
                    pass
            
            # Validate detected locale
            if detected and self.is_supported(detected):
                self._system_locale = detected
            else:
                self._system_locale = 'en_GB'  # Safe fallback
                
        except Exception as e:
            logger.warning(f"Failed to detect system locale: {e}")
            self._system_locale = 'en_GB'
        
        return self._system_locale
    
    def _normalize_locale(self, locale_str: str) -> str:
        """
        Normalize a locale string to our standard format.
        
        Args:
            locale_str: Raw locale string
            
        Returns:
            str: Normalized locale code
        """
        if not locale_str:
            return 'en_GB'
        
        # Remove encoding and other suffixes
        locale_str = locale_str.split('.')[0].split('@')[0]
        
        # Handle different formats
        if '_' in locale_str:
            parts = locale_str.split('_')
            if len(parts) >= 2:
                lang = parts[0].lower()
                country = parts[1].upper()
                normalized = f"{lang}_{country}"
                
                # Map common variations to our supported locales
                if normalized in self.SUPPORTED_LOCALES:
                    return normalized
                
                # Try language-only mapping
                for supported in self.SUPPORTED_LOCALES:
                    if supported.startswith(f"{lang}_"):
                        return supported
        
        elif '-' in locale_str:
            # Handle dash format (e.g., en-US)
            parts = locale_str.split('-')
            if len(parts) >= 2:
                lang = parts[0].lower()
                country = parts[1].upper()
                normalized = f"{lang}_{country}"
                
                if normalized in self.SUPPORTED_LOCALES:
                    return normalized
        
        # Language-only fallback
        lang = locale_str.lower()
        for supported in self.SUPPORTED_LOCALES:
            if supported.startswith(f"{lang}_"):
                return supported
        
        return 'en_GB'
    
    def is_supported(self, locale_code: str) -> bool:
        """
        Check if a locale is supported.
        
        Args:
            locale_code: Locale code to check
            
        Returns:
            bool: True if locale is supported
        """
        return locale_code in self.SUPPORTED_LOCALES
    
    def get_supported_locales(self) -> List[str]:
        """
        Get list of all supported locale codes.
        
        Returns:
            List[str]: List of supported locale codes
        """
        return list(self.SUPPORTED_LOCALES.keys())
    
    @classmethod
    def get_sorted_locales(cls) -> List[tuple]:
        """
        Get list of all supported locales with info, sorted by name.
        
        Returns:
            List[tuple]: List of (locale_code, locale_info) tuples sorted alphabetically
        """
        sorted_items = []
        for locale_code, locale_info in cls.SUPPORTED_LOCALES.items():
            # Add flag emoji based on country code
            country_code = locale_code.split('_')[1] if '_' in locale_code else locale_code
            flag = cls._get_flag_emoji(country_code)
            
            # Create enhanced locale info with flag
            enhanced_info = locale_info.copy()
            enhanced_info['flag'] = flag
            
            sorted_items.append((locale_code, enhanced_info))
        
        # Sort by locale name
        sorted_items.sort(key=lambda x: x[1]['name'])
        return sorted_items
    
    @classmethod
    def _get_flag_emoji(cls, country_code: str) -> str:
        """
        Get flag emoji for a country code.
        
        Args:
            country_code: Two-letter country code
            
        Returns:
            str: Flag emoji or default flag
        """
        # Map country codes to flag emojis
        flag_map = {
            'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
            'ES': '🇪🇸', 'IT': '🇮🇹', 'PT': '🇵🇹', 'NL': '🇳🇱', 'PL': '🇵🇱',
            'RU': '🇷🇺', 'TR': '🇹🇷', 'GR': '🇬🇷', 'CZ': '🇨🇿', 'HU': '🇭🇺',
            'RO': '🇷🇴', 'BG': '🇧🇬', 'HR': '🇭🇷', 'CN': '🇨🇳', 'TW': '🇹🇼',
            'JP': '🇯🇵', 'KR': '🇰🇷', 'IN': '🇮🇳', 'TH': '🇹🇭', 'VN': '🇻🇳',
            'ID': '🇮🇩', 'MY': '🇲🇾', 'PH': '🇵🇭', 'MX': '🇲🇽', 'BR': '🇧🇷',
            'AR': '🇦🇷', 'CO': '🇨🇴', 'CL': '🇨🇱', 'PE': '🇵🇪', 'VE': '🇻🇪',
            'SA': '🇸🇦', 'EG': '🇪🇬', 'IL': '🇮🇱', 'IR': '🇮🇷', 'PK': '🇵🇰',
            'KE': '🇰🇪', 'ET': '🇪🇹', 'ZA': '🇿🇦', 'SE': '🇸🇪', 'DK': '🇩🇰',
            'NO': '🇳🇴', 'FI': '🇫🇮', 'IS': '🇮🇸', 'EE': '🇪🇪', 'LV': '🇱🇻',
            'LT': '🇱🇹', 'UA': '🇺🇦', 'BY': '🇧🇾', 'MK': '🇲🇰', 'RS': '🇷🇸',
            'BA': '🇧🇦', 'SI': '🇸🇮', 'SK': '🇸🇰', 'MT': '🇲🇹', 'IE': '🇮🇪',
            'FO': '🇫🇴', 'AM': '🇦🇲', 'GE': '🇬🇪', 'KZ': '🇰🇿', 'KH': '🇰🇭',
            'LA': '🇱🇦', 'MN': '🇲🇳', 'MM': '🇲🇲', 'NP': '🇳🇵', 'LK': '🇱🇰',
            'AL': '🇦🇱', 'UZ': '🇺🇿', 'BD': '🇧🇩', 'AZ': '🇦🇿'
        }
        
        return flag_map.get(country_code, '🏳️')
    
    def get_locale_info(self, locale_code: str) -> Optional[Dict[str, str]]:
        """
        Get information about a specific locale.
        
        Args:
            locale_code: Locale code
            
        Returns:
            Optional[Dict[str, str]]: Locale information or None if not supported
        """
        return self.SUPPORTED_LOCALES.get(locale_code)
    
    def get_locales_by_batch(self, batch_number: int) -> List[str]:
        """
        Get all locales in a specific batch.
        
        Args:
            batch_number: Batch number (1-6)
            
        Returns:
            List[str]: List of locale codes in the batch
        """
        return [
            locale_code for locale_code, info in self.SUPPORTED_LOCALES.items()
            if info['batch'] == batch_number
        ]
    
    def get_batch_info(self) -> Dict[int, Dict[str, any]]:
        """
        Get information about all batches.
        
        Returns:
            Dict[int, Dict[str, any]]: Batch information
        """
        from . import BATCH_INFO
        return BATCH_INFO
    
    def find_best_match(self, preferred_locales: List[str]) -> str:
        """
        Find the best matching supported locale from a list of preferences.
        
        Args:
            preferred_locales: List of preferred locale codes
            
        Returns:
            str: Best matching supported locale or 'en_GB' as fallback
        """
        for preferred in preferred_locales:
            normalized = self._normalize_locale(preferred)
            if self.is_supported(normalized):
                return normalized
        
        return 'en_GB'
    
    def get_language_variants(self, language_code: str) -> List[str]:
        """
        Get all supported variants of a language.
        
        Args:
            language_code: Two-letter language code (e.g., 'en', 'es')
            
        Returns:
            List[str]: List of supported locale codes for the language
        """
        language_code = language_code.lower()
        return [
            locale_code for locale_code in self.SUPPORTED_LOCALES
            if locale_code.startswith(f"{language_code}_")
        ]
    
    def get_rtl_locales(self) -> List[str]:
        """
        Get list of right-to-left (RTL) locales.
        
        Returns:
            List[str]: List of RTL locale codes
        """
        rtl_languages = ['ar', 'he', 'fa', 'ur']
        return [
            locale_code for locale_code in self.SUPPORTED_LOCALES
            if any(locale_code.startswith(f"{lang}_") for lang in rtl_languages)
        ]
    
    def is_rtl(self, locale_code: str) -> bool:
        """
        Check if a locale uses right-to-left text direction.
        
        Args:
            locale_code: Locale code to check
            
        Returns:
            bool: True if locale is RTL
        """
        return locale_code in self.get_rtl_locales()
    
    @classmethod
    def get_locale_info(cls, locale_code: str) -> Optional[Dict[str, str]]:
        """
        Get information about a specific locale (class method version).
        
        Args:
            locale_code: Locale code
            
        Returns:
            Optional[Dict[str, str]]: Locale information or None if not supported
        """
        if locale_code in cls.SUPPORTED_LOCALES:
            info = cls.SUPPORTED_LOCALES[locale_code].copy()
            country_code = locale_code.split('_')[1] if '_' in locale_code else locale_code
            info['flag'] = cls._get_flag_emoji(country_code)
            return info
        return None
    
    @classmethod
    def get_country_from_locale(cls, locale_code: str) -> str:
        """
        Extract country code from locale code.
        
        Args:
            locale_code: Locale code (e.g., 'en_US', 'fr_FR')
            
        Returns:
            str: Country code (e.g., 'US', 'FR') or 'US' as default
        """
        if '_' in locale_code:
            return locale_code.split('_')[1]
        return 'GB'  # Default fallback