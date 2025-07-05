#!/usr/bin/env python3
"""
Calendifier API Server with NTP Support
Provides REST API for calendar events, notes, holidays, and system management
"""

import asyncio
import json
import sqlite3
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import ntplib
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import holidays library directly
try:
    import holidays
    HOLIDAYS_LIBRARY_AVAILABLE = True
    print("✅ Successfully imported holidays library")
except ImportError as e:
    HOLIDAYS_LIBRARY_AVAILABLE = False
    print(f"⚠️ Holidays library not available: {e}")

# Import the sophisticated holiday system from the main app
try:
    from calendar_app.core.multi_country_holiday_provider import MultiCountryHolidayProvider
    HOLIDAY_PROVIDER_AVAILABLE = True
    print("✅ Successfully imported MultiCountryHolidayProvider")
except ImportError as e:
    HOLIDAY_PROVIDER_AVAILABLE = False
    print(f"⚠️ Multi-country holiday provider not available: {e}")
    print("⚠️ Using direct holidays library")
except Exception as e:
    HOLIDAY_PROVIDER_AVAILABLE = False
    print(f"⚠️ Error importing holiday provider: {e}")
    print("⚠️ Using direct holidays library")

# Import version information
try:
    from version import __version__, get_version_string, DEFAULT_NTP_SERVERS, get_about_text
except ImportError:
    __version__ = "1.1.0"
    DEFAULT_NTP_SERVERS = [
        "pool.ntp.org",
        "time.google.com",
        "time.cloudflare.com",
        "time.windows.com",
        "time.apple.com"
    ]
    def get_version_string():
        return f"📅 Calendifier API v{__version__}"
    def get_about_text():
        return f"📅 Calendifier API v{__version__}\nCross-platform calendar integration"


class Event(BaseModel):
    id: Optional[int] = None
    title: str
    start_date: str
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    category: str = "default"
    is_all_day: bool = False


