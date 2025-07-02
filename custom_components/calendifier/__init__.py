"""
Calendifier integration for Home Assistant.
"""
import asyncio
import logging
from datetime import timedelta

import aiohttp
import async_timeout
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN,
    PLATFORMS,
    DEFAULT_SCAN_INTERVAL,
    CONF_HOST,
    CONF_PORT,
    CONF_SSL,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.CALENDAR, Platform.SENSOR, Platform.BINARY_SENSOR]


class CalendifierDataUpdateCoordinator(DataUpdateCoordinator):
    """Class to manage fetching data from Calendifier API."""

    def __init__(
        self,
        hass: HomeAssistant,
        session: aiohttp.ClientSession,
        host: str,
        port: int,
        ssl: bool,
    ) -> None:
        """Initialize."""
        self.session = session
        self.host = host
        self.port = port
        self.ssl = ssl
        self.base_url = f"{'https' if ssl else 'http'}://{host}:{port}/api/v1"

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=DEFAULT_SCAN_INTERVAL),
        )

    async def _async_update_data(self):
        """Update data via library."""
        try:
            async with async_timeout.timeout(10):
                # Fetch calendar data for current month
                from datetime import datetime
                now = datetime.now()
                
                # Get calendar data
                calendar_url = f"{self.base_url}/calendar/{now.year}/{now.month}"
                async with self.session.get(calendar_url) as response:
                    if response.status != 200:
                        raise UpdateFailed(f"Error communicating with API: {response.status}")
                    calendar_data = await response.json()

                # Get events
                events_url = f"{self.base_url}/events"
                async with self.session.get(events_url) as response:
                    if response.status != 200:
                        raise UpdateFailed(f"Error communicating with API: {response.status}")
                    events_data = await response.json()

                # Get holidays for current year
                holidays_url = f"{self.base_url}/holidays/{now.year}"
                async with self.session.get(holidays_url) as response:
                    if response.status != 200:
                        raise UpdateFailed(f"Error communicating with API: {response.status}")
                    holidays_data = await response.json()

                # Get NTP status
                ntp_url = f"{self.base_url}/ntp/status"
                async with self.session.get(ntp_url) as response:
                    if response.status != 200:
                        raise UpdateFailed(f"Error communicating with API: {response.status}")
                    ntp_data = await response.json()

                # Get settings
                settings_url = f"{self.base_url}/settings"
                async with self.session.get(settings_url) as response:
                    if response.status != 200:
                        raise UpdateFailed(f"Error communicating with API: {response.status}")
                    settings_data = await response.json()

                return {
                    "calendar": calendar_data,
                    "events": events_data,
                    "holidays": holidays_data,
                    "ntp": ntp_data,
                    "settings": settings_data,
                }

        except asyncio.TimeoutError as exception:
            raise UpdateFailed(f"Timeout communicating with API: {exception}")
        except (aiohttp.ClientError, Exception) as exception:
            raise UpdateFailed(f"Error communicating with API: {exception}")

    async def async_create_event(self, event_data: dict) -> bool:
        """Create a new event."""
        try:
            async with async_timeout.timeout(10):
                url = f"{self.base_url}/events"
                async with self.session.post(url, json=event_data) as response:
                    if response.status == 200:
                        await self.async_request_refresh()
                        return True
                    return False
        except Exception as exception:
            _LOGGER.error(f"Error creating event: {exception}")
            return False

    async def async_update_event(self, event_id: int, event_data: dict) -> bool:
        """Update an existing event."""
        try:
            async with async_timeout.timeout(10):
                url = f"{self.base_url}/events/{event_id}"
                async with self.session.put(url, json=event_data) as response:
                    if response.status == 200:
                        await self.async_request_refresh()
                        return True
                    return False
        except Exception as exception:
            _LOGGER.error(f"Error updating event: {exception}")
            return False

    async def async_delete_event(self, event_id: int) -> bool:
        """Delete an event."""
        try:
            async with async_timeout.timeout(10):
                url = f"{self.base_url}/events/{event_id}"
                async with self.session.delete(url) as response:
                    if response.status == 200:
                        await self.async_request_refresh()
                        return True
                    return False
        except Exception as exception:
            _LOGGER.error(f"Error deleting event: {exception}")
            return False

    async def async_sync_ntp(self) -> bool:
        """Force NTP synchronization."""
        try:
            async with async_timeout.timeout(10):
                url = f"{self.base_url}/ntp/sync"
                async with self.session.post(url) as response:
                    if response.status == 200:
                        await self.async_request_refresh()
                        return True
                    return False
        except Exception as exception:
            _LOGGER.error(f"Error syncing NTP: {exception}")
            return False


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Calendifier from a config entry."""
    host = entry.data[CONF_HOST]
    port = entry.data[CONF_PORT]
    ssl = entry.data.get(CONF_SSL, False)

    session = async_get_clientsession(hass)
    coordinator = CalendifierDataUpdateCoordinator(hass, session, host, port, ssl)

    # Fetch initial data so we have data when entities subscribe
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Setup platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok