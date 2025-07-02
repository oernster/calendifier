# Calendifier Home Assistant Add-on

A comprehensive calendar application with multi-language support, locale-aware holidays, and full Home Assistant integration.

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

## About

Calendifier is a sophisticated calendar application that brings professional-grade calendar functionality to Home Assistant. It features:

- **🌍 Multi-language Support**: 14 languages with complete localization
- **🏳️ Locale-aware Holidays**: Intelligent holiday detection for 14 countries
- **📅 Full Calendar Management**: Events, recurring events, categories, and notes
- **🕐 Precision Timekeeping**: NTP synchronization for accurate time
- **🎨 Theme Integration**: Dark/light themes that integrate with Home Assistant
- **📱 Responsive Design**: Works perfectly on all devices
- **🔄 Real-time Updates**: WebSocket-based live updates
- **📤📥 Import/Export**: Support for iCalendar, CSV, and JSON formats

## Features

### Calendar Management
- Monthly, weekly, and daily views
- Event creation, editing, and deletion
- Recurring events with flexible patterns
- Event categories with color coding
- All-day and timed events
- Event search and filtering

### Holiday System
- Automatic holiday detection for 14 countries
- Holidays displayed in user's language
- Cultural filtering and localization
- Integration with Home Assistant calendar

### Internationalization
- **Languages**: English (US/UK), Spanish, French, German, Italian, Portuguese, Russian, Chinese (Simplified/Traditional), Japanese, Korean, Hindi, Arabic
- **Countries**: US, UK, Spain, France, Germany, Italy, Brazil, Russia, China, Taiwan, Japan, South Korea, India, Saudi Arabia
- Automatic locale detection from Home Assistant
- Dynamic language switching

### Time Management
- NTP time synchronization
- Multiple NTP server support
- Timezone awareness
- Precision timing for events

### Notes System
- Integrated note-taking
- Rich text support
- Note organization and search

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the "Calendifier" add-on
3. Configure the add-on (see Configuration section)
4. Start the add-on
5. Access the web interface via the "Open Web UI" button

## Configuration

### Basic Configuration

```yaml
log_level: info
locale: auto          # or specific locale like 'en_US', 'de_DE'
timezone: auto        # or specific timezone like 'Europe/London'
holiday_country: auto # or specific country code like 'US', 'DE'
theme: dark          # or 'light'
```

### Advanced Configuration

```yaml
ntp_servers:
  - pool.ntp.org
  - time.google.com
  - time.cloudflare.com
ntp_interval: 5              # minutes between NTP sync
first_day_of_week: 0         # 0=Monday, 6=Sunday
show_week_numbers: true
default_event_duration: 60   # minutes
ssl: false                   # enable HTTPS
certfile: fullchain.pem     # SSL certificate (if ssl: true)
keyfile: privkey.pem        # SSL private key (if ssl: true)
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `log_level` | Logging level (trace, debug, info, notice, warning, error, fatal) | `info` |
| `locale` | Language/locale setting or 'auto' to detect from HA | `auto` |
| `timezone` | Timezone setting or 'auto' to use HA timezone | `auto` |
| `holiday_country` | Country for holidays or 'auto' to detect from locale | `auto` |
| `theme` | UI theme (dark, light) | `dark` |
| `ntp_servers` | List of NTP servers for time synchronization | See default list |
| `ntp_interval` | Minutes between NTP synchronization (1-1440) | `5` |
| `first_day_of_week` | First day of week (0=Monday, 6=Sunday) | `0` |
| `show_week_numbers` | Show week numbers in calendar | `true` |
| `default_event_duration` | Default event duration in minutes (15-1440) | `60` |
| `ssl` | Enable HTTPS | `false` |
| `certfile` | SSL certificate file (in /ssl/ directory) | `fullchain.pem` |
| `keyfile` | SSL private key file (in /ssl/ directory) | `privkey.pem` |

## Usage

### Web Interface

After starting the add-on, access the web interface through:
- Home Assistant: Add-ons → Calendifier → "Open Web UI"
- Direct URL: `http://your-ha-ip:8099`

