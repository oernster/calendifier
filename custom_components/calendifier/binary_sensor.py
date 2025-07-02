"""Binary sensor platform for Calendifier integration."""
from datetime import datetime, date
import logging
from typing import Optional

from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorDeviceClass
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
    """Set up Calendifier binary sensors from a config entry."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]
    
    binary_sensors = [
        CalendifierHolidayTodayBinarySensor(coordinator, config_entry),
        CalendifierEventTodayBinarySensor(coordinator, config_entry),
        CalendifierNTPSyncBinarySensor(coordinator, config_entry),
        CalendifierWeekendBinarySensor(coordinator, config_entry),
    ]
    
    async_add_entities(binary_sensors)


class CalendifierHolidayTodayBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor for whether today is a holiday."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Holiday Today"
        self._attr_unique_id = f"{config_entry.entry_id}_holiday_today"
        self._attr_icon = "mdi:calendar-star"

    @property
    def is_on(self) -> bool:
        """Return true if today is a holiday."""
        if not self.coordinator.data:
            return False
            
        holidays = self.coordinator.data.get("holidays", [])
        today = date.today()
        
        for holiday in holidays:
            try:
                holiday_date = datetime.fromisoformat(holiday["date"]).date()
                if holiday_date == today:
                    return True
            except (ValueError, TypeError):
                continue
        
        return False

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        holidays = self.coordinator.data.get("holidays", [])
        today = date.today()
        
        today_holidays = []
        for holiday in holidays:
            try:
                holiday_date = datetime.fromisoformat(holiday["date"]).date()
                if holiday_date == today:
                    today_holidays.append({
                        "name": holiday.get("display_name", holiday.get("name", "")),
                        "country": holiday.get("country_code", ""),
                        "type": holiday.get("type", ""),
                        "description": holiday.get("description", ""),
                    })
            except (ValueError, TypeError):
                continue
        
        return {"holidays": today_holidays}


class CalendifierEventTodayBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor for whether there are events today."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Events Today"
        self._attr_unique_id = f"{config_entry.entry_id}_events_today"
        self._attr_icon = "mdi:calendar-check"

    @property
    def is_on(self) -> bool:
        """Return true if there are events today."""
        if not self.coordinator.data:
            return False
            
        events = self.coordinator.data.get("events", [])
        today = date.today()
        
        for event in events:
            try:
                start_date = datetime.fromisoformat(event["start_date"]).date()
                end_date = start_date
                if event.get("end_date"):
                    end_date = datetime.fromisoformat(event["end_date"]).date()
                
                if start_date <= today <= end_date:
                    return True
            except (ValueError, TypeError):
                continue
        
        return False

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        events = self.coordinator.data.get("events", [])
        today = date.today()
        
        event_count = 0
        next_event_time = None
        
        for event in events:
            try:
                start_date = datetime.fromisoformat(event["start_date"]).date()
                end_date = start_date
                if event.get("end_date"):
                    end_date = datetime.fromisoformat(event["end_date"]).date()
                
                if start_date <= today <= end_date:
                    event_count += 1
                    if event.get("start_time") and start_date == today:
                        event_time = event["start_time"]
                        if next_event_time is None or event_time < next_event_time:
                            next_event_time = event_time
            except (ValueError, TypeError):
                continue
        
        return {
            "event_count": event_count,
            "next_event_time": next_event_time,
        }


class CalendifierNTPSyncBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor for NTP synchronization status."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier NTP Synced"
        self._attr_unique_id = f"{config_entry.entry_id}_ntp_synced"
        self._attr_icon = "mdi:clock-check-outline"
        self._attr_device_class = BinarySensorDeviceClass.CONNECTIVITY

    @property
    def is_on(self) -> bool:
        """Return true if NTP is synchronized."""
        if not self.coordinator.data:
            return False
            
        ntp_data = self.coordinator.data.get("ntp", {})
        return ntp_data.get("is_synced", False)

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes."""
        if not self.coordinator.data:
            return {}
            
        ntp_data = self.coordinator.data.get("ntp", {})
        return {
            "server": ntp_data.get("server"),
            "last_sync": ntp_data.get("last_sync"),
            "offset": ntp_data.get("offset", 0),
            "error": ntp_data.get("error"),
        }


class CalendifierWeekendBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor for whether today is a weekend."""

    def __init__(
        self,
        coordinator: CalendifierDataUpdateCoordinator,
        config_entry: ConfigEntry,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._config_entry = config_entry
        self._attr_name = "Calendifier Weekend"
        self._attr_unique_id = f"{config_entry.entry_id}_weekend"
        self._attr_icon = "mdi:calendar-weekend"

    @property
    def is_on(self) -> bool:
        """Return true if today is a weekend."""
        today = date.today()
        # Saturday = 5, Sunday = 6 in Python's weekday()
        return today.weekday() >= 5

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes."""
        today = date.today()
        weekday_names = [
            "Monday", "Tuesday", "Wednesday", "Thursday", 
            "Friday", "Saturday", "Sunday"
        ]
        
        return {
            "weekday": today.weekday(),
            "weekday_name": weekday_names[today.weekday()],
            "is_saturday": today.weekday() == 5,
            "is_sunday": today.weekday() == 6,
        }