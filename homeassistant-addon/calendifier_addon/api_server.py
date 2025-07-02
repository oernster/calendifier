"""
FastAPI server for Calendifier Home Assistant Add-on
"""

import os
import sys
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import date, datetime, time
import json

# Add the app directory to Python path
sys.path.insert(0, '/app')

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import Calendifier components
from calendar_app.core.event_manager import EventManager
from calendar_app.core.calendar_manager import CalendarManager
from calendar_app.core.multi_country_holiday_provider import MultiCountryHolidayProvider
from calendar_app.config.settings import SettingsManager
from calendar_app.config.themes import ThemeManager
from calendar_app.data.models import Event, Holiday, AppSettings
from calendar_app.localization import set_locale, get_text as _
from calendar_app.localization.i18n_manager import get_i18n_manager
from calendar_app.localization.locale_detector import LocaleDetector
from calendar_app.utils.ntp_client import NTPClient, TimeManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for API
class EventCreate(BaseModel):
    title: str
    description: str = ""
    start_date: str
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    is_all_day: bool = False
    category: str = "default"
    color: str = "#0078d4"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[str] = None

class EventUpdate(BaseModel):
    id: int
    title: str
    description: str = ""
    start_date: str
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    is_all_day: bool = False
    category: str = "default"
    color: str = "#0078d4"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[str] = None

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    holiday_country: Optional[str] = None
    ntp_interval_minutes: Optional[int] = None
    first_day_of_week: Optional[int] = None
    show_week_numbers: Optional[bool] = None
    default_event_duration: Optional[int] = None

