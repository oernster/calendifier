"""Config flow for Calendifier integration."""
import logging
from typing import Any, Dict, Optional

import aiohttp
import async_timeout
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_SSL, CONF_SSL

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_HOST, default=DEFAULT_HOST): str,
        vol.Required(CONF_PORT, default=DEFAULT_PORT): int,
        vol.Optional(CONF_SSL, default=DEFAULT_SSL): bool,
    }
)


async def validate_input(hass: HomeAssistant, data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the user input allows us to connect."""
    host = data[CONF_HOST]
    port = data[CONF_PORT]
    ssl = data.get(CONF_SSL, False)
    
    session = async_get_clientsession(hass)
    base_url = f"{'https' if ssl else 'http'}://{host}:{port}/api/v1"
    
    try:
        async with async_timeout.timeout(10):
            async with session.get(f"{base_url}/health") as response:
                if response.status != 200:
                    raise CannotConnect
                
                health_data = await response.json()
                if health_data.get("status") != "healthy":
                    raise CannotConnect
                    
            # Get info to validate it's actually Calendifier
            async with session.get(f"{base_url}/info") as response:
                if response.status != 200:
                    raise CannotConnect
                    
                info_data = await response.json()
                
    except (aiohttp.ClientError, asyncio.TimeoutError):
        raise CannotConnect
    except Exception:
        raise CannotConnect

    # Return info that you want to store in the config entry.
    return {
        "title": f"Calendifier ({host}:{port})",
        "version": info_data.get("version", "unknown"),
        "locale": info_data.get("locale", "en_US"),
    }


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Calendifier."""

    VERSION = 1

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Handle the initial step."""
        if user_input is None:
            return self.async_show_form(
                step_id="user", data_schema=STEP_USER_DATA_SCHEMA
            )

        errors = {}

        try:
            info = await validate_input(self.hass, user_input)
        except CannotConnect:
            errors["base"] = "cannot_connect"
        except InvalidAuth:
            errors["base"] = "invalid_auth"
        except Exception:  # pylint: disable=broad-except
            _LOGGER.exception("Unexpected exception")
            errors["base"] = "unknown"
        else:
            # Check if already configured
            await self.async_set_unique_id(f"{user_input[CONF_HOST]}:{user_input[CONF_PORT]}")
            self._abort_if_unique_id_configured()
            
            return self.async_create_entry(title=info["title"], data=user_input)

        return self.async_show_form(
            step_id="user", data_schema=STEP_USER_DATA_SCHEMA, errors=errors
        )


class CannotConnect(Exception):
    """Error to indicate we cannot connect."""


class InvalidAuth(Exception):
    """Error to indicate there is invalid auth."""