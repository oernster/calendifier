"""
Internationalization (i18n) Manager for Calendifier

This module provides comprehensive internationalization support for the Calendifier
calendar application, including translation loading, locale detection, and
runtime language switching.
"""

import json
import os
import locale
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from functools import lru_cache
from .number_formatter import NumberFormatter

logger = logging.getLogger(__name__)


class MissingTranslationError(Exception):
    """Raised when a translation key is not found."""
    pass


class I18nManager:
    """
    Manages internationalization for the Calendifier application.
    
    Handles loading translations, locale detection, fallback mechanisms,
    and runtime language switching.
    """
    
    def _detect_system_locale(self) -> str:
        """Detect system locale automatically"""
        try:
            import locale as system_locale
            # Get system locale
            loc = system_locale.getdefaultlocale()[0]
            if loc:
                # Convert from locale format (en_US) to our format
                return loc.replace('-', '_')
        except Exception as e:
            logger.warning(f"Failed to detect system locale: {e}")
        
        # Fallback to English
        return "en_GB"
    
    def __init__(self, locale: Optional[str] = None, strict_mode: bool = False, translations_dir: Optional[Union[str, Path]] = None):
        """
        Initialize the I18n Manager.
        
        Args:
            locale: Initial locale to use (auto-detected if None)
            strict_mode: Whether to use strict mode (no fallbacks)
            translations_dir: Path to translations directory
        """
        # Auto-detect locale if not provided
        if locale is None:
            locale = self._detect_system_locale()
            
        self.default_locale = locale
        self._current_locale = locale
        self.fallback_locale = "en_GB"
        self.strict_mode = strict_mode
        
        # Set translations directory
        if translations_dir:
            self.translations_dir = Path(translations_dir)
        else:
            # Default to translations directory relative to this file
            self.translations_dir = Path(__file__).parent / "translations"
        
        # Cache for loaded translations
        self._translations_cache: Dict[str, Dict[str, Any]] = {}
        self._available_locales: Optional[List[str]] = None
        
        # Initialize number formatter
        self.number_formatter = NumberFormatter()
        
        # Load default locale
        self._load_locale(self.default_locale)
        
        # Force reload to ensure we get the flattened structure
        self.reload_translations()
        
        logger.info(f"I18nManager initialized with locale: {self.current_locale}")
    
    @property
    def translations(self) -> Dict[str, Dict[str, Any]]:
        """Get the translations cache for debugging."""
        return self._translations_cache    
    @property
    def current_locale(self) -> str:
        """Get the current locale."""
        return self._current_locale
    
    @current_locale.setter
    def current_locale(self, value: str):
        """Set the current locale."""
        self._current_locale = value
    
    
    def get_available_locales(self) -> List[str]:
        """
        Get list of available locales based on translation files.
        
        Returns:
            List of available locale codes
        """
        if self._available_locales is None:
            self._available_locales = []
            
            if self.translations_dir.exists():
                for file_path in self.translations_dir.glob("*.json"):
                    locale_code = file_path.stem
                    if self._is_valid_locale_file(file_path):
                        self._available_locales.append(locale_code)
            
            # Ensure default locale is included
            if self.default_locale not in self._available_locales:
                self._available_locales.append(self.default_locale)
                
            self._available_locales.sort()
            logger.debug(f"Found {len(self._available_locales)} available locales")
        
        return self._available_locales
    
    def _is_valid_locale_file(self, file_path: Path) -> bool:
        """
        Check if a translation file is valid.
        
        Args:
            file_path: Path to the translation file
            
        Returns:
            True if file is valid, False otherwise
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Check if it has basic structure
                return isinstance(data, dict) and '_metadata' in data
        except (json.JSONDecodeError, FileNotFoundError, KeyError):
            return False
    
    def set_locale(self, locale_code: str) -> bool:
        """
        Set the current locale.
        
        Args:
            locale_code: Locale code to set (e.g., 'en_US', 'fr_FR')
            
        Returns:
            True if locale was set successfully, False otherwise
        """
        if locale_code == self.current_locale:
            return True
            
        if self._load_locale(locale_code):
            old_locale = self.current_locale
            self._current_locale = locale_code
            logger.info(f"Locale changed from {old_locale} to {locale_code}")
            return True
        
        logger.warning(f"Failed to set locale to {locale_code}")
        return False
    
    def _load_locale(self, locale_code: str) -> bool:
        """
        Load translations for a specific locale.
        
        Args:
            locale_code: Locale code to load
            
        Returns:
            True if loaded successfully, False otherwise
        """
        if locale_code in self._translations_cache:
            return True
        
        translation_file = self.translations_dir / f"{locale_code}.json"
        
        if not translation_file.exists():
            logger.warning(f"Translation file not found: {translation_file}")
            return False
        
        try:
            with open(translation_file, 'r', encoding='utf-8') as f:
                translations = json.load(f)
                self._translations_cache[locale_code] = translations
                logger.debug(f"Loaded translations for {locale_code}")
                return True
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logger.error(f"Error loading translations for {locale_code}: {e}")
            return False
    
    def get_translation(self, key: str, locale: Optional[str] = None, **kwargs) -> str:
        """
        Get a translation for the given key.
        
        Args:
            key: Translation key (supports dot notation, e.g., 'menu.file.new')
            locale: Specific locale to use (defaults to current locale)
            **kwargs: Variables for string formatting
            
        Returns:
            Translated string
            
        Raises:
            MissingTranslationError: If translation is not found
        """
        target_locale = locale or self.current_locale
        
        # Try to get translation from target locale
        translation = self._get_translation_from_locale(key, target_locale)
        
        # Fallback to default locale if not found
        if translation is None and target_locale != self.fallback_locale:
            translation = self._get_translation_from_locale(key, self.fallback_locale)
        
        # If still not found, raise error or return key
        if translation is None:
            logger.warning(f"Translation not found for key: {key}")
            return key  # Return key as fallback
        
        # Format string with provided variables
        if kwargs:
            try:
                return translation.format(**kwargs)
            except (KeyError, ValueError) as e:
                logger.warning(f"Error formatting translation '{key}': {e}")
                return translation
        
        return translation
    
    def get_text(self, key: str, **kwargs) -> str:
        """
        Get translated text (alias for get_translation).
        
        Args:
            key: Translation key
            **kwargs: Variables for string formatting
            
        Returns:
            Translated string
        """
        return self.get_translation(key, **kwargs)
    
    def _get_translation_from_locale(self, key: str, locale: str) -> Optional[str]:
        """
        Get translation from a specific locale.
        
        Args:
            key: Translation key
            locale: Locale code
            
        Returns:
            Translation string or None if not found
        """
        # Load locale if not cached
        if locale not in self._translations_cache:
            if not self._load_locale(locale):
                return None
        
        translations = self._translations_cache[locale]
        
        # First try direct lookup for flat keys (new flattened structure)
        if key in translations:
            value = translations[key]
            return value if isinstance(value, str) else None
        
        # Fallback: Support dot notation for nested keys (legacy structure)
        keys = key.split('.')
        current = translations
        
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return None
        
        return current if isinstance(current, str) else None
    
    def get_locale_info(self, locale: Optional[str] = None) -> Dict[str, Any]:
        """
        Get metadata information for a locale.
        
        Args:
            locale: Locale code (defaults to current locale)
            
        Returns:
            Dictionary with locale metadata
        """
        target_locale = locale or self.current_locale
        
        if target_locale not in self._translations_cache:
            if not self._load_locale(target_locale):
                return {}
        
        translations = self._translations_cache[target_locale]
        return translations.get('_metadata', {})
    
    def get_completion_percentage(self, locale: Optional[str] = None) -> float:
        """
        Get completion percentage for a locale.
        
        Args:
            locale: Locale code (defaults to current locale)
            
        Returns:
            Completion percentage (0.0 to 100.0)
        """
        metadata = self.get_locale_info(locale)
        completion = metadata.get('completion', '0')
        
        try:
            return float(completion)
        except (ValueError, TypeError):
            return 0.0
    
    def clear_cache(self):
        """Clear the translations cache."""
        self._translations_cache.clear()
        self._available_locales = None
        logger.debug("Translation cache cleared")
    
    def reload_locale(self, locale: Optional[str] = None):
        """
        Reload translations for a specific locale.
        
        Args:
            locale: Locale to reload (defaults to current locale)
        """
        target_locale = locale or self.current_locale
        
        if target_locale in self._translations_cache:
            del self._translations_cache[target_locale]
        
        self._load_locale(target_locale)
        logger.debug(f"Reloaded locale: {target_locale}")
    
    def reload_translations(self):
        """
        Reload all translations by clearing cache and reloading current locale.
        """
        self.clear_cache()
        self._load_locale(self.current_locale)
        logger.debug("All translations reloaded")
    
    def _set_system_locale(self):
        """
        Set system locale for the current locale (placeholder implementation).
        """
        try:
            # This is a placeholder - in a full implementation you might
            # set system locale settings here
            logger.debug(f"System locale set to {self.current_locale}")
        except Exception as e:
            logger.warning(f"Failed to set system locale: {e}")


    def format_number(self, number: int, use_native: bool = True) -> str:
        """Format number using locale-appropriate number system"""
        try:
            if self.number_formatter and use_native:
                return self.number_formatter.format_number(number, self.current_locale, use_native)
            return str(number)
        except Exception as e:
            logger.warning(f"Failed to format number {number}: {e}")
            return str(number)
    
    def format_ordinal(self, number: int) -> str:
        """Format ordinal number using locale-appropriate system"""
        try:
            if self.number_formatter:
                return self.number_formatter.format_ordinal(number, self.current_locale)
            return str(number)
        except Exception as e:
            logger.warning(f"Failed to format ordinal {number}: {e}")
            return str(number)

# Global instance
_i18n_manager: Optional[I18nManager] = None


def get_i18n_manager() -> I18nManager:
    """
    Get the global I18n manager instance.
    
    Returns:
        Global I18nManager instance
    """
    global _i18n_manager
    if _i18n_manager is None:
        _i18n_manager = I18nManager()
    return _i18n_manager


def set_i18n_manager(manager: I18nManager):
    """
    Set the global I18n manager instance.
    
    Args:
        manager: I18nManager instance to set as global
    """
    global _i18n_manager
    _i18n_manager = manager


def tr(key: str, **kwargs) -> str:
    """
    Convenience function for getting translations.
    
    Args:
        key: Translation key
        **kwargs: Variables for string formatting
        
    Returns:
        Translated string
    """
    return get_i18n_manager().get_translation(key, **kwargs)


def set_locale(locale_code: str) -> bool:
    """
    Convenience function for setting locale.
    
    Args:
        locale_code: Locale code to set
        
    Returns:
        True if successful, False otherwise
    """
    return get_i18n_manager().set_locale(locale_code)


def get_available_locales() -> List[str]:
    """
    Convenience function for getting available locales.
    
    Returns:
        List of available locale codes
    """
    return get_i18n_manager().get_available_locales()


def convert_numbers(text: str, locale: Optional[str] = None) -> str:
    """
    Convert Western numerals to locale-appropriate numerals.
    
    Args:
        text: Text containing numbers to convert
        locale: Target locale (defaults to current locale)
        
    Returns:
        Text with converted numerals
    """
    target_locale = locale or get_i18n_manager().current_locale
    
    # Define numeral mappings for specific locales
    numeral_mappings = {
        # Arabic-Indic numerals for Arabic locales
        'ar_SA': {
            '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
            '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
        },
        # Devanagari numerals for Hindi locales
        'hi_IN': {
            '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
            '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
        },
        # Thai numerals for Thai locales
        'th_TH': {
            '0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔',
            '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙'
        }
    }
    
    # Get mapping for current locale
    mapping = numeral_mappings.get(target_locale)
    if not mapping:
        return text  # No conversion needed for this locale
    
    # Convert each digit
    result = text
    for western, local in mapping.items():
        result = result.replace(western, local)
    
    return result