"""
🌍 Multi-Country Holiday Provider

This module provides holiday data for the 14 major international countries
corresponding to our supported languages. It includes country support with
flags, names, and holiday codes for the most important international markets.
"""

import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Set, Any, TYPE_CHECKING
import holidays
from calendar_app.core.holiday_translations import get_translated_holiday_name

if TYPE_CHECKING:
    from calendar_app.data.models import Holiday

logger = logging.getLogger(__name__)


class MultiCountryHolidayProvider:
    """🌍 Provides holiday data for multiple countries with caching."""
    
    # Holidays to exclude from specific countries (zero cross-contamination)
    EXCLUDED_HOLIDAYS = {
        'CN': {
            # Western New Year variants (but NOT Chinese New Year)
            'New Year\'s Day',
            'New Year\'s Day (observed)',
            'New Year Day',
            
            # Christmas variants
            'Christmas Day',
            'Christmas Day (observed)',
            'Christmas',
            'Christmas Eve',
            'Boxing Day',
            
            # Labor Day variants (Western)
            'Labor Day',
            'Labor Day (observed)',
            'International Workers\' Day',
            'May Day',
            'Workers\' Day',
            'Labour Day',
            'Labour Day (observed)',
            
            # Other Western holidays
            'Easter',
            'Easter Monday',
            'Good Friday',
            'Valentine\'s Day',
            'Halloween',
            'Thanksgiving',
            'Independence Day',
            'Memorial Day',
            'Veterans Day',
            'Presidents Day',
            'Martin Luther King Jr. Day',
            'Washington\'s Birthday',
            'Columbus Day',
            'Mother\'s Day',
            'Father\'s Day',
            'All Saints\' Day',
            'Armistice Day'
        },
        'TW': {
            # Western holidays not celebrated in Taiwan
            'Christmas Day',
            'Christmas Day (observed)',
            'Christmas',
            'Boxing Day',
            'New Year\'s Day',  # Taiwan uses ROC calendar
            'New Year\'s Day (observed)',
            'Easter',
            'Good Friday',
            'Halloween',
            'Thanksgiving',
            'All Saints\' Day',
            'Armistice Day'
        },
        'SA': {
            # Non-Islamic holidays
            'Christmas Day',
            'Christmas Day (observed)',
            'Christmas',
            'New Year\'s Day',
            'New Year\'s Day (observed)',
            'Easter',
            'Good Friday',
            'Boxing Day',
            'Halloween',
            'Valentine\'s Day',
            'Thanksgiving',
            'All Saints\' Day',
            'Armistice Day'
        },
        'JP': {
            # Western holidays not officially celebrated in Japan
            'Christmas Day',
            'Christmas Day (observed)',
            'Christmas',
            'New Year\'s Day',  # Japan has its own New Year period
            'New Year\'s Day (observed)',
            'Boxing Day',
            'Easter',
            'Good Friday',
            'Halloween',
            'Valentine\'s Day',
            'All Saints\' Day',
            'Armistice Day'
        },
        'KR': {
            # Western holidays not officially celebrated in Korea
            'Christmas Day',
            'Christmas Day (observed)',
            'Christmas',
            'New Year\'s Day',  # Korea has its own New Year celebration
            'New Year\'s Day (observed)',
            'Boxing Day',
            'Easter',
            'Good Friday',
            'Halloween',
            'Valentine\'s Day',
            'All Saints\' Day',
            'Armistice Day'
        },
        'IN': {
            # Western holidays not universally celebrated
            'Christmas Day',
            'Christmas Day (observed)',
            'Christmas',
            'New Year\'s Day',  # India has multiple New Year celebrations
            'New Year\'s Day (observed)',
            'Boxing Day',
            'Easter',
            'Good Friday',
            'Halloween',
            'Valentine\'s Day',
            'All Saints\' Day',
            'Armistice Day'
        },
        'FR': {
            # Non-French holidays
            'Boxing Day',  # British holiday
            'German Unity Day',
            'Festa della Repubblica',  # Italian
            'Constitution Day',  # Spanish
            'Independence Day',  # American
            'Thanksgiving',  # American
            'Memorial Day',  # American
            'Veterans Day',  # American
            'Presidents Day',  # American
            'Martin Luther King Jr. Day',  # American
            'Washington\'s Birthday',  # American
            'Columbus Day'  # American
        },
        'DE': {
            # Non-German holidays
            'Boxing Day',  # British holiday
            'Armistice Day',  # French
            'Festa della Repubblica',  # Italian
            'Constitution Day',  # Spanish
            'Independence Day',  # American
            'Thanksgiving',  # American
            'Memorial Day',  # American
            'Veterans Day',  # American
            'Presidents Day',  # American
            'Martin Luther King Jr. Day',  # American
            'Washington\'s Birthday',  # American
            'Columbus Day'  # American
        },
        'IT': {
            # Non-Italian holidays
            'Boxing Day',  # British holiday
            'Armistice Day',  # French
            'German Unity Day',  # German
            'Constitution Day',  # Spanish
            'Independence Day',  # American
            'Thanksgiving',  # American
            'Memorial Day',  # American
            'Veterans Day',  # American
            'Presidents Day',  # American
            'Martin Luther King Jr. Day',  # American
            'Washington\'s Birthday',  # American
            'Columbus Day'  # American
        },
        'ES': {
            # Non-Spanish holidays
            'Boxing Day',  # British holiday
            'Armistice Day',  # French
            'German Unity Day',  # German
            'Festa della Repubblica',  # Italian
            'Independence Day',  # American
            'Thanksgiving',  # American
            'Memorial Day',  # American
            'Veterans Day',  # American
            'Presidents Day',  # American
            'Martin Luther King Jr. Day',  # American
            'Washington\'s Birthday',  # American
            'Columbus Day',  # American
            'Victory Day',  # Russian holiday
            'Russia Day',  # Russian holiday
            'Unity Day',  # Russian holiday
            'Defender of the Fatherland Day',  # Russian holiday
            'International Women\'s Day',  # Russian holiday
            'New Year Holidays',  # Russian holiday
            'Orthodox Christmas',  # Russian holiday
            'Holiday of Spring and Labor',  # Russian variant
            'Chinese New Year',  # Chinese holiday
            'Spring Festival',  # Chinese holiday
            'National Foundation Day',  # Japanese/Korean holiday
            'Children\'s Day',  # Japanese/Korean holiday
            'Sports Day',  # Japanese holiday
            'Culture Day',  # Japanese holiday
            'Respect for the Aged Day',  # Japanese holiday
            'Liberation Day',  # Korean holiday
            'Hangeul Day',  # Korean holiday
            'Chuseok',  # Korean holiday
            'Buddha\'s Birthday',  # Asian holiday
            'Republic Day',  # Indian holiday
            'Gandhi Jayanti',  # Indian holiday
            'Diwali',  # Indian holiday
            'Holi',  # Indian holiday
            'Eid al-Fitr',  # Islamic holiday
            'Eid al-Adha',  # Islamic holiday
            'Prophet\'s Birthday'  # Islamic holiday
        },
        'BR': {
            # Non-Brazilian holidays
            'Boxing Day',  # British holiday
            'Armistice Day',  # French
            'German Unity Day',  # German
            'Festa della Repubblica',  # Italian
            'Constitution Day',  # Spanish
            'Independence Day',  # American (Brazil has its own)
            'Thanksgiving',  # American
            'Memorial Day',  # American
            'Veterans Day',  # American
            'Presidents Day',  # American
            'Martin Luther King Jr. Day',  # American
            'Washington\'s Birthday',  # American
            'Columbus Day'  # American
        },
        'RU': {
            # Non-Russian holidays - comprehensive exclusion list
            'Boxing Day',  # British holiday
            'Armistice Day',  # French
            'German Unity Day',  # German
            'Festa della Repubblica',  # Italian
            'Constitution Day',  # Spanish
            'Independence Day',  # American
            'Thanksgiving',  # American
            'Memorial Day',  # American
            'Veterans Day',  # American
            'Presidents Day',  # American
            'Martin Luther King Jr. Day',  # American
            'Washington\'s Birthday',  # American
            'Columbus Day',  # American
            'Christmas Day',  # Russia uses Orthodox Christmas
            'Christmas Day (observed)',
            'Christmas Eve',  # Western Christmas
            'Epiphany',  # Spanish/Western holiday
            'Immaculate Conception',  # Spanish/Catholic holiday
            'All Saints\' Day',  # Western holiday
            'Assumption of Mary',  # Catholic holiday
            'Corpus Christi',  # Catholic holiday
            'Good Friday',  # Western Easter
            'Easter Monday',  # Western Easter
            'Whit Monday',  # Western holiday
            'Ascension Day',  # Western holiday
            'Maundy Thursday',  # Western Easter
            'Palm Sunday',  # Western Easter
            'Ash Wednesday',  # Western holiday
            'Carnival',  # Western holiday
            'Saint Stephen\'s Day',  # Western holiday
            'Saint Patrick\'s Day',  # Irish holiday
            'Saint George\'s Day',  # English holiday
            'Bastille Day',  # French holiday
            'Liberation Day',  # Various countries
            'Republic Day',  # Various countries (not Russian)
            'National Day',  # Various countries (not Russian)
            'May Day',  # Western Labor Day variant
            'Labour Day',  # British variant
            'Workers\' Day',  # Generic variant
            'International Workers\' Day',  # Generic variant
            'Halloween',  # Western holiday
            'Valentine\'s Day',  # Western holiday
            'Mother\'s Day',  # Western holiday
            'Father\'s Day',  # Western holiday
            'New Year\'s Day',  # Russia has New Year Holidays instead
            'New Year\'s Day (observed)',  # Russia has New Year Holidays instead
            'New Year Day'  # Alternative spelling
        }
    }
    
    # Major international countries matching our 13 supported languages
    SUPPORTED_COUNTRIES = {
        # Core international countries corresponding to our major languages
        'US': {'name': 'United States', 'flag': '🇺🇸', 'code': 'US'},        # en_US
        'ES': {'name': 'Spain', 'flag': '🇪🇸', 'code': 'ES'},               # es_ES
        'FR': {'name': 'France', 'flag': '🇫🇷', 'code': 'FR'},              # fr_FR
        'DE': {'name': 'Germany', 'flag': '🇩🇪', 'code': 'DE'},             # de_DE
        'IT': {'name': 'Italy', 'flag': '🇮🇹', 'code': 'IT'},               # it_IT
        'BR': {'name': 'Brazil', 'flag': '🇧🇷', 'code': 'BR'},              # pt_BR
        'RU': {'name': 'Russia', 'flag': '🇷🇺', 'code': 'RU'},              # ru_RU
        'CN': {'name': 'China', 'flag': '🇨🇳', 'code': 'CN'},               # zh_CN
        'TW': {'name': 'Taiwan', 'flag': '🇹🇼', 'code': 'TW'},              # zh_TW
        'JP': {'name': 'Japan', 'flag': '🇯🇵', 'code': 'JP'},               # ja_JP
        'KR': {'name': 'South Korea', 'flag': '🇰🇷', 'code': 'KR'},         # ko_KR
        'IN': {'name': 'India', 'flag': '🇮🇳', 'code': 'IN'},               # hi_IN
        'SA': {'name': 'Saudi Arabia', 'flag': '🇸🇦', 'code': 'SA'},        # ar_SA
        
        # Keep GB for backward compatibility (default fallback)
        'GB': {'name': 'United Kingdom', 'flag': '🇬🇧', 'code': 'UK'}       # Legacy default
    }
    
    # Fallback holiday data for countries not supported by holidays library
    # Note: These will be filtered based on EXCLUDED_HOLIDAYS for each country
    FALLBACK_HOLIDAYS = {
        'New Year\'s Day': '01-01',
        'Christmas Day': '12-25'
    }
    
    def __init__(self, country_code: str = 'GB'):
        """
        Initialize the multi-country holiday provider.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code (defaults to GB for United Kingdom)
        """
        self.country_code = country_code.upper()
        self._holiday_cache: Dict[int, holidays.HolidayBase] = {}
        self._fallback_cache: Dict[int, Dict[date, str]] = {}
        
        # Validate country code
        if self.country_code not in self.SUPPORTED_COUNTRIES:
            logger.warning(f"⚠️ Country code '{self.country_code}' not supported, falling back to GB")
            self.country_code = 'GB'
        
        logger.debug(f"🌍 Initialized holiday provider for {self.get_country_display_name()}")
    
    def _get_current_locale(self) -> str:
        """Get the current application locale for holiday translations."""
        try:
            # CRITICAL FIX: Try multiple sources to get the current locale
            current_locale = None
            
            # First, try to get from I18n manager
            try:
                from calendar_app.localization.i18n_manager import get_i18n_manager
                i18n_manager = get_i18n_manager()
                current_locale = i18n_manager.current_locale
                logger.debug(f"🌍 Holiday provider using locale from I18n manager: {current_locale}")
            except Exception as i18n_error:
                logger.debug(f"🌍 I18n manager not available: {i18n_error}")
            
            # If I18n manager failed, try to get from settings manager
            if not current_locale or current_locale == 'en_US':
                try:
                    from calendar_app.config.settings import SettingsManager
                    from pathlib import Path
                    app_data_dir = Path.home() / ".calendar_app"
                    settings_file = app_data_dir / "settings.json"
                    settings_manager = SettingsManager(settings_file)
                    current_locale = settings_manager.get_locale()
                    logger.debug(f"🌍 Holiday provider using locale from settings: {current_locale}")
                except Exception as settings_error:
                    logger.debug(f"🌍 Settings manager not available: {settings_error}")
            
            # Final fallback
            if not current_locale:
                current_locale = 'en_US'
                logger.debug(f"🌍 Holiday provider falling back to en_US locale")
            
            # AUTOMATIC COUNTRY MATCHING: Update country to match current locale
            self._auto_update_country_from_locale(current_locale)
            
            return current_locale
        except Exception as e:
            # Ultimate fallback to English if everything fails
            logger.debug(f"🌍 Holiday provider falling back to en_US locale due to error: {e}")
            return 'en_US'
    
    def _auto_update_country_from_locale(self, locale: str) -> None:
        """Automatically update country to match the current locale."""
        # Mapping of locales to their corresponding countries
        locale_to_country = {
            'en_US': 'US',
            'en_GB': 'GB',
            'es_ES': 'ES',
            'fr_FR': 'FR',
            'de_DE': 'DE',
            'it_IT': 'IT',
            'pt_BR': 'BR',
            'ru_RU': 'RU',
            'zh_CN': 'CN',
            'zh_TW': 'TW',
            'ja_JP': 'JP',
            'ko_KR': 'KR',
            'hi_IN': 'IN',
            'ar_SA': 'SA'
        }
        
        expected_country = locale_to_country.get(locale)
        if expected_country and expected_country != self.country_code:
            logger.debug(f"🌍 Auto-updating country from {self.country_code} to {expected_country} to match locale {locale}")
            self.country_code = expected_country
            self._holiday_cache.clear()
            self._fallback_cache.clear()
    
    def _translate_holiday_name(self, english_name: str) -> str:
        """Translate holiday name to current locale."""
        current_locale = self._get_current_locale()
        
        # CRITICAL FIX: Enforce native-only holiday translations
        # Only show holidays if the interface language matches the country
        if not self._is_native_locale_country_match(current_locale):
            # Return English name if locale doesn't match country (no native translation available)
            return english_name
        
        return get_translated_holiday_name(english_name, current_locale)
    
    def _is_native_locale_country_match(self, locale: str) -> bool:
        """Check if the current locale matches the holiday country for native translations."""
        # Mapping of countries to their native locales
        country_to_locale = {
            'US': 'en_US',
            'GB': 'en_GB',
            'ES': 'es_ES',
            'FR': 'fr_FR',
            'DE': 'de_DE',
            'IT': 'it_IT',
            'BR': 'pt_BR',
            'RU': 'ru_RU',
            'CN': 'zh_CN',
            'TW': 'zh_TW',
            'JP': 'ja_JP',
            'KR': 'ko_KR',
            'IN': 'hi_IN',
            'SA': 'ar_SA'
        }
        
        expected_locale = country_to_locale.get(self.country_code)
        return locale == expected_locale
    
    def get_country_display_name(self) -> str:
        """Get the display name for the current country."""
        country_info = self.SUPPORTED_COUNTRIES.get(self.country_code, self.SUPPORTED_COUNTRIES['GB'])
        return f"{country_info['flag']} {country_info['name']}"
    
    def set_country(self, country_code: str) -> None:
        """
        Change the country for holiday calculations.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code
        """
        new_code = country_code.upper()
        if new_code not in self.SUPPORTED_COUNTRIES:
            logger.warning(f"⚠️ Country code '{new_code}' not supported")
            return
        
        if new_code != self.country_code:
            self.country_code = new_code
            self._holiday_cache.clear()
            self._fallback_cache.clear()
            logger.debug(f"🌍 Changed country to {self.get_country_display_name()}")
    
    def _filter_holidays(self, holiday_dict: Dict[date, str]) -> Dict[date, str]:
        """Filter out holidays that shouldn't appear in this country."""
        excluded_holidays = self.EXCLUDED_HOLIDAYS.get(self.country_code, set())
        if not excluded_holidays:
            return holiday_dict
        
        filtered_holidays = {}
        for holiday_date, holiday_name in holiday_dict.items():
            should_exclude = False
            
            # Direct name match
            if holiday_name in excluded_holidays:
                should_exclude = True
                logger.debug(f"🚫 Filtered out '{holiday_name}' from {self.country_code} (direct match)")
            
            # Pattern-based exclusion - only apply if not already excluded by direct match
            elif not should_exclude:
                holiday_lower = holiday_name.lower()
                
                if self.country_code == 'CN':
                    # China: Exclude Western holidays but preserve Chinese holidays
                    western_patterns = [
                        ('new year\'s day', lambda h: 'chinese' not in h),  # Exclude "New Year's Day" but not "Chinese New Year"
                        ('christmas', lambda h: True),
                        ('labor day', lambda h: 'chinese' not in h and 'spring festival' not in h),
                        ('easter', lambda h: True),
                        ('good friday', lambda h: True),
                        ('valentine', lambda h: True),
                        ('halloween', lambda h: True),
                        ('thanksgiving', lambda h: True),
                        ('independence day', lambda h: True),
                        ('memorial day', lambda h: True),
                        ('veterans day', lambda h: True),
                        ('all saints', lambda h: True),
                        ('armistice', lambda h: True)
                    ]
                    
                    for pattern, condition in western_patterns:
                        if pattern in holiday_lower and condition(holiday_lower):
                            should_exclude = True
                            logger.debug(f"🚫 Filtered out '{holiday_name}' from {self.country_code} (pattern: {pattern})")
                            break
                
                # Apply filtering to ALL non-Western countries
                elif self.country_code in ['TW', 'JP', 'KR', 'IN', 'SA']:
                    # These countries should exclude most Western holidays
                    western_patterns = []
                    
                    if self.country_code in ['TW', 'JP', 'KR']:
                        # Asian countries: More nuanced filtering
                        western_patterns = [
                            ('new year\'s day', lambda h: 'chinese' not in h and 'korean' not in h and 'founding' not in h and 'republic' not in h),
                            ('christmas', lambda h: True),
                            ('easter', lambda h: True),
                            ('good friday', lambda h: True),
                            ('thanksgiving', lambda h: 'labor thanksgiving' not in h),  # Japan has "Labor Thanksgiving Day" - be more specific
                            ('memorial day', lambda h: 'peace' not in h),  # Taiwan has "Peace Memorial Day"
                            ('independence day', lambda h: 'liberation' not in h),  # Korea has "Liberation Day"
                            ('all saints', lambda h: True),
                            ('armistice', lambda h: True),
                            ('boxing day', lambda h: True),
                            ('valentine', lambda h: True),
                            ('halloween', lambda h: True)
                        ]
                    
                    elif self.country_code == 'IN':
                        # India: Exclude Western holidays but preserve Indian variants
                        western_patterns = [
                            ('new year\'s day', lambda h: 'indian' not in h and 'hindu' not in h),
                            ('christmas', lambda h: True),
                            ('easter', lambda h: True),
                            ('independence day', lambda h: 'indian' not in h),  # India has its own Independence Day
                            ('memorial day', lambda h: True),
                            ('thanksgiving', lambda h: True),
                            ('all saints', lambda h: True),
                            ('armistice', lambda h: True),
                            ('boxing day', lambda h: True),
                            ('valentine', lambda h: True),
                            ('halloween', lambda h: True)
                        ]
                    
                    elif self.country_code == 'SA':
                        # Saudi Arabia: Exclude all non-Islamic holidays
                        western_patterns = [
                            ('new year\'s day', lambda h: True),
                            ('christmas', lambda h: True),
                            ('easter', lambda h: True),
                            ('good friday', lambda h: True),
                            ('valentine', lambda h: True),
                            ('halloween', lambda h: True),
                            ('thanksgiving', lambda h: True),
                            ('independence day', lambda h: True),
                            ('memorial day', lambda h: True),
                            ('veterans day', lambda h: True),
                            ('all saints', lambda h: True),
                            ('armistice', lambda h: True),
                            ('boxing day', lambda h: True)
                        ]
                    
                    for pattern, condition in western_patterns:
                        if pattern in holiday_lower and condition(holiday_lower):
                            should_exclude = True
                            logger.debug(f"🚫 Filtered out '{holiday_name}' from {self.country_code} (pattern: {pattern})")
                            break
            
            if not should_exclude:
                filtered_holidays[holiday_date] = holiday_name
        
        return filtered_holidays
    
    def _get_holidays_for_year(self, year: int) -> holidays.HolidayBase:
        """Get holidays for a specific year with caching."""
        if year not in self._holiday_cache:
            try:
                country_info = self.SUPPORTED_COUNTRIES[self.country_code]
                holiday_code = country_info['code']
                
                # Special handling for UK to get complete holiday set including Easter Monday and August Bank Holiday
                if holiday_code == 'UK':
                    raw_holidays = holidays.UK(state='England', years=year)
                    logger.debug(f"📅 Loaded UK (England) holidays for {country_info['name']} ({year})")
                else:
                    # Create holidays instance for other countries
                    raw_holidays = holidays.country_holidays(holiday_code, years=year)
                    logger.debug(f"📅 Loaded holidays for {country_info['name']} ({year})")
                
                # Filter out unwanted holidays
                filtered_holidays_dict = self._filter_holidays(dict(raw_holidays))
                
                # Create new holidays instance with filtered holidays
                filtered_holidays = holidays.HolidayBase()
                for holiday_date, holiday_name in filtered_holidays_dict.items():
                    filtered_holidays[holiday_date] = holiday_name
                
                self._holiday_cache[year] = filtered_holidays
                
            except Exception as e:
                logger.warning(f"⚠️ Failed to load holidays for {self.country_code} ({year}): {e}")
                # Create empty holidays instance as fallback
                self._holiday_cache[year] = holidays.HolidayBase()
        
        return self._holiday_cache[year]
    
    def _get_fallback_holidays_for_year(self, year: int) -> Dict[date, str]:
        """Get fallback holidays for a specific year."""
        if year not in self._fallback_cache:
            fallback_holidays = {}
            for name, date_str in self.FALLBACK_HOLIDAYS.items():
                try:
                    month, day = map(int, date_str.split('-'))
                    holiday_date = date(year, month, day)
                    fallback_holidays[holiday_date] = name
                except ValueError:
                    continue
            
            # Filter out unwanted holidays from fallback as well
            filtered_fallback = self._filter_holidays(fallback_holidays)
            self._fallback_cache[year] = filtered_fallback
        
        return self._fallback_cache[year]
    
    def is_holiday(self, check_date: date) -> bool:
        """
        Check if a given date is a holiday.
        
        Args:
            check_date: The date to check
            
        Returns:
            True if the date is a holiday, False otherwise
        """
        try:
            holidays_for_year = self._get_holidays_for_year(check_date.year)
            if check_date in holidays_for_year:
                return True
            
            # Check fallback holidays if not found in main holidays
            fallback_holidays = self._get_fallback_holidays_for_year(check_date.year)
            return check_date in fallback_holidays
            
        except Exception as e:
            logger.warning(f"⚠️ Error checking holiday for {check_date}: {e}")
            return False
    
    def get_holiday(self, check_date: date) -> Optional[str]:
        """
        Get the holiday name for a given date.
        
        Args:
            check_date: The date to check
            
        Returns:
            Translated holiday name if the date is a holiday, None otherwise
        """
        try:
            holidays_for_year = self._get_holidays_for_year(check_date.year)
            if check_date in holidays_for_year:
                english_name = holidays_for_year[check_date]
                return self._translate_holiday_name(english_name)
            
            # Check fallback holidays if not found in main holidays
            fallback_holidays = self._get_fallback_holidays_for_year(check_date.year)
            english_name = fallback_holidays.get(check_date)
            if english_name:
                return self._translate_holiday_name(english_name)
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Error getting holiday for {check_date}: {e}")
            return None
    
    def get_holiday_object(self, check_date: date) -> Optional['Holiday']:
        """
        Get the Holiday object for a given date.
        
        Args:
            check_date: The date to check
            
        Returns:
            Holiday object with translated name if the date is a holiday, None otherwise
        """
        try:
            from calendar_app.data.models import Holiday
            
            holiday_name = self.get_holiday(check_date)
            if holiday_name:
                return Holiday(
                    name=holiday_name,
                    date=check_date,
                    country_code=self.country_code,
                    type='bank_holiday',
                    is_observed=True
                )
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Error getting holiday object for {check_date}: {e}")
            return None
    
    def get_holidays_for_month(self, year: int, month: int) -> List['Holiday']:
        """
        Get all holidays for a specific month.
        
        Args:
            year: The year
            month: The month (1-12)
            
        Returns:
            List of Holiday objects with translated names for the month
        """
        try:
            from calendar_app.data.models import Holiday
            
            holidays_for_year = self._get_holidays_for_year(year)
            fallback_holidays = self._get_fallback_holidays_for_year(year)
            
            # Combine both holiday sources
            all_holidays = dict(holidays_for_year)
            all_holidays.update(fallback_holidays)
            
            # Filter for the specific month and create Holiday objects with translated names
            month_holidays = []
            for holiday_date, english_name in all_holidays.items():
                if holiday_date.month == month:
                    translated_name = self._translate_holiday_name(english_name)
                    holiday = Holiday(
                        name=translated_name,
                        date=holiday_date,
                        country_code=self.country_code,
                        type='bank_holiday',
                        is_observed=True
                    )
                    month_holidays.append(holiday)
            
            return month_holidays
            
        except Exception as e:
            logger.warning(f"⚠️ Error getting holidays for {year}-{month:02d}: {e}")
            return []
    
    def is_weekend(self, check_date: date) -> bool:
        """
        Check if a given date is a weekend.
        
        Args:
            check_date: The date to check
            
        Returns:
            True if the date is a weekend (Saturday or Sunday), False otherwise
        """
        # Saturday = 5, Sunday = 6 in Python's weekday() method
        return check_date.weekday() >= 5
    
    def is_weekend_or_holiday(self, check_date: date) -> bool:
        """
        Check if a given date is a weekend or holiday.
        
        Args:
            check_date: The date to check
            
        Returns:
            True if the date is a weekend or holiday, False otherwise
        """
        return self.is_weekend(check_date) or self.is_holiday(check_date)
    
    def get_working_days_in_month(self, year: int, month: int) -> List[date]:
        """
        Get all working days (non-weekend, non-holiday) in a month.
        
        Args:
            year: The year
            month: The month (1-12)
            
        Returns:
            List of working day dates
        """
        try:
            from calendar import monthrange
            
            working_days = []
            _, last_day = monthrange(year, month)
            
            for day in range(1, last_day + 1):
                check_date = date(year, month, day)
                if not self.is_weekend_or_holiday(check_date):
                    working_days.append(check_date)
            
            return working_days
            
        except Exception as e:
            logger.warning(f"⚠️ Error getting working days for {year}-{month:02d}: {e}")
            return []
    
    def clear_cache(self) -> None:
        """Clear the holiday cache to free memory."""
        self._holiday_cache.clear()
        self._fallback_cache.clear()
        logger.debug("🧹 Holiday cache cleared")
    
    def refresh_translations(self) -> None:
        """🔄 Refresh holiday translations by clearing cache.
        
        This should be called when the locale changes to ensure
        holiday names are re-translated in the new language.
        """
        self.clear_cache()
        logger.debug("🌍 Holiday translations refreshed for locale change")
    
    @classmethod
    def get_supported_countries(cls) -> Dict[str, Dict[str, str]]:
        """
        Get all supported countries.
        
        Returns:
            Dictionary of country codes to country information
        """
        return cls.SUPPORTED_COUNTRIES.copy()
    
    @classmethod
    def get_sorted_countries(cls) -> List[tuple]:
        """
        Get all supported countries sorted alphabetically by name.
        
        Returns:
            List of tuples (country_code, country_info) sorted by country name
        """
        return sorted(
            cls.SUPPORTED_COUNTRIES.items(),
            key=lambda x: x[1]['name']
        )