class CalendifierAPI:
    """Main API class for Calendifier Home Assistant integration"""
    
    def __init__(self):
        self.app = FastAPI(
            title="Calendifier API",
            description="Calendar application API for Home Assistant integration",
            version="1.0.0"
        )
        
        # Initialize Calendifier components
        self._init_calendifier()
        
        # Setup API routes
        self._setup_routes()
        
        # Setup middleware
        self._setup_middleware()
        
        # WebSocket connections
        self.websocket_connections: List[WebSocket] = []
    
    def _init_calendifier(self):
        """Initialize Calendifier core components"""
        try:
            # Get configuration from environment
            data_dir = Path(os.getenv('CALENDIFIER_DATA_DIR', '/data/calendifier'))
            locale = os.getenv('CALENDIFIER_LOCALE', 'en_US')
            timezone = os.getenv('CALENDIFIER_TIMEZONE', 'auto')
            holiday_country = os.getenv('CALENDIFIER_HOLIDAY_COUNTRY', 'US')
            theme = os.getenv('CALENDIFIER_THEME', 'dark')
            
            # Ensure data directory exists
            data_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize settings manager
            settings_file = data_dir / "settings.json"
            self.settings_manager = SettingsManager(settings_file)
            
            # Set locale and country from environment if provided
            if locale != 'auto':
                self.settings_manager.set_locale(locale)
                set_locale(locale)
            
            if holiday_country != 'auto':
                self.settings_manager.set_holiday_country(holiday_country)
            
            # Initialize theme manager
            self.theme_manager = ThemeManager()
            self.theme_manager.set_theme(theme)
            
            # Initialize database and event manager
            db_path = data_dir / "data" / "calendar.db"
            self.event_manager = EventManager(db_path)
            
            # Initialize holiday provider
            current_country = self.settings_manager.get_holiday_country()
            self.holiday_provider = MultiCountryHolidayProvider(current_country)
            
            # Initialize calendar manager
            self.calendar_manager = CalendarManager(
                self.event_manager, 
                self.holiday_provider
            )
            
            # Initialize NTP client
            ntp_settings = self.settings_manager.get_ntp_settings()
            self.ntp_client = NTPClient(ntp_settings['servers'])
            self.time_manager = TimeManager(ntp_settings['servers'])
            
            logger.info("Calendifier components initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Calendifier: {e}")
            raise
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # In production, restrict this
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/")
        async def root():
            """Serve the main web interface"""
            return FileResponse('/app/web/index.html')
        
        @self.app.get("/api/v1/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "version": "1.0.0",
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/api/v1/info")
        async def get_info():
            """Get system information"""
            return {
                "version": "1.0.0",
                "locale": self.settings_manager.get_locale(),
                "timezone": self.settings_manager.get_timezone(),
                "holiday_country": self.settings_manager.get_holiday_country(),
                "theme": self.settings_manager.get_theme(),
                "supported_locales": LocaleDetector.get_supported_locales(),
                "supported_countries": self.holiday_provider.get_supported_countries()
            }
        
        # Calendar endpoints
        @self.app.get("/api/v1/calendar/{year}/{month}")
        async def get_calendar(year: int, month: int):
            """Get calendar data for specific month"""
            try:
                calendar_data = self.calendar_manager.get_calendar_month(year, month)
                
                # Convert to JSON-serializable format
                return {
                    "year": calendar_data.year,
                    "month": calendar_data.month,
                    "month_name": calendar_data.month_name,
                    "weeks": [
                        [
                            {
                                "date": day.date.isoformat(),
                                "day": day.date.day,
                                "is_today": day.is_today,
                                "is_weekend": day.is_weekend,
                                "is_other_month": day.is_other_month,
                                "is_holiday": day.is_holiday,
                                "holiday": {
                                    "name": day.holiday.name,
                                    "country_code": day.holiday.country_code,
                                    "type": day.holiday.type
                                } if day.holiday else None,
                                "events": [
                                    {
                                        "id": event.id,
                                        "title": event.title,
                                        "category": event.category,
                                        "color": event.color,
                                        "is_all_day": event.is_all_day,
                                        "start_time": event.start_time.isoformat() if event.start_time else None
                                    }
                                    for event in day.events
                                ],
                                "event_indicators": day.get_event_indicators()
                            }
                            for day in week
                        ]
                        for week in calendar_data.weeks
                    ]
                }
            except Exception as e:
                logger.error(f"Error getting calendar: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Event endpoints
        @self.app.get("/api/v1/events")
        async def get_events(
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
            limit: int = 100
        ):
            """Get events with optional date filtering"""
            try:
                if start_date and end_date:
                    start = date.fromisoformat(start_date)
                    end = date.fromisoformat(end_date)
                    events = []
                    current = start
                    while current <= end:
                        daily_events = self.event_manager.get_events_for_date(current)
                        events.extend(daily_events)
                        current = date.fromordinal(current.toordinal() + 1)
                else:
                    events = self.event_manager.search_events("", limit)
                
                return [
                    {
                        "id": event.id,
                        "title": event.title,
                        "description": event.description,
                        "start_date": event.start_date.isoformat() if event.start_date else None,
                        "start_time": event.start_time.isoformat() if event.start_time else None,
                        "end_date": event.end_date.isoformat() if event.end_date else None,
                        "end_time": event.end_time.isoformat() if event.end_time else None,
                        "is_all_day": event.is_all_day,
                        "category": event.category,
                        "color": event.color,
                        "is_recurring": event.is_recurring,
                        "recurrence_pattern": event.recurrence_pattern,
                        "created_at": event.created_at.isoformat() if event.created_at else None,
                        "updated_at": event.updated_at.isoformat() if event.updated_at else None
                    }
                    for event in events
                ]
            except Exception as e:
                logger.error(f"Error getting events: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/events")
        async def create_event(event_data: EventCreate):
            """Create a new event"""
            try:
                # Convert to Event object
                event = Event(
                    title=event_data.title,
                    description=event_data.description,
                    start_date=date.fromisoformat(event_data.start_date),
                    start_time=time.fromisoformat(event_data.start_time) if event_data.start_time else None,
                    end_date=date.fromisoformat(event_data.end_date) if event_data.end_date else None,
                    end_time=time.fromisoformat(event_data.end_time) if event_data.end_time else None,
                    is_all_day=event_data.is_all_day,
                    category=event_data.category,
                    color=event_data.color,
                    is_recurring=event_data.is_recurring,
                    recurrence_pattern=event_data.recurrence_pattern,
                    recurrence_end_date=date.fromisoformat(event_data.recurrence_end_date) if event_data.recurrence_end_date else None
                )
                
                event_id = self.event_manager.create_event(event)
                
                # Notify WebSocket clients
                await self._notify_websocket_clients({
                    "type": "event_created",
                    "event_id": event_id
                })
                
                return {"id": event_id, "message": "Event created successfully"}
                
            except Exception as e:
                logger.error(f"Error creating event: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.put("/api/v1/events/{event_id}")
        async def update_event(event_id: int, event_data: EventUpdate):
            """Update an existing event"""
            try:
                # Convert to Event object
                event = Event(
                    id=event_id,
                    title=event_data.title,
                    description=event_data.description,
                    start_date=date.fromisoformat(event_data.start_date),
                    start_time=time.fromisoformat(event_data.start_time) if event_data.start_time else None,
                    end_date=date.fromisoformat(event_data.end_date) if event_data.end_date else None,
                    end_time=time.fromisoformat(event_data.end_time) if event_data.end_time else None,
                    is_all_day=event_data.is_all_day,
                    category=event_data.category,
                    color=event_data.color,
                    is_recurring=event_data.is_recurring,
                    recurrence_pattern=event_data.recurrence_pattern,
                    recurrence_end_date=date.fromisoformat(event_data.recurrence_end_date) if event_data.recurrence_end_date else None
                )
                
                success = self.event_manager.update_event(event)
                
                if success:
                    # Notify WebSocket clients
                    await self._notify_websocket_clients({
                        "type": "event_updated",
                        "event_id": event_id
                    })
                    return {"message": "Event updated successfully"}
                else:
                    raise HTTPException(status_code=404, detail="Event not found")
                    
            except Exception as e:
                logger.error(f"Error updating event: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.delete("/api/v1/events/{event_id}")
        async def delete_event(event_id: int):
            """Delete an event"""
            try:
                success = self.event_manager.delete_event(event_id)
                
                if success:
                    # Notify WebSocket clients
                    await self._notify_websocket_clients({
                        "type": "event_deleted",
                        "event_id": event_id
                    })
                    return {"message": "Event deleted successfully"}
                else:
                    raise HTTPException(status_code=404, detail="Event not found")
                    
            except Exception as e:
                logger.error(f"Error deleting event: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Holiday endpoints
        @self.app.get("/api/v1/holidays/{year}")
        async def get_holidays(year: int):
            """Get holidays for specific year"""
            try:
                holidays = self.holiday_provider.get_holidays_for_year(year)
                
                return [
                    {
                        "name": holiday.name,
                        "date": holiday.date.isoformat(),
                        "country_code": holiday.country_code,
                        "type": holiday.type,
                        "description": holiday.description,
                        "is_observed": holiday.is_observed,
                        "display_name": holiday.get_display_name()
                    }
                    for holiday in holidays
                ]
            except Exception as e:
                logger.error(f"Error getting holidays: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Settings endpoints
        @self.app.get("/api/v1/settings")
        async def get_settings():
            """Get current settings"""
            try:
                return self.settings_manager.get_all_settings()
            except Exception as e:
                logger.error(f"Error getting settings: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.put("/api/v1/settings")
        async def update_settings(settings_data: SettingsUpdate):
            """Update settings"""
            try:
                updates = {}
                
                if settings_data.theme:
                    updates['theme'] = settings_data.theme
                if settings_data.locale:
                    updates['locale'] = settings_data.locale
                if settings_data.timezone:
                    updates['timezone'] = settings_data.timezone
                if settings_data.holiday_country:
                    updates['holiday_country'] = settings_data.holiday_country
                if settings_data.ntp_interval_minutes:
                    updates['ntp_interval_minutes'] = settings_data.ntp_interval_minutes
                if settings_data.first_day_of_week is not None:
                    updates['first_day_of_week'] = settings_data.first_day_of_week
                if settings_data.show_week_numbers is not None:
                    updates['show_week_numbers'] = settings_data.show_week_numbers
                if settings_data.default_event_duration:
                    updates['default_event_duration'] = settings_data.default_event_duration
                
                success = self.settings_manager.update_settings(updates)
                
                if success:
                    # Update holiday provider if country changed
                    if 'holiday_country' in updates:
                        self.holiday_provider.set_country(updates['holiday_country'])
                    
                    # Update locale if changed
                    if 'locale' in updates:
                        set_locale(updates['locale'])
                        self.holiday_provider.force_locale_refresh()
                    
                    # Notify WebSocket clients
                    await self._notify_websocket_clients({
                        "type": "settings_updated",
                        "updates": updates
                    })
                    
                    return {"message": "Settings updated successfully"}
                else:
                    raise HTTPException(status_code=500, detail="Failed to update settings")
                    
            except Exception as e:
                logger.error(f"Error updating settings: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # NTP endpoints
        @self.app.get("/api/v1/ntp/status")
        async def get_ntp_status():
            """Get NTP synchronization status"""
            try:
                status = self.time_manager.get_ntp_status()
                return status
            except Exception as e:
                logger.error(f"Error getting NTP status: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/ntp/sync")
        async def sync_ntp():
            """Force NTP synchronization"""
            try:
                result = self.ntp_client.sync_time()
                return {
                    "success": result.success,
                    "server": result.server,
                    "offset": result.offset,
                    "error": result.error
                }
            except Exception as e:
                logger.error(f"Error syncing NTP: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # WebSocket endpoint
        @self.app.websocket("/api/v1/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates"""
            await websocket.accept()
            self.websocket_connections.append(websocket)
            
            try:
                while True:
                    # Keep connection alive
                    await websocket.receive_text()
            except WebSocketDisconnect:
                self.websocket_connections.remove(websocket)
        
        # Mount static files
        self.app.mount("/static", StaticFiles(directory="/app/web/static"), name="static")
    
    async def _notify_websocket_clients(self, message: Dict[str, Any]):
        """Notify all connected WebSocket clients"""
        if not self.websocket_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = []
        
        for websocket in self.websocket_connections:
            try:
                await websocket.send_text(message_str)
            except:
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            self.websocket_connections.remove(websocket)

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Calendifier API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8099, help="Port to bind to")
    parser.add_argument("--log-level", default="info", help="Log level")
    parser.add_argument("--ssl-certfile", help="SSL certificate file")
    parser.add_argument("--ssl-keyfile", help="SSL key file")
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = getattr(logging, args.log_level.upper())
    logging.basicConfig(level=log_level)
    
    # Create API instance
    api = CalendifierAPI()
    
    # Configure SSL if provided
    ssl_config = {}
    if args.ssl_certfile and args.ssl_keyfile:
        ssl_config = {
            "ssl_certfile": args.ssl_certfile,
            "ssl_keyfile": args.ssl_keyfile
        }
    
    # Run server
    uvicorn.run(
        api.app,
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        **ssl_config
    )

if __name__ == "__main__":
    main()