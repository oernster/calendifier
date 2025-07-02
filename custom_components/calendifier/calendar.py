"""Calendar platform for Calendifier integration."""
from datetime import datetime, date, timedelta
import logging
from typing import Optional, List

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import CalendifierDataUpdateCoordinator
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Calendifier calendar from a config entry."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]
    
    async_add_entities([CalendifierCalendar(coordinator, config_entry)])


class CalendifierCalendar(CoordinatorEntity, CalendarEntity):
    """Calendifier calendar entity."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the calendar."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Calendar"
        self._attr_unique_id = f"{config_entry.entry_id}_calendar"

    @property
    def event(self) -> Optional[CalendarEvent]:
        """Return the next upcoming event."""
        if not self.coordinator.data:
            return None
            
        events = self.coordinator.data.get("events", [])
        if not events:
            return None
            
        now = datetime.now()
        
        # Find next upcoming event
        upcoming_events = []
        for event in events:
            try:
                start_date = datetime.fromisoformat(event["start_date"]).date()
                start_time = None
                if event.get("start_time"):
                    start_time = datetime.fromisoformat(event["start_time"]).time()
                    event_datetime = datetime.combine(start_date, start_time)
                else:
                    event_datetime = datetime.combine(start_date, datetime.min.time())
                
                if event_datetime > now:
                    upcoming_events.append((event_datetime, event))
            except (ValueError, TypeError):
                continue
        
        if not upcoming_events:
            return None
            
        # Sort by datetime and get the earliest
        upcoming_events.sort(key=lambda x: x[0])
        next_event_datetime, next_event = upcoming_events[0]
        
        # Create CalendarEvent
        end_datetime = next_event_datetime
        if next_event.get("end_date"):
            try:
                end_date = datetime.fromisoformat(next_event["end_date"]).date()
                end_time = None
                if next_event.get("end_time"):
                    end_time = datetime.fromisoformat(next_event["end_time"]).time()
                    end_datetime = datetime.combine(end_date, end_time)
                else:
                    end_datetime = datetime.combine(end_date, datetime.min.time())
            except (ValueError, TypeError):
                pass
        
        return CalendarEvent(
            start=next_event_datetime,
            end=end_datetime,
            summary=next_event.get("title", ""),
            description=next_event.get("description", ""),
            uid=str(next_event.get("id", "")),
        )

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> List[CalendarEvent]:
        """Get events in a specific date range."""
        if not self.coordinator.data:
            return []
            
        events = self.coordinator.data.get("events", [])
        holidays = self.coordinator.data.get("holidays", [])
        
        calendar_events = []
        
        # Process regular events
        for event in events:
            try:
                event_start_date = datetime.fromisoformat(event["start_date"]).date()
                event_end_date = event_start_date
                
                if event.get("end_date"):
                    event_end_date = datetime.fromisoformat(event["end_date"]).date()
                
                # Check if event overlaps with requested range
                if (event_start_date <= end_date.date() and 
                    event_end_date >= start_date.date()):
                    
                    # Create start datetime
                    if event.get("start_time") and not event.get("is_all_day", False):
                        start_time = datetime.fromisoformat(event["start_time"]).time()
                        event_start = datetime.combine(event_start_date, start_time)
                    else:
                        event_start = datetime.combine(event_start_date, datetime.min.time())
                    
                    # Create end datetime
                    if event.get("end_time") and not event.get("is_all_day", False):
                        end_time = datetime.fromisoformat(event["end_time"]).time()
                        event_end = datetime.combine(event_end_date, end_time)
                    else:
                        event_end = datetime.combine(event_end_date, datetime.max.time())
                    
                    calendar_events.append(
                        CalendarEvent(
                            start=event_start,
                            end=event_end,
                            summary=event.get("title", ""),
                            description=event.get("description", ""),
                            uid=str(event.get("id", "")),
                        )
                    )
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Error processing event: {e}")
                continue
        
        # Process holidays
        for holiday in holidays:
            try:
                holiday_date = datetime.fromisoformat(holiday["date"]).date()
                
                # Check if holiday is in requested range
                if start_date.date() <= holiday_date <= end_date.date():
                    holiday_start = datetime.combine(holiday_date, datetime.min.time())
                    holiday_end = datetime.combine(holiday_date, datetime.max.time())
                    
                    calendar_events.append(
                        CalendarEvent(
                            start=holiday_start,
                            end=holiday_end,
                            summary=holiday.get("display_name", holiday.get("name", "")),
                            description=holiday.get("description", ""),
                            uid=f"holiday_{holiday.get('country_code', '')}_{holiday_date.isoformat()}",
                        )
                    )
            except (ValueError, TypeError, KeyError) as e:
                _LOGGER.warning(f"Error processing holiday: {e}")
                continue
        
        return calendar_events

    async def async_create_event(self, **kwargs) -> None:
        """Create a new event."""
        event_data = {
            "title": kwargs.get("summary", ""),
            "description": kwargs.get("description", ""),
            "start_date": kwargs.get("dtstart").date().isoformat(),
            "is_all_day": kwargs.get("dtstart").time() == datetime.min.time(),
        }
        
        if not event_data["is_all_day"]:
            event_data["start_time"] = kwargs.get("dtstart").time().isoformat()
        
        if kwargs.get("dtend"):
            event_data["end_date"] = kwargs.get("dtend").date().isoformat()
            if not event_data["is_all_day"]:
                event_data["end_time"] = kwargs.get("dtend").time().isoformat()
        
        await self.coordinator.async_create_event(event_data)

    async def async_delete_event(
        self,
        uid: str,
        recurrence_id: Optional[str] = None,
        recurrence_range: Optional[str] = None,
    ) -> None:
        """Delete an event."""
        try:
            event_id = int(uid)
            await self.coordinator.async_delete_event(event_id)
        except (ValueError, TypeError):
            _LOGGER.error(f"Invalid event ID for deletion: {uid}")

    async def async_update_event(
        self,
        uid: str,
        event: CalendarEvent,
        recurrence_id: Optional[str] = None,
        recurrence_range: Optional[str] = None,
    ) -> None:
        """Update an event."""
        try:
            event_id = int(uid)
            event_data = {
                "id": event_id,
                "title": event.summary,
                "description": event.description or "",
                "start_date": event.start.date().isoformat(),
                "is_all_day": event.start.time() == datetime.min.time(),
            }
            
            if not event_data["is_all_day"]:
                event_data["start_time"] = event.start.time().isoformat()
            
            if event.end:
                event_data["end_date"] = event.end.date().isoformat()
                if not event_data["is_all_day"]:
                    event_data["end_time"] = event.end.time().isoformat()
            
            await self.coordinator.async_update_event(event_id, event_data)
        except (ValueError, TypeError):
            _LOGGER.error(f"Invalid event ID for update: {uid}")