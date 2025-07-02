"""Sensor platform for Calendifier integration."""
from datetime import datetime, date, timedelta
import logging
from typing import Optional, Any

from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.const import UnitOfTime

from . import CalendifierDataUpdateCoordinator
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Calendifier sensors from a config entry."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]
    
    sensors = [
        CalendifierNextEventSensor(coordinator, config_entry),
        CalendifierTodayEventsSensor(coordinator, config_entry),
        CalendifierNextHolidaySensor(coordinator, config_entry),
        CalendifierNotesCountSensor(coordinator, config_entry),
        CalendifierNTPStatusSensor(coordinator, config_entry),
        CalendifierNTPOffsetSensor(coordinator, config_entry),
        CalendifierLocaleSensor(coordinator, config_entry),
        CalendifierThemeSensor(coordinator, config_entry),
    ]
    
    async_add_entities(sensors)


class CalendifierNextEventSensor(CoordinatorEntity, SensorEntity):
    """Sensor for the next upcoming event."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Next Event"
        self._attr_unique_id = f"{config_entry.entry_id}_next_event"
        self._attr_icon = "mdi:calendar-clock"

    @property
    def native_value(self) -> Optional[str]:
        """Return the next event title."""
        if not self.coordinator.data:
            return None
            
        events = self.coordinator.data.get("events", [])
        if not events:
            return "No upcoming events"
            
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
            return "No upcoming events"
            
        # Sort by datetime and get the earliest
        upcoming_events.sort(key=lambda x: x[0])
        next_event_datetime, next_event = upcoming_events[0]
        
        return next_event.get("title", "Untitled Event")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        events = self.coordinator.data.get("events", [])
        if not events:
            return {}
            
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
            return {}
            
        # Sort by datetime and get the earliest
        upcoming_events.sort(key=lambda x: x[0])
        next_event_datetime, next_event = upcoming_events[0]
        
        return {
            "event_id": next_event.get("id"),
            "description": next_event.get("description", ""),
            "start_date": next_event.get("start_date"),
            "start_time": next_event.get("start_time"),
            "end_date": next_event.get("end_date"),
            "end_time": next_event.get("end_time"),
            "category": next_event.get("category", "default"),
            "is_all_day": next_event.get("is_all_day", False),
            "days_until": (next_event_datetime.date() - now.date()).days,
        }


class CalendifierTodayEventsSensor(CoordinatorEntity, SensorEntity):
    """Sensor for today's event count."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Today Events"
        self._attr_unique_id = f"{config_entry.entry_id}_today_events"
        self._attr_icon = "mdi:calendar-today"
        self._attr_native_unit_of_measurement = "events"

    @property
    def native_value(self) -> int:
        """Return the number of events today."""
        if not self.coordinator.data:
            return 0
            
        events = self.coordinator.data.get("events", [])
        today = date.today()
        
        today_events = []
        for event in events:
            try:
                start_date = datetime.fromisoformat(event["start_date"]).date()
                end_date = start_date
                if event.get("end_date"):
                    end_date = datetime.fromisoformat(event["end_date"]).date()
                
                if start_date <= today <= end_date:
                    today_events.append(event)
            except (ValueError, TypeError):
                continue
        
        return len(today_events)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        events = self.coordinator.data.get("events", [])
        today = date.today()
        
        today_events = []
        for event in events:
            try:
                start_date = datetime.fromisoformat(event["start_date"]).date()
                end_date = start_date
                if event.get("end_date"):
                    end_date = datetime.fromisoformat(event["end_date"]).date()
                
                if start_date <= today <= end_date:
                    today_events.append({
                        "title": event.get("title", ""),
                        "time": event.get("start_time", "All Day"),
                        "category": event.get("category", "default"),
                    })
            except (ValueError, TypeError):
                continue
        
        return {"events": today_events}


