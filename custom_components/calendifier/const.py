"""Constants for the Calendifier integration."""

DOMAIN = "calendifier"

# Configuration
CONF_HOST = "host"
CONF_PORT = "port"
CONF_SSL = "ssl"

# Defaults
DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8099
DEFAULT_SSL = False
DEFAULT_SCAN_INTERVAL = 30

# Platforms
PLATFORMS = ["calendar", "sensor", "binary_sensor"]

# Services
SERVICE_CREATE_EVENT = "create_event"
SERVICE_UPDATE_EVENT = "update_event"
SERVICE_DELETE_EVENT = "delete_event"
SERVICE_SYNC_NTP = "sync_ntp"
SERVICE_IMPORT_CALENDAR = "import_calendar"
SERVICE_EXPORT_CALENDAR = "export_calendar"

# Event categories
EVENT_CATEGORIES = {
    "default": "Default",
    "work": "Work",
    "personal": "Personal",
    "holiday": "Holiday",
    "meeting": "Meeting",
    "meal": "Meal",
    "travel": "Travel",
    "health": "Health",
    "education": "Education",
    "celebration": "Celebration",
    "reminder": "Reminder",
}

# Supported locales
SUPPORTED_LOCALES = {
    "en_US": "🇺🇸 English (US)",
    "en_GB": "🇬🇧 English (UK)",
    "es_ES": "🇪🇸 Español",
    "fr_FR": "🇫🇷 Français",
    "de_DE": "🇩🇪 Deutsch",
    "it_IT": "🇮🇹 Italiano",
    "pt_BR": "🇧🇷 Português",
    "ru_RU": "🇷🇺 Русский",
    "zh_CN": "🇨🇳 简体中文",
    "zh_TW": "🇹🇼 繁體中文",
    "ja_JP": "🇯🇵 日本語",
    "ko_KR": "🇰🇷 한국어",
    "hi_IN": "🇮🇳 हिन्दी",
    "ar_SA": "🇸🇦 العربية",
}

# Supported countries for holidays
SUPPORTED_COUNTRIES = {
    "US": "🇺🇸 United States",
    "GB": "🇬🇧 United Kingdom",
    "ES": "🇪🇸 Spain",
    "FR": "🇫🇷 France",
    "DE": "🇩🇪 Germany",
    "IT": "🇮🇹 Italy",
    "BR": "🇧🇷 Brazil",
    "RU": "🇷🇺 Russia",
    "CN": "🇨🇳 China",
    "TW": "🇹🇼 Taiwan",
    "JP": "🇯🇵 Japan",
    "KR": "🇰🇷 South Korea",
    "IN": "🇮🇳 India",
    "SA": "🇸🇦 Saudi Arabia",
}