class Note(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    category: str = "general"
    date: str
    tags: Optional[str] = None


class Settings(BaseModel):
    locale: str = "en_GB"
    timezone: str = "Europe/London"
    theme: str = "dark"
    holiday_country: str = "GB"
    first_day_of_week: int = 1
    show_week_numbers: bool = False
    date_format: str = "YYYY-MM-DD"
    time_format: str = "24h"
    notifications_enabled: bool = True
    auto_sync: bool = True
    sync_interval: int = 30
    accent_color: str = "#0078d4"
    compact_mode: bool = False
    show_emojis: bool = True
    debug_mode: bool = False


class CalendifierAPI:
    def __init__(self, db_path: str = "calendifier.db"):
        self.db_path = db_path
        self.app = FastAPI(title="Calendifier API", version=__version__)
        self.setup_cors()
        self.setup_database()
        self.setup_routes()
        self.ntp_client = ntplib.NTPClient()
        self.last_ntp_sync = None
        self.ntp_synced = False
        self._last_successful_server = None
        self._last_ntp_result = None
        
        # Initialize the holiday system - REQUIRE sophisticated provider
        if not HOLIDAY_PROVIDER_AVAILABLE:
            raise Exception("CRITICAL: MultiCountryHolidayProvider is required but not available")
        
        self.holiday_provider = MultiCountryHolidayProvider()
        self.use_sophisticated_provider = True
        print("✅ Multi-country holiday provider initialized - NO FALLBACKS")
        
        # Detect and store current locale for holiday translations
        try:
            from calendar_app.localization.locale_detector import LocaleDetector
            detector = LocaleDetector()
            detected_locale = detector.detect_system_locale()
            self._current_locale = detected_locale
            print(f"🌍 API Server detected system locale: {detected_locale}")
        except Exception as e:
            print(f"⚠️ Could not detect system locale: {e}, using en_GB fallback")
            self._current_locale = "en_GB"

    def setup_cors(self):
        """Setup CORS middleware for Home Assistant integration"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["*"],
            expose_headers=["*"],
        )

    def setup_database(self):
        """Initialize SQLite database with tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                start_date TEXT NOT NULL,
                start_time TEXT,
                end_date TEXT,
                end_time TEXT,
                description TEXT,
                category TEXT DEFAULT 'default',
                is_all_day BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Notes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                date TEXT NOT NULL,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert default settings
        default_settings = Settings()
        for key, value in default_settings.model_dump().items():
            cursor.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, json.dumps(value))
            )
        
        # Database tables created - no sample data inserted
        # Users can add their own events and notes through the interface
        
        conn.commit()
        conn.close()

    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/")
        async def root():
            return {"message": "Calendifier API Server", "version": __version__, "status": "running"}
        
        @self.app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "ntp_synced": self.ntp_synced,
                "last_ntp_sync": self.last_ntp_sync
            }
        
        # Events endpoints
        @self.app.get("/api/v1/events")
        async def get_events():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM events ORDER BY start_date, start_time")
            events = []
            for row in cursor.fetchall():
                event = {
                    "id": row[0],
                    "title": row[1],
                    "start_date": row[2],
                    "start_time": row[3],
                    "end_date": row[4],
                    "end_time": row[5],
                    "description": row[6],
                    "category": row[7],
                    "is_all_day": bool(row[8])
                }
                # Calculate days until
                event_date = datetime.strptime(row[2], "%Y-%m-%d").date()
                today = datetime.now().date()
                event["days_until"] = (event_date - today).days
                events.append(event)
            conn.close()
            return {"events": events}
        
        @self.app.post("/api/v1/events")
        async def create_event(event: Event):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO events (title, start_date, start_time, end_date, end_time, description, category, is_all_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (event.title, event.start_date, event.start_time, event.end_date, event.end_time, event.description, event.category, event.is_all_day)
            )
            event_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return {"id": event_id, "message": "Event created successfully"}
        
        @self.app.put("/api/v1/events/{event_id}")
        async def update_event(event_id: int, event: Event):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE events SET title = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, description = ?, category = ?, is_all_day = ? WHERE id = ?",
                (event.title, event.start_date, event.start_time, event.end_date, event.end_time, event.description, event.category, event.is_all_day, event_id)
            )
            if cursor.rowcount == 0:
                conn.close()
                raise HTTPException(status_code=404, detail="Event not found")
            conn.commit()
            conn.close()
            return {"message": "Event updated successfully"}
        
        @self.app.delete("/api/v1/events/{event_id}")
        async def delete_event(event_id: int):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
            if cursor.rowcount == 0:
                conn.close()
                raise HTTPException(status_code=404, detail="Event not found")
            conn.commit()
            conn.close()
            return {"message": "Event deleted successfully"}
        
        # Notes endpoints
        @self.app.get("/api/v1/notes")
        async def get_notes():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notes ORDER BY created_at DESC")
            notes = []
            for row in cursor.fetchall():
                notes.append({
                    "id": row[0],
                    "title": row[1],
                    "content": row[2],
                    "category": row[3],
                    "date": row[4],
                    "tags": row[5],
                    "created_at": row[6]
                })
            conn.close()
            return {"notes": notes}
        
        @self.app.post("/api/v1/notes")
        async def create_note(note: Note):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO notes (title, content, category, date, tags) VALUES (?, ?, ?, ?, ?)",
                (note.title, note.content, note.category, note.date, note.tags)
            )
            note_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return {"id": note_id, "message": "Note created successfully"}
        
        @self.app.delete("/api/v1/notes/{note_id}")
        async def delete_note(note_id: int):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            if cursor.rowcount == 0:
                conn.close()
                raise HTTPException(status_code=404, detail="Note not found")
            conn.commit()
            conn.close()
            return {"message": "Note deleted successfully"}
        
        # Settings endpoints
        @self.app.get("/api/v1/settings")
        async def get_settings():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings")
            settings = {}
            for key, value in cursor.fetchall():
                settings[key] = json.loads(value)
            conn.close()
            return settings
        
        @self.app.put("/api/v1/settings")
        async def update_settings(settings: dict):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if locale is being updated
            locale_changed = False
            if 'locale' in settings:
                # Get current locale
                cursor.execute("SELECT value FROM settings WHERE key = 'locale'")
                current_result = cursor.fetchone()
                current_locale = json.loads(current_result[0]) if current_result else "en_GB"
                new_locale = settings['locale']
                
                if current_locale != new_locale:
                    locale_changed = True
                    self._current_locale = new_locale
                    print(f"🌍 Locale changed from {current_locale} to {new_locale}")
            
            # Update all settings
            for key, value in settings.items():
                cursor.execute(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
                    (key, json.dumps(value), datetime.now().isoformat())
                )
            conn.commit()
            conn.close()
            
            # Clear holiday cache if locale changed to force re-translation
            if locale_changed and self.holiday_provider:
                self.holiday_provider.clear_cache()
                print("🔄 Holiday cache cleared due to locale change")
            
            return {"message": "Settings updated successfully"}
        
        # Holidays endpoints
        @self.app.get("/api/v1/holidays/{country}/{year}/{month}")
        async def get_holidays(country: str, year: int, month: int):
            return await self.get_holidays_for_period(country, year, month)
        
        @self.app.get("/api/v1/holidays/auto/{year}")
        async def get_holidays_auto_year(year: int):
            """Get all holidays for the current year using backend-determined country - NO FALLBACKS"""
            # Get current locale from settings
            current_locale = await self._get_current_locale_from_settings()
            print(f"🌍 Current locale from settings: {current_locale}")
            
            # STRICT locale-to-country mapping - NO DEFAULTS
            locale_to_country = {
                'en_US': 'US', 'en_GB': 'GB', 'es_ES': 'ES', 'fr_FR': 'FR',
                'de_DE': 'DE', 'it_IT': 'IT', 'pt_BR': 'BR', 'ru_RU': 'RU',
                'zh_CN': 'CN', 'zh_TW': 'TW', 'ja_JP': 'JP', 'ko_KR': 'KR',
                'hi_IN': 'IN', 'ar_SA': 'SA'
            }
            
            # REQUIRE exact locale match - NO FALLBACKS
            if current_locale not in locale_to_country:
                raise HTTPException(status_code=400, detail=f"Unsupported locale: {current_locale}. Supported locales: {list(locale_to_country.keys())}")
            
            country = locale_to_country[current_locale]
            print(f"🌍 STRICT mapping: locale {current_locale} -> country {country}")
            
            # Force clear ALL holiday caches before getting holidays
            if self.holiday_provider:
                self.holiday_provider.clear_cache()
                print(f"🔄 Cleared holiday cache before fetching {country} holidays")
            
            # Get all holidays for the year using the correct method
            all_holidays = []
            for month in range(1, 13):
                month_holidays = await self.get_holidays_for_period(country, year, month, add_days_until=False)
                all_holidays.extend(month_holidays["holidays"])
            
            # Sort by date
            all_holidays.sort(key=lambda x: x["date"])
            
            # Add days until for each holiday
            today = datetime.now().date()
            for holiday in all_holidays:
                holiday_date = datetime.strptime(holiday["date"], "%Y-%m-%d").date()
                holiday["days_until"] = (holiday_date - today).days
            
            print(f"✅ Returning {len(all_holidays)} holidays for {country} ({current_locale})")
            return {
                "holidays": all_holidays,
                "country": country.upper(),
                "year": year,
                "locale": current_locale,
                "total_count": len(all_holidays)
            }

        @self.app.get("/api/v1/holidays/auto/{year}/{month}")
        async def get_holidays_auto_month(year: int, month: int):
            """Get holidays for a specific month using backend-determined country"""
            # Get current locale from settings
            current_locale = await self._get_current_locale_from_settings()
            
            # Map locale to country
            locale_to_country = {
                'en_US': 'US', 'en_GB': 'GB', 'es_ES': 'ES', 'fr_FR': 'FR',
                'de_DE': 'DE', 'it_IT': 'IT', 'pt_BR': 'BR', 'ru_RU': 'RU',
                'zh_CN': 'CN', 'zh_TW': 'TW', 'ja_JP': 'JP', 'ko_KR': 'KR',
                'hi_IN': 'IN', 'ar_SA': 'SA'
            }
            
            country = locale_to_country.get(current_locale, 'GB')
            print(f"🌍 Auto-determined country {country} from locale {current_locale}")
            
            # Use the existing holiday logic
            return await self.get_holidays_for_period(country, year, month)

        @self.app.get("/api/v1/holidays/{country}/{year}")
        async def get_holidays_year(country: str, year: int):
            """Get all holidays for a specific country and year - OVERRIDE WITH CURRENT LOCALE"""
            # FORCE: Ignore the country parameter and use current locale instead
            current_locale = await self._get_current_locale_from_settings()
            
            # Map locale to correct country
            locale_to_country = {
                'en_US': 'US', 'en_GB': 'GB', 'es_ES': 'ES', 'fr_FR': 'FR',
                'de_DE': 'DE', 'it_IT': 'IT', 'pt_BR': 'BR', 'ru_RU': 'RU',
                'zh_CN': 'CN', 'zh_TW': 'TW', 'ja_JP': 'JP', 'ko_KR': 'KR',
                'hi_IN': 'IN', 'ar_SA': 'SA'
            }
            
            actual_country = locale_to_country.get(current_locale, country)
            print(f"🔄 OVERRIDE: Requested {country} but using {actual_country} based on locale {current_locale}")
            
            all_holidays = []
            for month in range(1, 13):
                month_holidays = await self.get_holidays_for_period(actual_country, year, month, add_days_until=False)
                all_holidays.extend(month_holidays["holidays"])
            
            # Sort by date
            all_holidays.sort(key=lambda x: x["date"])
            
            # Add days until for each holiday
            today = datetime.now().date()
            for holiday in all_holidays:
                holiday_date = datetime.strptime(holiday["date"], "%Y-%m-%d").date()
                holiday["days_until"] = (holiday_date - today).days
            
            return {
                "holidays": all_holidays,
                "country": actual_country.upper(),
                "year": year,
                "locale": current_locale,
                "total_count": len(all_holidays)
            }
        
        @self.app.get("/api/v1/holidays/countries")
        async def get_supported_countries():
            """Get list of supported countries for holidays"""
            return {
                "countries": [
                    {"code": "US", "name": "United States", "flag": "🇺🇸"},
                    {"code": "GB", "name": "United Kingdom", "flag": "🇬🇧"},
                    {"code": "DE", "name": "Germany", "flag": "🇩🇪"},
                    {"code": "ES", "name": "Spain", "flag": "🇪🇸"},
                    {"code": "FR", "name": "France", "flag": "🇫🇷"},
                    {"code": "IT", "name": "Italy", "flag": "🇮🇹"},
                    {"code": "JP", "name": "Japan", "flag": "🇯🇵"},
                    {"code": "KR", "name": "South Korea", "flag": "🇰🇷"},
                    {"code": "CN", "name": "China", "flag": "🇨🇳"},
                    {"code": "TW", "name": "Taiwan", "flag": "🇹🇼"},
                    {"code": "BR", "name": "Brazil", "flag": "🇧🇷"},
                    {"code": "RU", "name": "Russia", "flag": "🇷🇺"},
                    {"code": "IN", "name": "India", "flag": "🇮🇳"},
                    {"code": "SA", "name": "Saudi Arabia", "flag": "🇸🇦"}
                ]
            }
        
        # Translations endpoints
        @self.app.get("/api/v1/translations")
        async def get_available_translations():
            """Get list of available translation locales"""
            return {
                "locales": [
                    {"code": "en_US", "name": "English (US)", "flag": "🇺🇸"},
                    {"code": "en_GB", "name": "English (UK)", "flag": "🇬🇧"},
                    {"code": "de_DE", "name": "Deutsch", "flag": "🇩🇪"},
                    {"code": "es_ES", "name": "Español", "flag": "🇪🇸"},
                    {"code": "fr_FR", "name": "Français", "flag": "🇫🇷"},
                    {"code": "it_IT", "name": "Italiano", "flag": "🇮🇹"},
                    {"code": "ja_JP", "name": "日本語", "flag": "🇯🇵"},
                    {"code": "ko_KR", "name": "한국어", "flag": "🇰🇷"},
                    {"code": "zh_CN", "name": "中文 (简体)", "flag": "🇨🇳"},
                    {"code": "zh_TW", "name": "中文 (繁體)", "flag": "🇹🇼"},
                    {"code": "pt_BR", "name": "Português (Brasil)", "flag": "🇧🇷"},
                    {"code": "ru_RU", "name": "Русский", "flag": "🇷🇺"},
                    {"code": "hi_IN", "name": "हिन्दी", "flag": "🇮🇳"},
                    {"code": "ar_SA", "name": "العربية", "flag": "🇸🇦"}
                ]
            }
        
        @self.app.get("/api/v1/translations/{locale}")
        async def get_translations_enhanced(locale: str):
            """Enhanced translation endpoint with key normalization"""
            try:
                # Try to load from calendar_app translations if available
                translation_file = Path(f"calendar_app/localization/translations/{locale}.json")
                if translation_file.exists():
                    with open(translation_file, 'r', encoding='utf-8') as f:
                        raw_translations = json.load(f)
                    
                    # Normalize translations to support both formats
                    normalized = self.normalize_translation_keys(raw_translations)
                    
                    return {
                        "locale": locale,
                        "translations": normalized,
                        "format": "normalized",
                        "key_count": len(normalized),
                        "supports_dot_notation": True,
                        "supports_flattened": True,
                        "original_key_count": len(raw_translations)
                    }
                else:
                    # Fallback to basic translations
                    basic_translations = {
                        "app_name": "📅 Calendifier",
                        "clock": "🕐 Clock",
                        "events": "📋 Events",
                        "calendar": "📅 Calendar",
                        "notes": "📝 Notes",
                        "holidays": "🎉 Holidays",
                        "settings": "⚙️ Settings",
                        "today": "Today",
                        "tomorrow": "Tomorrow",
                        "yesterday": "Yesterday",
                        "add_event": "Add Event",
                        "add_note": "Add Note",
                        "delete": "Delete",
                        "edit": "Edit",
                        "save": "Save",
                        "cancel": "Cancel",
                        "loading": "Loading...",
                        "error": "Error",
                        "success": "Success",
                        "ntp_synced": "NTP Synced",
                        "ntp_not_synced": "NTP Not Synced",
                        "sync_time": "Sync Time",
                        "timezone": "Timezone",
                        "time_format": "Time Format",
                        "12_hour": "12 Hour",
                        "24_hour": "24 Hour",
                        "world_clocks": "World Clocks",
                        "upcoming_events": "Upcoming Events",
                        "no_events": "No events",
                        "no_notes": "No notes",
                        "no_holidays": "No holidays",
                        "days_until": "days until",
                        "all_day": "All day",
                        "category": "Category",
                        "description": "Description",
                        "title": "Title",
                        "content": "Content",
                        "date": "Date",
                        "time": "Time",
                        # Add dot notation versions
                        "settings.about": "About",
                        "toolbar.today": "Today",
                        "calendar.months.january": "January"
                    }
                    normalized = self.normalize_translation_keys(basic_translations)
                    return {
                        "locale": locale,
                        "translations": normalized,
                        "format": "normalized_fallback"
                    }
            except Exception as e:
                print(f"Translation error for {locale}: {e}")
                return {"locale": locale, "translations": {}, "error": str(e)}
        
        # Import/Export endpoints
        @self.app.get("/api/v1/export/events")
        async def export_events():
            """Export all events as JSON"""
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM events ORDER BY start_date, start_time")
            events = []
            for row in cursor.fetchall():
                events.append({
                    "id": row[0],
                    "title": row[1],
                    "start_date": row[2],
                    "start_time": row[3],
                    "end_date": row[4],
                    "end_time": row[5],
                    "description": row[6],
                    "category": row[7],
                    "is_all_day": bool(row[8]),
                    "created_at": row[9]
                })
            conn.close()
            return {
                "events": events,
                "exported_at": datetime.now().isoformat(),
                "total_count": len(events)
            }
        
        @self.app.get("/api/v1/export/notes")
        async def export_notes():
            """Export all notes as JSON"""
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notes ORDER BY created_at DESC")
            notes = []
            for row in cursor.fetchall():
                notes.append({
                    "id": row[0],
                    "title": row[1],
                    "content": row[2],
                    "category": row[3],
                    "date": row[4],
                    "tags": row[5],
                    "created_at": row[6]
                })
            conn.close()
            return {
                "notes": notes,
                "exported_at": datetime.now().isoformat(),
                "total_count": len(notes)
            }
        
        @self.app.get("/api/v1/export/all")
        async def export_all():
            """Export all data (events, notes, settings) as JSON"""
            # Get events
            events_response = await export_events()
            # Get notes
            notes_response = await export_notes()
            # Get settings
            settings_response = await get_settings()
            
            return {
                "calendifier_export": {
                    "version": __version__,
                    "exported_at": datetime.now().isoformat(),
                    "events": events_response["events"],
                    "notes": notes_response["notes"],
                    "settings": settings_response,
                    "metadata": {
                        "total_events": len(events_response["events"]),
                        "total_notes": len(notes_response["notes"]),
                        "export_format": "calendifier_json_v1"
                    }
                }
            }
        
        @self.app.post("/api/v1/import/events")
        async def import_events(import_data: dict):
            """Import events from JSON data"""
            try:
                events = import_data.get("events", [])
                if not events:
                    raise HTTPException(status_code=400, detail="No events data provided")
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                imported_count = 0
                skipped_count = 0
                
                for event in events:
                    try:
                        # Skip if event already exists (by title and date)
                        cursor.execute(
                            "SELECT id FROM events WHERE title = ? AND start_date = ?",
                            (event.get("title"), event.get("start_date"))
                        )
                        if cursor.fetchone():
                            skipped_count += 1
                            continue
                        
                        # Insert new event
                        cursor.execute(
                            "INSERT INTO events (title, start_date, start_time, end_date, end_time, description, category, is_all_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                            (
                                event.get("title"),
                                event.get("start_date"),
                                event.get("start_time"),
                                event.get("end_date"),
                                event.get("end_time"),
                                event.get("description"),
                                event.get("category", "default"),
                                event.get("is_all_day", False)
                            )
                        )
                        imported_count += 1
                    except Exception as e:
                        print(f"Error importing event: {e}")
                        continue
                
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "imported_count": imported_count,
                    "skipped_count": skipped_count,
                    "total_processed": len(events)
                }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
        
        @self.app.post("/api/v1/import/notes")
        async def import_notes(import_data: dict):
            """Import notes from JSON data"""
            try:
                notes = import_data.get("notes", [])
                if not notes:
                    raise HTTPException(status_code=400, detail="No notes data provided")
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                imported_count = 0
                skipped_count = 0
                
                for note in notes:
                    try:
                        # Skip if note already exists (by title and content hash)
                        content_hash = str(hash(note.get("content", "")))
                        cursor.execute(
                            "SELECT id FROM notes WHERE title = ? AND content = ?",
                            (note.get("title"), note.get("content"))
                        )
                        if cursor.fetchone():
                            skipped_count += 1
                            continue
                        
                        # Insert new note
                        cursor.execute(
                            "INSERT INTO notes (title, content, category, date, tags) VALUES (?, ?, ?, ?, ?)",
                            (
                                note.get("title"),
                                note.get("content"),
                                note.get("category", "general"),
                                note.get("date", datetime.now().strftime("%Y-%m-%d")),
                                note.get("tags")
                            )
                        )
                        imported_count += 1
                    except Exception as e:
                        print(f"Error importing note: {e}")
                        continue
                
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "imported_count": imported_count,
                    "skipped_count": skipped_count,
                    "total_processed": len(notes)
                }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
        
        @self.app.post("/api/v1/import/all")
        async def import_all(import_data: dict):
            """Import complete Calendifier data"""
            try:
                calendifier_data = import_data.get("calendifier_export", import_data)
                
                results = {
                    "events": {"imported_count": 0, "skipped_count": 0},
                    "notes": {"imported_count": 0, "skipped_count": 0},
                    "settings": {"updated": False}
                }
                
                # Import events
                if "events" in calendifier_data:
                    events_result = await import_events({"events": calendifier_data["events"]})
                    results["events"] = events_result
                
                # Import notes
                if "notes" in calendifier_data:
                    notes_result = await import_notes({"notes": calendifier_data["notes"]})
                    results["notes"] = notes_result
                
                # Import settings (optional)
                if "settings" in calendifier_data:
                    try:
                        settings_data = calendifier_data["settings"]
                        # Remove read-only fields
                        settings_data.pop("updated_at", None)
                        await update_settings(settings_data)
                        results["settings"]["updated"] = True
                    except Exception as e:
                        print(f"Error importing settings: {e}")
                
                return {
                    "success": True,
                    "import_results": results,
                    "imported_at": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
        
        @self.app.delete("/api/v1/clear/events")
        async def clear_events():
            """Clear all events"""
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM events")
                count = cursor.fetchone()[0]
                cursor.execute("DELETE FROM events")
                conn.commit()
                conn.close()
                return {
                    "success": True,
                    "deleted_count": count,
                    "message": f"Deleted {count} events"
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")
        
        @self.app.delete("/api/v1/clear/notes")
        async def clear_notes():
            """Clear all notes"""
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM notes")
                count = cursor.fetchone()[0]
                cursor.execute("DELETE FROM notes")
                conn.commit()
                conn.close()
                return {
                    "success": True,
                    "deleted_count": count,
                    "message": f"Deleted {count} notes"
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")
        
        @self.app.delete("/api/v1/clear/all")
        async def clear_all():
            """Clear all data (events and notes)"""
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Count before deletion
                cursor.execute("SELECT COUNT(*) FROM events")
                events_count = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM notes")
                notes_count = cursor.fetchone()[0]
                
                # Delete all data
                cursor.execute("DELETE FROM events")
                cursor.execute("DELETE FROM notes")
                
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "deleted_events": events_count,
                    "deleted_notes": notes_count,
                    "total_deleted": events_count + notes_count,
                    "message": f"Deleted {events_count} events and {notes_count} notes"
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")
        
        # NTP endpoints
        async def _try_ntp_server(server: str, timeout: float = 5.0) -> dict:
            """Try synchronizing with a specific NTP server (async version of Python implementation)"""
            import asyncio
            from datetime import timezone
            
            try:
                print(f"🌐 Trying NTP server: {server}")
                
                # Run NTP request in thread pool to avoid blocking (like Python implementation)
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.ntp_client.request(server, version=3, timeout=int(timeout))
                )
                
                # Calculate time information using the same method as Python implementation
                ntp_time = datetime.fromtimestamp(response.tx_time, timezone.utc)
                local_time = datetime.now(timezone.utc)
                offset = response.offset  # Use the offset directly from NTP response
                delay = response.delay    # Use the delay directly from NTP response
                
                print(f"✅ NTP sync successful: {server} (offset: {offset:.3f}s, delay: {delay:.3f}s)")
                
                return {
                    "success": True,
                    "server": server,
                    "offset": offset,
                    "delay": delay,
                    "timestamp": ntp_time,
                    "ntp_time": ntp_time.isoformat(),
                    "local_time": local_time.isoformat(),
                    "error": None
                }
                
            except ntplib.NTPException as e:
                error_msg = f"NTP error: {str(e)}"
                print(f"❌ NTP error for {server}: {e}")
                return {
                    "success": False,
                    "server": server,
                    "offset": 0.0,
                    "delay": 0.0,
                    "timestamp": datetime.now(timezone.utc),
                    "error": error_msg
                }
            except OSError as e:
                error_msg = f"Network error: {str(e)}"
                print(f"❌ Network error for {server}: {e}")
                return {
                    "success": False,
                    "server": server,
                    "offset": 0.0,
                    "delay": 0.0,
                    "timestamp": datetime.now(timezone.utc),
                    "error": error_msg
                }
            except Exception as e:
                error_msg = f"Unexpected error: {str(e)}"
                print(f"❌ Unexpected error for {server}: {e}")
                return {
                    "success": False,
                    "server": server,
                    "offset": 0.0,
                    "delay": 0.0,
                    "timestamp": datetime.now(timezone.utc),
                    "error": error_msg
                }

        @self.app.post("/api/v1/ntp/sync")
        async def sync_ntp():
            """NTP synchronization endpoint - exact implementation of Python NTPClient.sync_time_async()"""
            print("🌐 Starting NTP synchronization...")
            
            # Try last successful server first (like Python implementation)
            if self._last_successful_server:
                result = await _try_ntp_server(self._last_successful_server)
                if result["success"]:
                    self._last_ntp_result = result
                    self.last_ntp_sync = datetime.now().isoformat()
                    self.ntp_synced = True
                    return {
                        "success": True,
                        "ntp_time": result["ntp_time"],
                        "local_time": result["local_time"],
                        "offset_seconds": result["offset"],
                        "delay_seconds": result["delay"],
                        "synced_at": self.last_ntp_sync,
                        "server_used": result["server"]
                    }
            
            # Try all servers in order (like Python implementation)
            errors = []
            for server in DEFAULT_NTP_SERVERS:
                if server == self._last_successful_server:
                    continue  # Already tried
                
                result = await _try_ntp_server(server)
                if result["success"]:
                    self._last_successful_server = server
                    self._last_ntp_result = result
                    self.last_ntp_sync = datetime.now().isoformat()
                    self.ntp_synced = True
                    return {
                        "success": True,
                        "ntp_time": result["ntp_time"],
                        "local_time": result["local_time"],
                        "offset_seconds": result["offset"],
                        "delay_seconds": result["delay"],
                        "synced_at": self.last_ntp_sync,
                        "server_used": result["server"]
                    }
                else:
                    errors.append(f"{server}: {result['error']}")
            
            # All servers failed (like Python implementation)
            self.ntp_synced = False
            self._last_ntp_result = None
            error_msg = f"All NTP servers failed (tried {len(DEFAULT_NTP_SERVERS)} servers)"
            print(f"⚠️ {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "message": "Could not synchronize with any NTP server. Check network connectivity and firewall settings (NTP uses UDP port 123).",
                "servers_tried": DEFAULT_NTP_SERVERS,
                "detailed_errors": errors
            }
        
        @self.app.get("/api/v1/ntp/status")
        async def get_ntp_status():
            """Get detailed NTP synchronization status (like Python implementation)"""
            if self._last_ntp_result:
                return {
                    "synced": self._last_ntp_result["success"],
                    "server": self._last_ntp_result["server"],
                    "offset": self._last_ntp_result["offset"],
                    "delay": self._last_ntp_result["delay"],
                    "last_sync": self.last_ntp_sync,
                    "error": self._last_ntp_result["error"],
                    "available_servers": DEFAULT_NTP_SERVERS,
                    "last_successful_server": self._last_successful_server
                }
            else:
                return {
                    "synced": False,
                    "server": None,
                    "offset": 0.0,
                    "delay": 0.0,
                    "last_sync": None,
                    "error": "No sync attempted yet",
                    "available_servers": DEFAULT_NTP_SERVERS,
                    "last_successful_server": self._last_successful_server
                }
        
        # About endpoint
        @self.app.get("/api/v1/about")
        async def get_about():
            """Get application information"""
            return {
                "app_name": "📅 Calendifier",
                "version": __version__,
                "description": "Cross-platform desktop calendar with analog clock, event handling, note taking, and holidays",
                "author": "Oliver Ernster",
                "copyright": "© 2025 Oliver Ernster",
                "license": "GPL3",
                "about_text": get_about_text(),
                "features": [
                    "🕐 Analog and digital clocks with NTP synchronization",
                    "📋 Event management with categories",
                    "📅 Full calendar view with navigation",
                    "📝 Notes with categories and organization",
                    "🎉 Holiday support for 14 countries",
                    "🌍 Translation support for 14 languages",
                    "📤📥 Import/export functionality",
                    "⚙️ Configurable settings and themes"
                ],
                "supported_locales": 14,
                "supported_countries": 14,
                "api_endpoints": {
                    "events": "/api/v1/events",
                    "notes": "/api/v1/notes",
                    "holidays": "/api/v1/holidays",
                    "translations": "/api/v1/translations",
                    "settings": "/api/v1/settings",
                    "ntp": "/api/v1/ntp",
                    "import_export": "/api/v1/export, /api/v1/import"
                }
            }

    def normalize_translation_keys(self, translations):
        """Create both dot notation and flattened versions of all keys"""
        normalized = {}
        
        for key, value in translations.items():
            if key.startswith('_'):  # Skip metadata
                continue
                
            # Skip if value is not a string (avoid nested objects)
            if not isinstance(value, str):
                continue
                
            # Add original key
            normalized[key] = value
            
            # Add dot notation version if key is flattened
            if '_' in key and '.' not in key:
                dot_key = key.replace('_', '.')
                normalized[dot_key] = value
            
            # Add flattened version if key uses dot notation
            if '.' in key and '_' not in key:
                flat_key = key.replace('.', '_')
                normalized[flat_key] = value
        
        return normalized

    async def _get_current_locale_from_settings(self) -> str:
        """Get the current locale from database settings - NO FALLBACKS"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = 'locale'")
            result = cursor.fetchone()
            conn.close()
            
            if result:
                locale = json.loads(result[0])
                print(f"🌍 API Server using locale from settings: {locale}")
                return locale
            else:
                raise Exception("No locale found in settings - this should never happen")
        except Exception as e:
            print(f"🌍 API Server CRITICAL ERROR getting locale from settings: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get locale from settings: {e}")

    async def get_holidays_for_period(self, country: str, year: int, month: int = None, add_days_until: bool = True):
        """Get holidays using ONLY the sophisticated holiday provider - NO FALLBACKS ALLOWED"""
        
        print(f"🔍 get_holidays_for_period called: country={country}, year={year}, month={month}")
        print(f"🔍 HOLIDAY_PROVIDER_AVAILABLE: {HOLIDAY_PROVIDER_AVAILABLE}")
        print(f"🔍 self.holiday_provider: {self.holiday_provider}")
        
        # REQUIRE sophisticated holiday provider - NO FALLBACKS
        if not self.holiday_provider:
            raise HTTPException(status_code=500, detail="Sophisticated holiday provider is required but not available")
        
        print(f"🔍 Using ONLY sophisticated holiday provider for {country} {year}")
        
        # Get current locale from settings for translation
        current_locale = await self._get_current_locale_from_settings()
        print(f"🔍 Current locale: {current_locale}")
        
        # Import the translation function
        from calendar_app.core.holiday_translations import get_translated_holiday_name
        print(f"🔍 Translation function imported successfully")
        
        # Use the sophisticated multi-country holiday provider
        print(f"🔍 Setting holiday provider country to: {country}")
        self.holiday_provider.set_country(country)
        
        # Force clear cache to ensure fresh data for the new country
        self.holiday_provider.clear_cache()
        print(f"🔍 Holiday provider country set and cache cleared for: {country}")
        
        if month:
            # Get holidays for specific month
            holidays_list = self.holiday_provider.get_holidays_for_month(year, month)
            print(f"🔍 Got {len(holidays_list)} holidays for {year}-{month}")
        else:
            # Get all holidays for the year
            holidays_list = []
            for m in range(1, 13):
                month_holidays = self.holiday_provider.get_holidays_for_month(year, m)
                holidays_list.extend(month_holidays)
            print(f"🔍 Got {len(holidays_list)} holidays for entire year {year}")
        
        # Convert Holiday objects to API format with manual translations
        holidays = []
        for holiday in holidays_list:
            # Get the English name first, then translate it
            english_name = holiday.name
            
            # Apply translation using the locale from settings
            translated_name = get_translated_holiday_name(english_name, current_locale)
            
            holiday_dict = {
                "name": translated_name,  # Now properly translated
                "date": holiday.date.isoformat(),
                "type": holiday.type,
                "country": holiday.country_code
            }
            
            # Add days until if requested
            if add_days_until:
                today = datetime.now().date()
                holiday_dict["days_until"] = (holiday.date - today).days
            
            holidays.append(holiday_dict)
            
            # Debug first few holidays
            if len(holidays) <= 3:
                print(f"🔍 Holiday: {english_name} -> {translated_name} on {holiday.date}")
        
        print(f"✅ Loaded {len(holidays)} holidays for {country} {year} using ONLY sophisticated provider with {current_locale} translations")
        return {"holidays": holidays}
    
    # FALLBACK METHODS REMOVED - NO FALLBACKS ALLOWED
    # The system must use ONLY the sophisticated holiday provider

    async def start_auto_ntp_sync(self):
        """Start automatic NTP synchronization"""
        while True:
            try:
                # Get sync interval from settings
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = 'auto_sync'")
                auto_sync_result = cursor.fetchone()
                cursor.execute("SELECT value FROM settings WHERE key = 'sync_interval'")
                interval_result = cursor.fetchone()
                conn.close()
                
                auto_sync = json.loads(auto_sync_result[0]) if auto_sync_result else True
                interval = json.loads(interval_result[0]) if interval_result else 30
                
                if auto_sync:
                    try:
                        response = self.ntp_client.request('pool.ntp.org', version=3)
                        self.last_ntp_sync = datetime.now().isoformat()
                        self.ntp_synced = True
                    except:
                        self.ntp_synced = False
                
                await asyncio.sleep(interval * 60)  # Convert minutes to seconds
            except Exception:
                await asyncio.sleep(300)  # Wait 5 minutes on error


def create_app():
    """Create and configure the FastAPI application"""
    api = CalendifierAPI()
    
    # Add startup event to start auto NTP sync
    @api.app.on_event("startup")
    async def startup_event():
        asyncio.create_task(api.start_auto_ntp_sync())
    
    return api.app


if __name__ == "__main__":
    import uvicorn
    
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)