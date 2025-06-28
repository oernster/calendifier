"""
⚙️ Settings Manager for Calendar Application

This module handles application settings persistence and management.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Union
from calendar_app.data.models import AppSettings
from calendar_app.localization import LocaleDetector

logger = logging.getLogger(__name__)


class SettingsManager:
    """⚙️ Manages application settings with JSON persistence."""
    
    def __init__(self, settings_file: Union[str, Path]):
        """Initialize settings manager with file path."""
        self.settings_file = Path(settings_file)
        self.settings_file.parent.mkdir(parents=True, exist_ok=True)
        
        self._settings: AppSettings = AppSettings()
        self._load_settings()
        
        logger.debug(f"⚙️ Settings Manager initialized: {self.settings_file}")
    
    def _load_settings(self):
        """📥 Load settings from file."""
        try:
            if self.settings_file.exists():
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings_data = json.load(f)
                
                self._settings = AppSettings.from_dict(settings_data)
                logger.debug(f"📥 Loaded settings from {self.settings_file}")
            else:
                # Create default settings file
                self._save_settings()
                logger.debug(f"📝 Created default settings file: {self.settings_file}")
                
        except Exception as e:
            logger.error(f"❌ Failed to load settings: {e}")
            logger.debug("🔄 Using default settings")
            self._settings = AppSettings()
    
    def _save_settings(self):
        """💾 Save settings to file."""
        try:
            settings_data = self._settings.to_dict()
            
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings_data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"💾 Saved settings to {self.settings_file}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save settings: {e}")
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """📋 Get setting value by key."""
        try:
            return getattr(self._settings, key, default)
        except AttributeError:
            logger.warning(f"⚠️ Unknown setting key: {key}")
            return default
    
    def set_setting(self, key: str, value: Any) -> bool:
        """✏️ Set setting value by key."""
        try:
            if hasattr(self._settings, key):
                setattr(self._settings, key, value)
                self._save_settings()
                logger.debug(f"✏️ Set setting {key} = {value}")
                return True
            else:
                logger.warning(f"⚠️ Unknown setting key: {key}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to set setting {key}: {e}")
            return False
    
    def get_all_settings(self) -> Dict[str, Any]:
        """📋 Get all settings as dictionary."""
        return self._settings.to_dict()
    
    def update_settings(self, settings_dict: Dict[str, Any]) -> bool:
        """🔄 Update multiple settings at once."""
        try:
            for key, value in settings_dict.items():
                if hasattr(self._settings, key):
                    setattr(self._settings, key, value)
                else:
                    logger.warning(f"⚠️ Ignoring unknown setting: {key}")
            
            self._save_settings()
            logger.info(f"🔄 Updated {len(settings_dict)} settings")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update settings: {e}")
            return False
    
    def reset_to_defaults(self) -> bool:
        """🔄 Reset all settings to defaults."""
        try:
            self._settings = AppSettings()
            self._save_settings()
            logger.debug("🔄 Reset settings to defaults")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to reset settings: {e}")
            return False
    
    def backup_settings(self, backup_path: Union[str, Path]) -> bool:
        """💾 Backup settings to file."""
        try:
            backup_path = Path(backup_path)
            backup_data = {
                'backup_timestamp': str(Path(self.settings_file).stat().st_mtime),
                'settings': self._settings.to_dict()
            }
            
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"💾 Backed up settings to {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to backup settings: {e}")
            return False
    
    def restore_settings(self, backup_path: Union[str, Path]) -> bool:
        """📥 Restore settings from backup."""
        try:
            backup_path = Path(backup_path)
            if not backup_path.exists():
                logger.error(f"❌ Backup file not found: {backup_path}")
                return False
            
            with open(backup_path, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            if 'settings' in backup_data:
                self._settings = AppSettings.from_dict(backup_data['settings'])
                self._save_settings()
                logger.debug(f"📥 Restored settings from {backup_path}")
                return True
            else:
                logger.error("❌ Invalid backup file format")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to restore settings: {e}")
            return False
    
    # Convenience methods for common settings
    
    def get_theme(self) -> str:
        """🎨 Get current theme."""
        return self._settings.theme
    
    def set_theme(self, theme: str) -> bool:
        """🎨 Set theme (dark/light)."""
        if theme in ['dark', 'light']:
            return self.set_setting('theme', theme)
        else:
            logger.warning(f"⚠️ Invalid theme: {theme}")
            return False
    
    def get_window_geometry(self) -> Dict[str, int]:
        """🖥️ Get window geometry settings."""
        return {
            'width': self._settings.window_width,
            'height': self._settings.window_height,
            'x': self._settings.window_x,
            'y': self._settings.window_y
        }
    
    def set_window_geometry(self, width: int, height: int, x: int = -1, y: int = -1) -> bool:
        """🖥️ Set window geometry."""
        try:
            self._settings.window_width = max(800, width)
            self._settings.window_height = max(600, height)
            self._settings.window_x = x
            self._settings.window_y = y
            self._save_settings()
            return True
        except Exception as e:
            logger.error(f"❌ Failed to set window geometry: {e}")
            return False
    
    def get_ntp_settings(self) -> Dict[str, Any]:
        """🌐 Get NTP settings."""
        return {
            'interval_minutes': self._settings.ntp_interval_minutes,
            'servers': self._settings.ntp_servers.copy()
        }
    
    def set_ntp_interval(self, minutes: int) -> bool:
        """🌐 Set NTP sync interval."""
        if 1 <= minutes <= 1440:  # 1 minute to 24 hours
            return self.set_setting('ntp_interval_minutes', minutes)
        else:
            logger.warning(f"⚠️ Invalid NTP interval: {minutes}")
            return False
    
    def add_ntp_server(self, server: str) -> bool:
        """➕ Add NTP server."""
        try:
            if server not in self._settings.ntp_servers:
                self._settings.ntp_servers.append(server)
                self._save_settings()
                logger.debug(f"➕ Added NTP server: {server}")
                return True
            else:
                logger.debug(f"ℹ️ NTP server already exists: {server}")
                return True
        except Exception as e:
            logger.error(f"❌ Failed to add NTP server: {e}")
            return False
    
    def remove_ntp_server(self, server: str) -> bool:
        """➖ Remove NTP server."""
        try:
            if server in self._settings.ntp_servers:
                self._settings.ntp_servers.remove(server)
                self._save_settings()
                logger.debug(f"➖ Removed NTP server: {server}")
                return True
            else:
                logger.warning(f"⚠️ NTP server not found: {server}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to remove NTP server: {e}")
            return False
    
    def get_calendar_settings(self) -> Dict[str, Any]:
        """📅 Get calendar display settings."""
        return {
            'first_day_of_week': self._settings.first_day_of_week,
            'show_week_numbers': self._settings.show_week_numbers,
            'default_event_duration': self._settings.default_event_duration,
            'holiday_country': self._settings.holiday_country
        }
    
    def set_first_day_of_week(self, day: int) -> bool:
        """📅 Set first day of week (0=Monday, 6=Sunday)."""
        if 0 <= day <= 6:
            return self.set_setting('first_day_of_week', day)
        else:
            logger.warning(f"⚠️ Invalid first day of week: {day}")
            return False
    
    def set_show_week_numbers(self, show: bool) -> bool:
        """📅 Set whether to show week numbers."""
        return self.set_setting('show_week_numbers', show)
    
    def set_default_event_duration(self, minutes: int) -> bool:
        """📅 Set default event duration in minutes."""
        if 15 <= minutes <= 1440:  # 15 minutes to 24 hours
            return self.set_setting('default_event_duration', minutes)
        else:
            logger.warning(f"⚠️ Invalid event duration: {minutes}")
            return False
    
    def get_holiday_country(self) -> str:
        """🌍 Get holiday country code."""
        return self._settings.holiday_country
    
    def get_locale(self) -> str:
        """🌍 Get current locale."""
        return getattr(self._settings, 'locale', LocaleDetector.DEFAULT_LOCALE)
    
    def set_locale(self, locale_code: str) -> bool:
        """🌍 Set locale."""
        if locale_code in LocaleDetector.SUPPORTED_LOCALES:
            self._settings.locale = locale_code
            self._save_settings()
            return True
        else:
            logger.warning(f"⚠️ Invalid locale code: {locale_code}")
            return False
    
    def get_timezone(self) -> str:
        """🌍 Get current timezone setting."""
        return getattr(self._settings, 'timezone', 'auto')
    
    def set_timezone(self, timezone: str) -> bool:
        """🌍 Set timezone ('auto' for system timezone or specific timezone like 'Europe/London')."""
        # Basic validation - check if it's 'auto' or a valid timezone
        if timezone == 'auto':
            return self.set_setting('timezone', timezone)
        
        # Try to validate timezone
        try:
            import zoneinfo
            zoneinfo.ZoneInfo(timezone)
            return self.set_setting('timezone', timezone)
        except Exception as e:
            logger.warning(f"⚠️ Invalid timezone: {timezone} - {e}")
            return False
    
    def set_holiday_country(self, country_code: str) -> bool:
        """🌍 Set holiday country code."""
        # Validate country code
        from calendar_app.core.multi_country_holiday_provider import MultiCountryHolidayProvider
        supported_countries = MultiCountryHolidayProvider.get_supported_countries()
        
        country_code = country_code.upper()
        if country_code in supported_countries:
            return self.set_setting('holiday_country', country_code)
        else:
            logger.warning(f"⚠️ Invalid holiday country code: {country_code}")
            return False
    
    def export_settings(self, export_path: Union[str, Path]) -> bool:
        """📤 Export settings for sharing."""
        try:
            export_path = Path(export_path)
            
            # Export only user-configurable settings
            exportable_settings = {
                'theme': self._settings.theme,
                'ntp_interval_minutes': self._settings.ntp_interval_minutes,
                'ntp_servers': self._settings.ntp_servers,
                'first_day_of_week': self._settings.first_day_of_week,
                'show_week_numbers': self._settings.show_week_numbers,
                'default_event_duration': self._settings.default_event_duration,
                'holiday_country': self._settings.holiday_country
            }
            
            export_data = {
                'calendar_app_settings': True,
                'version': '1.0.0',
                'settings': exportable_settings
            }
            
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"📤 Exported settings to {export_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to export settings: {e}")
            return False
    
    def import_settings(self, import_path: Union[str, Path]) -> bool:
        """📥 Import settings from file."""
        try:
            import_path = Path(import_path)
            if not import_path.exists():
                logger.error(f"❌ Import file not found: {import_path}")
                return False
            
            with open(import_path, 'r', encoding='utf-8') as f:
                import_data = json.load(f)
            
            if not import_data.get('calendar_app_settings'):
                logger.error("❌ Invalid settings file format")
                return False
            
            settings_to_import = import_data.get('settings', {})
            imported_count = 0
            
            for key, value in settings_to_import.items():
                if self.set_setting(key, value):
                    imported_count += 1
            
            logger.debug(f"📥 Imported {imported_count} settings from {import_path}")
            return imported_count > 0
            
        except Exception as e:
            logger.error(f"❌ Failed to import settings: {e}")
            return False
    
    def validate_settings(self) -> Dict[str, str]:
        """✅ Validate current settings and return any issues."""
        issues = {}
        
        # Validate theme
        if self._settings.theme not in ['dark', 'light']:
            issues['theme'] = f"Invalid theme: {self._settings.theme}"
        
        # Validate NTP interval
        if not (1 <= self._settings.ntp_interval_minutes <= 1440):
            issues['ntp_interval'] = f"Invalid NTP interval: {self._settings.ntp_interval_minutes}"
        
        # Validate window size
        if self._settings.window_width < 800:
            issues['window_width'] = f"Window width too small: {self._settings.window_width}"
        
        if self._settings.window_height < 600:
            issues['window_height'] = f"Window height too small: {self._settings.window_height}"
        
        # Validate first day of week
        if not (0 <= self._settings.first_day_of_week <= 6):
            issues['first_day_of_week'] = f"Invalid first day of week: {self._settings.first_day_of_week}"
        
        # Validate event duration
        if not (15 <= self._settings.default_event_duration <= 1440):
            issues['event_duration'] = f"Invalid event duration: {self._settings.default_event_duration}"
        
        # Validate holiday country
        try:
            from calendar_app.core.multi_country_holiday_provider import MultiCountryHolidayProvider
            supported_countries = MultiCountryHolidayProvider.get_supported_countries()
            if self._settings.holiday_country not in supported_countries:
                issues['holiday_country'] = f"Invalid holiday country: {self._settings.holiday_country}"
        except Exception:
            # If we can't validate, just log a warning but don't fail
            logger.warning(f"⚠️ Could not validate holiday country: {self._settings.holiday_country}")
        
        if issues:
            logger.warning(f"⚠️ Settings validation found {len(issues)} issues")
        else:
            logger.debug("✅ Settings validation passed")
        
        return issues
    
    def get_settings_summary(self) -> str:
        """📊 Get human-readable settings summary."""
        # Get country display name
        try:
            from calendar_app.core.multi_country_holiday_provider import MultiCountryHolidayProvider
            countries = MultiCountryHolidayProvider.get_supported_countries()
            country_info = countries.get(self._settings.holiday_country, {'flag': '🏳️', 'name': 'Unknown'})
            country_display = f"{country_info['flag']} {country_info['name']}"
        except:
            country_display = self._settings.holiday_country
        
        return f"""📊 Settings Summary:
🎨 Theme: {self._settings.theme}
🌐 NTP Sync: Every {self._settings.ntp_interval_minutes} minutes
🖥️ Window: {self._settings.window_width}×{self._settings.window_height}
📅 First Day: {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][self._settings.first_day_of_week]}
⏰ Default Event: {self._settings.default_event_duration} minutes
📊 Week Numbers: {'Yes' if self._settings.show_week_numbers else 'No'}
🌍 Holiday Country: {country_display}
🌐 NTP Servers: {len(self._settings.ntp_servers)} configured"""