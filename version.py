"""
📅 Calendar Application Version Information

This module contains version information and emoji constants used throughout the application.
"""

__version__ = "1.4.0"
__version_info__ = (1, 4, 0)
__app_name__ = "📅 Calendifier"
__author__ = "Oliver Ernster"
__description__ = "Cross-platform calendar system with Home Assistant integration, analog clock, event handling, note taking, and holidays"
__copyright__ = "© 2025 Oliver Ernster"
__license__ = "MIT"

# 📅 Application metadata
APP_ICON = "📅"
CLOCK_ICON = "🕐"
SETTINGS_ICON = "⚙️"
THEME_DARK_ICON = "🌙"
THEME_LIGHT_ICON = "☀️"

# 🌐 NTP Configuration
DEFAULT_NTP_SERVERS = [
    "pool.ntp.org",
    "time.google.com", 
    "time.cloudflare.com",
    "time.windows.com",
    "time.apple.com"
]

# 🇬🇧 UK Holiday Configuration
HOLIDAY_COUNTRY = "UK"
HOLIDAY_ICON = "🇬🇧"

# 🎨 UI element emojis
UI_EMOJIS = {
    # 🏠 Main application
    "app_icon": "📅",
    "window_title": "📅",
    
    # 🕐 Time components  
    "clock": "🕐",
    "time_display": "🕐",
    "ntp_status": "🌐",
    "sync_success": "✅",
    "sync_failed": "❌",
    
    # 📅 Calendar components
    "calendar": "📅",
    "today": "📅",
    "weekend": "🏖️",
    "holiday": "🇬🇧",
    "navigation_prev": "◀",
    "navigation_next": "▶",
    
    # 📝 Event management
    "event": "📝",
    "add_event": "➕",
    "edit_event": "✏️",
    "delete_event": "🗑️",
    "event_work": "💼",
    "event_meeting": "👥",
    "event_meal": "🍽️",
    "event_personal": "🏠",
    
    # 🎨 Theme and settings
    "theme_dark": "🌙",
    "theme_light": "☀️",
    "settings": "⚙️",
    "about": "ℹ️",
    
    # 📤📥 Import/Export
    "export": "📤",
    "import": "📥",
    "file": "📄",
    
    # 🔧 Status indicators
    "success": "✅",
    "error": "❌",
    "warning": "⚠️",
    "info": "ℹ️",
    "loading": "⏳"
}

# Event category emoji system
EVENT_CATEGORY_EMOJIS = {
    "work": "💼",
    "meeting": "👥", 
    "personal": "🏠",
    "meal": "🍽️",
    "travel": "🚗",
    "health": "🏥",
    "education": "📚",
    "celebration": "🎉",
    "reminder": "🎯",
    "holiday": "🇬🇧",
    "default": "📝"
}

# Status and feedback emojis
STATUS_EMOJIS = {
    # 🌐 Network status
    "ntp_connected": "✅",
    "ntp_disconnected": "❌", 
    "ntp_syncing": "⏳",
    
    # 💾 Database status
    "db_connected": "✅",
    "db_error": "❌",
    "db_saving": "💾",
    
    # 📁 File operations
    "file_saved": "✅",
    "file_error": "❌",
    "file_loading": "⏳",
    
    # 🎨 Theme status
    "theme_applied": "✅",
    "theme_error": "❌"
}

def get_version_string() -> str:
    """Get formatted version string for display."""
    return f"📅 Calendar Application v{__version__}"

def get_about_text() -> str:
    """Get formatted about text for dialog."""
    return f"""
{APP_ICON} {__app_name__}
Version: {__version__}
{__description__}

🏠 Home Assistant Integration Available
🖥️ Desktop Application Mode
🌐 40 Languages & 40 Countries Supported

{__copyright__}
License: {__license__}

Built with FastAPI, Home Assistant & Python
Deploy as web dashboard or desktop application
"""