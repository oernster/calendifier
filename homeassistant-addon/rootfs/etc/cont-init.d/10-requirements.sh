#!/usr/bin/with-contenv bashio
# ==============================================================================
# Check requirements and prepare environment
# ==============================================================================

bashio::log.info "Checking Calendifier requirements..."

# Check if Home Assistant API is available
if ! bashio::supervisor.ping; then
    bashio::log.warning "Home Assistant Supervisor API not available"
    bashio::log.warning "Some features may not work correctly"
fi

# Validate configuration
bashio::log.info "Validating configuration..."

# Check locale
LOCALE=$(bashio::config 'locale')
if [ "${LOCALE}" != "auto" ] && [ -n "${LOCALE}" ]; then
    bashio::log.info "Using configured locale: ${LOCALE}"
else
    bashio::log.info "Will auto-detect locale from Home Assistant"
fi

# Check timezone
TIMEZONE=$(bashio::config 'timezone')
if [ "${TIMEZONE}" != "auto" ] && [ -n "${TIMEZONE}" ]; then
    bashio::log.info "Using configured timezone: ${TIMEZONE}"
else
    bashio::log.info "Will auto-detect timezone from Home Assistant"
fi

# Check holiday country
HOLIDAY_COUNTRY=$(bashio::config 'holiday_country')
if [ "${HOLIDAY_COUNTRY}" != "auto" ] && [ -n "${HOLIDAY_COUNTRY}" ]; then
    bashio::log.info "Using configured holiday country: ${HOLIDAY_COUNTRY}"
else
    bashio::log.info "Will auto-detect holiday country from locale"
fi

# Check NTP servers
NTP_SERVERS=$(bashio::config 'ntp_servers')
if [ -n "${NTP_SERVERS}" ]; then
    bashio::log.info "NTP servers configured: $(echo "${NTP_SERVERS}" | jq -r '. | join(", ")')"
else
    bashio::log.warning "No NTP servers configured, using defaults"
fi

# Check SSL configuration
if bashio::config.true 'ssl'; then
    CERTFILE=$(bashio::config 'certfile')
    KEYFILE=$(bashio::config 'keyfile')
    
    if [ ! -f "/ssl/${CERTFILE}" ]; then
        bashio::log.fatal "SSL certificate file not found: /ssl/${CERTFILE}"
        bashio::exit.nok
    fi
    
    if [ ! -f "/ssl/${KEYFILE}" ]; then
        bashio::log.fatal "SSL key file not found: /ssl/${KEYFILE}"
        bashio::exit.nok
    fi
    
    bashio::log.info "SSL enabled with certificate: ${CERTFILE}"
else
    bashio::log.info "SSL disabled"
fi

# Create required directories
bashio::log.info "Creating required directories..."
mkdir -p /data/calendifier/{data,logs,exports,backups}

# Set proper permissions
chown -R root:root /data/calendifier

bashio::log.info "Requirements check completed successfully"