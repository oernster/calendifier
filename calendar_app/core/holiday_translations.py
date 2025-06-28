"""
Holiday translation mappings for all supported locales.
This file contains ONLY locale-specific holiday translations with ZERO cross-contamination.
Each locale translates ONLY holidays that are TRULY specific to that country/culture.
Common holidays like "New Year's Day", "Christmas Day", "Labor Day" remain in English unless culturally specific.
"""

import re
from typing import Dict, Optional

# Pure locale-specific holiday translations - ZERO CROSS-CONTAMINATION
HOLIDAY_TRANSLATIONS = {
    'ar_SA': {
        # Common holidays in Arabic
        "New Year's Day": 'رأس السنة الميلادية',
        'Labor Day': 'عيد العمال',
        'Christmas Day': 'عيد الميلاد',
        'Christmas Eve': 'ليلة عيد الميلاد',
        
        # Status indicators
        'Day off': 'يوم عطلة',
        'observed': 'ملاحظ',
        'substituted from': 'مستبدل من',
    },
    'de_DE': {
        'German Unity Day': 'Tag der Deutschen Einheit',
        'Reformation Day': 'Reformationstag',
        'Corpus Christi': 'Fronleichnam',
        'Assumption of Mary': 'Mariä Himmelfahrt',
        "All Saints' Day": 'Allerheiligen',
        'Day of Repentance and Prayer': 'Buß- und Bettag',
        'Second Day of Christmas': 'Zweiter Weihnachtsfeiertag',
        'Good Friday': 'Karfreitag',
        'Easter Monday': 'Ostermontag',
        'Whit Monday': 'Pfingstmontag',
        'Day off': 'Freier Tag',
        'observed': 'beobachtet',
        'substituted from': 'ersetzt von',
    },
    'en_GB': {
        'Boxing Day': 'Boxing Day',
        'May Day': 'May Day',
        'Spring Bank Holiday': 'Spring Bank Holiday',
        'Summer Bank Holiday': 'Summer Bank Holiday',
        "Queen's Birthday": "Queen's Birthday",
        'Platinum Jubilee': 'Platinum Jubilee',
        'Good Friday': 'Good Friday',
        'Easter Monday': 'Easter Monday',
        'Independence Day': 'Independence Day',
        'Thanksgiving': 'Thanksgiving',
        'Memorial Day': 'Memorial Day',
        'Day off': 'Day off',
        'observed': 'observed',
        'substituted from': 'substituted from',
    },
    'en_US': {
        'Independence Day': 'Independence Day',
        'Thanksgiving': 'Thanksgiving',
        'Memorial Day': 'Memorial Day',
        'Veterans Day': 'Veterans Day',
        'Presidents Day': 'Presidents Day',
        'Martin Luther King Jr. Day': 'Martin Luther King Jr. Day',
        'Columbus Day': 'Columbus Day',
        'Good Friday': 'Good Friday',
        'Easter Monday': 'Easter Monday',
        'Day off': 'Day off',
        'observed': 'observed',
        'substituted from': 'substituted from',
    },
    'es_ES': {
        # Common holidays that appear in Spanish calendar
        "New Year's Day": 'Día de Año Nuevo',
        'Labor Day': 'Día del Trabajo',
        'Christmas Day': 'Día de Navidad',
        'Christmas Eve': 'Nochebuena',
        'Assumption Day': 'Asunción de la Virgen',
        'Assumption of Mary': 'Asunción de la Virgen',
        
        # Spanish-specific holidays
        'Epiphany': 'Día de Reyes',
        'Constitution Day': 'Día de la Constitución',
        'Immaculate Conception': 'Inmaculada Concepción',
        'National Day': 'Fiesta Nacional',
        "All Saints' Day": 'Día de Todos los Santos',
        'Maundy Thursday': 'Jueves Santo',
        'Good Friday': 'Viernes Santo',
        'Easter Monday': 'Lunes de Pascua',
        
        # Status indicators
        'Day off': 'Día libre',
        'observed': 'observado',
        'substituted from': 'sustituido desde',
    },
    'fr_FR': {
        'Bastille Day': 'Fête nationale',
        'Armistice Day': 'Armistice',
        'Victory in Europe Day': 'Fête de la Victoire',
        'Ascension Day': 'Ascension',
        'Whit Monday': 'Lundi de Pentecôte',
        'Assumption of Mary': 'Assomption',
        "All Saints' Day": 'Toussaint',
        'Good Friday': 'Vendredi Saint',
        'Easter Monday': 'Lundi de Pâques',
        'Day off': 'Jour de congé',
        'observed': 'observé',
        'substituted from': 'substitué depuis',
    },
    'hi_IN': {
        'Independence Day (India)': 'स्वतंत्रता दिवस',
        'Republic Day': 'गणतंत्र दिवस',
        'Gandhi Jayanti': 'गांधी जयंती',
        'Diwali': 'दीवाली',
        'Holi': 'होली',
        'Dussehra': 'दशहरा',
        'Janmashtami': 'जन्माष्टमी',
        'Mahavir Jayanti': 'महावीर जयंती',
        'Guru Nanak Jayanti': 'गुरु नानक जयंती',
        'Maha Shivaratri': 'महा शिवरात्रि',
        'Karva Chauth': 'करवा चौथ',
        'Raksha Bandhan': 'रक्षा बंधन',
        'Navratri': 'नवरात्रि',
        'Eid al-Fitr': 'ईद उल-फितर',
        'Eid al-Adha': 'ईद उल-अधा',
        'Good Friday': 'गुड फ्राइडे',
        'Day off': 'छुट्टी का दिन',
        'observed': 'मनाया गया',
        'substituted from': 'से प्रतिस्थापित',
    },
    'it_IT': {
        'Republic Day': 'Festa della Repubblica',
        'Liberation Day': 'Festa della Liberazione',
        "Saint Stephen's Day": 'Santo Stefano',
        'Assumption of Mary': 'Assunzione di Maria',
        "All Saints' Day": 'Ognissanti',
        'Good Friday': 'Venerdì Santo',
        "Easter Monday": "Lunedì dell'Angelo",
        'Day off': 'Giorno libero',
        'observed': 'osservato',
        'substituted from': 'sostituito da',
    },
    'ja_JP': {
        'National Foundation Day': '建国記念の日',
        'Constitution Memorial Day': '憲法記念日',
        "Children's Day": 'こどもの日',
        'Respect for the Aged Day': '敬老の日',
        'Sports Day': 'スポーツの日',
        'Culture Day': '文化の日',
        'Showa Day': '昭和の日',
        'Greenery Day': 'みどりの日',
        'Marine Day': '海の日',
        'Mountain Day': '山の日',
        'Coming of Age Day': '成人の日',
        'Vernal Equinox Day': '春分の日',
        'Autumnal Equinox Day': '秋分の日',
        "Emperor's Birthday": '天皇誕生日',
        'Golden Week': 'ゴールデンウィーク',
        'Substitute Holiday': '振替休日',
        'Day off': '休日',
        'observed': '振替',
        'substituted from': 'から振替',
    },
    'ko_KR': {
        'Liberation Day': '광복절',
        'National Foundation Day': '개천절',
        'Hangeul Day': '한글날',
        "Children's Day": '어린이날',
        'Memorial Day (Korea)': '현충일',
        'Constitution Day (Korea)': '제헌절',
        'Korean New Year': '설날',
        'Chuseok': '추석',
        "Buddha's Birthday": '부처님 오신 날',
        "The Buddha's Birthday": '부처님 오신 날',
        'The day preceding Korean New Year': '설날 전날',
        'The second day of Korean New Year': '설날 다음날',
        'The day preceding Chuseok': '추석 전날',
        'The second day of Chuseok': '추석 다음날',
        'Day off': '휴일',
        'observed': '대체',
        'substituted from': '에서 대체',
    },
    'pt_BR': {
        'Independence Day (Brazil)': 'Dia da Independência',
        'Our Lady of Aparecida': 'Nossa Senhora Aparecida',
        "All Souls' Day": 'Finados',
        'Proclamation of the Republic': 'Proclamação da República',
        "Tiradentes' Day": 'Tiradentes',
        'Carnival': 'Carnaval',
        'Corpus Christi': 'Corpus Christi',
        'Universal Fraternization Day': 'Confraternização Universal',
        'Good Friday': 'Sexta-feira Santa',
        'Day off': 'Dia de folga',
        'observed': 'observado',
        'substituted from': 'substituído de',
    },
    'ru_RU': {
        'Victory Day': 'День Победы',
        'Russia Day': 'День России',
        'Unity Day': 'День народного единства',
        'Defender of the Fatherland Day': 'День защитника Отечества',
        "International Women's Day": 'Международный женский день',
        'New Year holidays': 'Новогодние каникулы',
        'New Year Holidays': 'Новогодние каникулы',
        'Holiday of Spring and Labor': 'Праздник Весны и Труда',
        'Orthodox Christmas': 'Православное Рождество',
        'Day off': 'Выходной день',
        'observed': 'перенесён',
        'substituted from': 'перенесён с',
    },
    'zh_CN': {
        'National Day': '国庆节',
        'Spring Festival': '春节',
        'Qingming Festival': '清明节',
        'Dragon Boat Festival': '端午节',
        'Mid-Autumn Festival': '中秋节',
        'National Day Holiday': '国庆节假期',
        'Tomb-Sweeping Day': '清明节',
        'Chinese New Year': '春节',
        "Chinese New Year's Eve": '除夕',
        'The second day of Chinese New Year': '春节第二天',
        'The third day of Chinese New Year': '春节第三天',
        'Day off': '休息日',
        'observed': '调休',
        'substituted from': '从调休',
    },
    'zh_TW': {
        'National Day': '國慶日',
        'Spring Festival': '春節',
        'Tomb-Sweeping Day': '清明節',
        'Dragon Boat Festival': '端午節',
        'Mid-Autumn Festival': '中秋節',
        'The Day following Mid-Autumn Festival': '中秋節翌日',
        'Chinese New Year': '農曆新年',
        "Chinese New Year's Eve": '除夕',
        'The second day of Chinese New Year': '農曆新年第二天',
        'Founding Day of the Republic of China': '中華民國開國紀念日',
        'Peace Memorial Day': '和平紀念日',
        'Constitution Day (Taiwan)': '行憲紀念日',
        'Day off': '休假日',
        'observed': '補假',
        'substituted from': '從補假',
    },
}

def get_translated_holiday_name(holiday_name: str, locale: str) -> str:
    """
    Get the translated name for a holiday in the specified locale.
    
    Args:
        holiday_name: The English holiday name
        locale: The target locale (e.g., 'es_ES', 'ru_RU')
    
    Returns:
        The translated holiday name, or the original name if no translation exists
    """
    if not holiday_name or not locale:
        return holiday_name
    
    # Handle observed and substituted patterns
    base_holiday = holiday_name
    suffix = ""
    
    # Check for observed pattern
    if " (observed)" in holiday_name:
        base_holiday = holiday_name.replace(" (observed)", "")
        suffix = " (observed)"
    
    # Check for substituted pattern
    elif "Day off (substituted from" in holiday_name:
        # Extract date part
        match = re.search(r'Day off \(substituted from (.+?)\)', holiday_name)
        if match:
            date_part = match.group(1)
            base_holiday = "Day off"
            suffix = f" (substituted from {date_part})"
    
    # Try to get translation from locale file first
    translated_base = _get_translation_from_locale_file(base_holiday, locale)
    
    # If not found in locale file, fall back to hardcoded translations
    if translated_base == base_holiday:
        locale_translations = HOLIDAY_TRANSLATIONS.get(locale, {})
        translated_base = locale_translations.get(base_holiday, base_holiday)
    
    # Handle suffix translation
    if suffix:
        if suffix == " (observed)":
            observed_translation = _get_translation_from_locale_file("observed", locale)
            if observed_translation == "observed":
                locale_translations = HOLIDAY_TRANSLATIONS.get(locale, {})
                observed_translation = locale_translations.get("observed", "observed")
            return f"{translated_base} ({observed_translation})"
        elif "substituted from" in suffix:
            substituted_translation = _get_translation_from_locale_file("substituted from", locale)
            if substituted_translation == "substituted from":
                locale_translations = HOLIDAY_TRANSLATIONS.get(locale, {})
                substituted_translation = locale_translations.get("substituted from", "substituted from")
            # Extract the date part and keep it as-is
            date_match = re.search(r'substituted from (.+)', suffix)
            if date_match:
                date_part = date_match.group(1)
                return f"{translated_base} ({substituted_translation} {date_part})"
    
    return translated_base

def _get_translation_from_locale_file(holiday_name: str, locale: str) -> str:
    """
    Get holiday translation from the locale JSON file.
    
    Args:
        holiday_name: The English holiday name
        locale: The target locale (e.g., 'es_ES', 'ru_RU')
    
    Returns:
        The translated holiday name, or the original name if no translation exists
    """
    try:
        from pathlib import Path
        import json
        
        # Convert holiday name to key format
        # Fix: Cannot use backslash in f-string expression, so use separate variable
        clean_name = holiday_name.lower().replace(' ', '_').replace("'", '').replace('-', '_')
        key = f"holiday_{clean_name}"
        
        # Load locale file
        locale_file = Path(__file__).parent.parent / "localization" / "translations" / f"{locale}.json"
        
        if locale_file.exists():
            with open(locale_file, 'r', encoding='utf-8') as f:
                locale_data = json.load(f)
                return locale_data.get(key, holiday_name)
    
    except Exception:
        # If anything goes wrong, return original name
        pass
    
    return holiday_name

def _translate_holiday_name(holiday_name: str, locale: str) -> str:
    """
    Internal method for translating holiday names.
    This is called by the multi_country_holiday_provider.
    """
    return get_translated_holiday_name(holiday_name, locale)