class CalendifierNextHolidaySensor(CoordinatorEntity, SensorEntity):
    """Sensor for the next holiday."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Next Holiday"
        self._attr_unique_id = f"{config_entry.entry_id}_next_holiday"
        self._attr_icon = "mdi:calendar-star"

    @property
    def native_value(self) -> Optional[str]:
        """Return the next holiday name."""
        if not self.coordinator.data:
            return None
            
        holidays = self.coordinator.data.get("holidays", [])
        if not holidays:
            return "No upcoming holidays"
            
        today = date.today()
        
        # Find next upcoming holiday
        upcoming_holidays = []
        for holiday in holidays:
            try:
                holiday_date = datetime.fromisoformat(holiday["date"]).date()
                if holiday_date >= today:
                    upcoming_holidays.append((holiday_date, holiday))
            except (ValueError, TypeError):
                continue
        
        if not upcoming_holidays:
            return "No upcoming holidays"
            
        # Sort by date and get the earliest
        upcoming_holidays.sort(key=lambda x: x[0])
        next_holiday_date, next_holiday = upcoming_holidays[0]
        
        return next_holiday.get("display_name", next_holiday.get("name", ""))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        holidays = self.coordinator.data.get("holidays", [])
        if not holidays:
            return {}
            
        today = date.today()
        
        # Find next upcoming holiday
        upcoming_holidays = []
        for holiday in holidays:
            try:
                holiday_date = datetime.fromisoformat(holiday["date"]).date()
                if holiday_date >= today:
                    upcoming_holidays.append((holiday_date, holiday))
            except (ValueError, TypeError):
                continue
        
        if not upcoming_holidays:
            return {}
            
        # Sort by date and get the earliest
        upcoming_holidays.sort(key=lambda x: x[0])
        next_holiday_date, next_holiday = upcoming_holidays[0]
        
        return {
            "date": next_holiday.get("date"),
            "country_code": next_holiday.get("country_code"),
            "type": next_holiday.get("type"),
            "description": next_holiday.get("description", ""),
            "days_until": (next_holiday_date - today).days,
        }


class CalendifierNotesCountSensor(CoordinatorEntity, SensorEntity):
    """Sensor for notes count."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Notes Count"
        self._attr_unique_id = f"{config_entry.entry_id}_notes_count"
        self._attr_icon = "mdi:note-multiple"
        self._attr_native_unit_of_measurement = "notes"

    @property
    def native_value(self) -> int:
        """Return the number of notes."""
        # This would need to be implemented in the API
        # For now, return 0 as placeholder
        return 0


class CalendifierNTPStatusSensor(CoordinatorEntity, SensorEntity):
    """Sensor for NTP synchronization status."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier NTP Status"
        self._attr_unique_id = f"{config_entry.entry_id}_ntp_status"
        self._attr_icon = "mdi:clock-check"

    @property
    def native_value(self) -> str:
        """Return the NTP status."""
        if not self.coordinator.data:
            return "unknown"
            
        ntp_data = self.coordinator.data.get("ntp", {})
        return "synced" if ntp_data.get("is_synced", False) else "not_synced"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        ntp_data = self.coordinator.data.get("ntp", {})
        return {
            "server": ntp_data.get("server"),
            "last_sync": ntp_data.get("last_sync"),
            "offset": ntp_data.get("offset", 0),
        }


class CalendifierNTPOffsetSensor(CoordinatorEntity, SensorEntity):
    """Sensor for NTP time offset."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier NTP Offset"
        self._attr_unique_id = f"{config_entry.entry_id}_ntp_offset"
        self._attr_icon = "mdi:clock-fast"
        self._attr_native_unit_of_measurement = UnitOfTime.SECONDS
        self._attr_device_class = SensorDeviceClass.DURATION

    @property
    def native_value(self) -> float:
        """Return the NTP offset in seconds."""
        if not self.coordinator.data:
            return 0.0
            
        ntp_data = self.coordinator.data.get("ntp", {})
        return ntp_data.get("offset", 0.0)


class CalendifierLocaleSensor(CoordinatorEntity, SensorEntity):
    """Sensor for current locale."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Locale"
        self._attr_unique_id = f"{config_entry.entry_id}_locale"
        self._attr_icon = "mdi:translate"

    @property
    def native_value(self) -> str:
        """Return the current locale."""
        if not self.coordinator.data:
            return "unknown"
            
        settings = self.coordinator.data.get("settings", {})
        return settings.get("locale", "en_US")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        settings = self.coordinator.data.get("settings", {})
        return {
            "timezone": settings.get("timezone", "auto"),
            "holiday_country": settings.get("holiday_country", "US"),
            "first_day_of_week": settings.get("first_day_of_week", 0),
        }


class CalendifierThemeSensor(CoordinatorEntity, SensorEntity):
    """Sensor for current theme."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Theme"
        self._attr_unique_id = f"{config_entry.entry_id}_theme"
        self._attr_icon = "mdi:palette"

    @property
    def native_value(self) -> str:
        """Return the current theme."""
        if not self.coordinator.data:
            return "unknown"
            
        settings = self.coordinator.data.get("settings", {})
        return settings.get("theme", "dark")