The web interface provides full calendar functionality including:
- Interactive calendar view
- Event management
- Settings configuration
- Notes management
- Holiday information

### Home Assistant Integration

The add-on automatically provides:

#### API Endpoints
- `GET /api/v1/calendar/{year}/{month}` - Calendar data
- `GET /api/v1/events` - List events
- `POST /api/v1/events` - Create event
- `PUT /api/v1/events/{id}` - Update event
- `DELETE /api/v1/events/{id}` - Delete event
- `GET /api/v1/holidays/{year}` - Get holidays
- `GET /api/v1/settings` - Get settings
- `PUT /api/v1/settings` - Update settings
- `GET /api/v1/ntp/status` - NTP status
- `POST /api/v1/ntp/sync` - Force NTP sync

#### WebSocket Updates
- Real-time event updates
- Settings changes
- Calendar refreshes

### Automation Integration

Use the REST API in Home Assistant automations:

```yaml
# Example: Create event via automation
service: rest_command.create_calendifier_event
data:
  title: "Automated Event"
  start_date: "2025-01-15"
  start_time: "14:00:00"
  category: "automation"
```

## Supported Languages

| Language | Locale Code | Country Support |
|----------|-------------|-----------------|
| English (US) | en_US | 🇺🇸 United States |
| English (UK) | en_GB | 🇬🇧 United Kingdom |
| Spanish | es_ES | 🇪🇸 Spain |
| French | fr_FR | 🇫🇷 France |
| German | de_DE | 🇩🇪 Germany |
| Italian | it_IT | 🇮🇹 Italy |
| Portuguese | pt_BR | 🇧🇷 Brazil |
| Russian | ru_RU | 🇷🇺 Russia |
| Chinese (Simplified) | zh_CN | 🇨🇳 China |
| Chinese (Traditional) | zh_TW | 🇹🇼 Taiwan |
| Japanese | ja_JP | 🇯🇵 Japan |
| Korean | ko_KR | 🇰🇷 South Korea |
| Hindi | hi_IN | 🇮🇳 India |
| Arabic | ar_SA | 🇸🇦 Saudi Arabia |

## Data Storage

The add-on stores data in `/data/calendifier/`:
- `data/calendar.db` - SQLite database with events
- `settings.json` - Application settings
- `logs/` - Application logs
- `exports/` - Exported calendar files
- `backups/` - Database backups

## Troubleshooting

### Common Issues

1. **Add-on won't start**
   - Check the logs for error messages
   - Verify configuration syntax
   - Ensure sufficient system resources

2. **Web interface not accessible**
   - Verify the add-on is running
   - Check port 8099 is not blocked
   - Try accessing via Home Assistant ingress

3. **Holidays not showing correctly**
   - Verify `locale` and `holiday_country` settings
   - Check if your country is supported
   - Restart the add-on after changing locale

4. **Time synchronization issues**
   - Check NTP server accessibility
   - Verify network connectivity
   - Review NTP settings in configuration

### Logs

Access logs through:
- Home Assistant: Add-ons → Calendifier → "Log" tab
- File system: `/data/calendifier/logs/`

### Support

For support and bug reports:
- GitHub Issues: [https://github.com/oernster/calendifier/issues](https://github.com/oernster/calendifier/issues)
- Documentation: [Integration Guide](https://github.com/oernster/calendifier/blob/main/docs/home_assistant_integration.md)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/oernster/calendifier/blob/main/LICENSE) file for details.

## Acknowledgments

- [PySide6](https://doc.qt.io/qtforpython/) - Qt6 Python bindings
- [Python holidays](https://python-holidays.readthedocs.io/) - Holiday data library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [Home Assistant](https://www.home-assistant.io/) - Open source home automation

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg