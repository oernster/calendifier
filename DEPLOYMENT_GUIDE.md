# 🚀 Calendifier Home Assistant Integration - Deployment Guide

This guide provides step-by-step instructions for deploying the complete Calendifier Home Assistant integration.

## 📋 Prerequisites

- Home Assistant 2024.1 or later
- Docker (for add-on deployment)
- Git (for cloning repositories)
- Basic knowledge of Home Assistant configuration

## 🏗️ Architecture Overview

The integration consists of three main components:

1. **Home Assistant Add-on** - Containerized Calendifier service with web interface
2. **Custom Integration** - Native Home Assistant integration providing entities and services
3. **Web Interface** - Responsive calendar application accessible via browser

## 📦 Component 1: Home Assistant Add-on

### Step 1: Prepare Add-on Repository

1. Create a new repository for the add-on or use an existing Home Assistant add-on repository
2. Copy the `homeassistant-addon/` directory to your add-on repository
3. Ensure the following structure:

```
your-addon-repo/
├── calendifier/
│   ├── config.yaml
│   ├── Dockerfile
│   ├── build.yaml
│   ├── README.md
│   ├── requirements.txt
│   ├── rootfs/
│   ├── calendifier_addon/
│   └── web/
```

### Step 2: Build and Deploy Add-on

1. **Local Development:**
   ```bash
   # Build the add-on locally
   docker build -t calendifier-addon .
   
   # Test the container
   docker run -p 8099:8099 calendifier-addon
   ```

2. **Home Assistant Add-on Store:**
   ```bash
   # Add your repository to Home Assistant
   # Go to Supervisor > Add-on Store > ... > Repositories
   # Add: https://github.com/yourusername/your-addon-repo
   ```

3. **Install and Configure:**
   - Find "Calendifier" in the add-on store
   - Click "Install"
   - Configure settings in the "Configuration" tab
   - Start the add-on
   - Access via "Open Web UI"

### Step 3: Add-on Configuration

Example configuration in Home Assistant:

```yaml
log_level: info
locale: auto          # Detects from Home Assistant
timezone: auto        # Uses Home Assistant timezone
holiday_country: auto # Detects from locale
theme: dark
ntp_servers:
  - pool.ntp.org
  - time.google.com
  - time.cloudflare.com
ntp_interval: 5
first_day_of_week: 0
show_week_numbers: true
default_event_duration: 60
ssl: false
```

## 🔧 Component 2: Custom Integration

### Step 1: Install Custom Integration

1. **Manual Installation:**
   ```bash
   # Copy to Home Assistant custom_components directory
   cp -r custom_components/calendifier /config/custom_components/
   ```

2. **HACS Installation (Recommended):**
   - Add custom repository to HACS
   - Search for "Calendifier"
   - Install integration

### Step 2: Configure Integration

1. **Via UI (Recommended):**
   - Go to Settings > Devices & Services
   - Click "Add Integration"
   - Search for "Calendifier"
   - Enter add-on host and port (usually `localhost:8099`)

2. **Via Configuration.yaml:**
   ```yaml
   # Not recommended - use UI configuration instead
   calendifier:
     host: localhost
     port: 8099
     ssl: false
   ```

### Step 3: Verify Integration

After setup, you should see:

**Entities:**
- `calendar.calendifier_calendar` - Main calendar entity
- `sensor.calendifier_next_event` - Next upcoming event
- `sensor.calendifier_today_events` - Today's event count
- `sensor.calendifier_next_holiday` - Next holiday
- `sensor.calendifier_ntp_status` - NTP synchronization status
- `binary_sensor.calendifier_holiday_today` - Is today a holiday
- `binary_sensor.calendifier_events_today` - Are there events today

**Services:**
- `calendifier.create_event` - Create new event
- `calendifier.update_event` - Update existing event
- `calendifier.delete_event` - Delete event
- `calendifier.sync_ntp` - Force NTP synchronization

## 🌐 Component 3: Web Interface

The web interface is automatically available once the add-on is running:

- **Access:** Home Assistant > Supervisor > Calendifier > "Open Web UI"
- **Direct URL:** `http://your-ha-ip:8099`
- **Features:** Full calendar functionality with responsive design

## 🌍 Locale Configuration

### Automatic Detection

The integration automatically detects:
- **Language** from Home Assistant's configured language
- **Country** from the detected locale for holiday display
- **Timezone** from Home Assistant's timezone setting

### Manual Override

You can override automatic detection in the add-on configuration:

```yaml
locale: de_DE          # Force German locale
holiday_country: DE    # Force German holidays
timezone: Europe/Berlin # Force specific timezone
```

### Supported Locales

| Locale | Language | Country | Holidays |
|--------|----------|---------|----------|
| en_US | English (US) | 🇺🇸 United States | ✅ |
| en_GB | English (UK) | 🇬🇧 United Kingdom | ✅ |
| es_ES | Spanish | 🇪🇸 Spain | ✅ |
| fr_FR | French | 🇫🇷 France | ✅ |
| de_DE | German | 🇩🇪 Germany | ✅ |
| it_IT | Italian | 🇮🇹 Italy | ✅ |
| pt_BR | Portuguese | 🇧🇷 Brazil | ✅ |
| ru_RU | Russian | 🇷🇺 Russia | ✅ |
| zh_CN | Chinese (Simplified) | 🇨🇳 China | ✅ |
| zh_TW | Chinese (Traditional) | 🇹🇼 Taiwan | ✅ |
| ja_JP | Japanese | 🇯🇵 Japan | ✅ |
| ko_KR | Korean | 🇰🇷 South Korea | ✅ |
| hi_IN | Hindi | 🇮🇳 India | ✅ |
| ar_SA | Arabic | 🇸🇦 Saudi Arabia | ✅ |

## 🤖 Automation Examples

### Holiday-based Automation

```yaml
automation:
  - alias: "Holiday Greeting"
    trigger:
      - platform: state
        entity_id: binary_sensor.calendifier_holiday_today
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          message: "Happy {{ state_attr('sensor.calendifier_next_holiday', 'name') }}!"
```

### Event Reminders

```yaml
automation:
  - alias: "Event Reminder"
    trigger:
      - platform: time_pattern
        minutes: 0
    condition:
      - condition: numeric_state
        entity_id: sensor.calendifier_today_events
        above: 0
    action:
      - service: tts.speak
        data:
          message: "You have {{ states('sensor.calendifier_today_events') }} events today"
```

### Create Event from Automation

```yaml
automation:
  - alias: "Create Maintenance Event"
    trigger:
      - platform: state
        entity_id: sensor.system_temperature
        above: 80
    action:
      - service: calendifier.create_event
        data:
          title: "System Maintenance Required"
          description: "High temperature detected: {{ states('sensor.system_temperature') }}°C"
          start_date: "{{ now().strftime('%Y-%m-%d') }}"
          category: "reminder"
```

## 📊 Dashboard Integration

### Calendar Card

```yaml
type: custom:calendifier-calendar-card
entity: calendar.calendifier_calendar
title: "My Calendar"
view: month
```

### Event Summary Card

```yaml
type: entities
title: "Calendar Summary"
entities:
  - sensor.calendifier_next_event
  - sensor.calendifier_today_events
  - sensor.calendifier_next_holiday
  - binary_sensor.calendifier_holiday_today
```

### Clock Card

```yaml
type: custom:calendifier-clock-card
show_ntp_status: true
show_date: true
analog_clock: true
```

## 🔧 Troubleshooting

### Common Issues

1. **Add-on won't start:**
   - Check logs in Supervisor > Calendifier > Logs
   - Verify configuration syntax
   - Ensure port 8099 is available

2. **Integration not found:**
   - Restart Home Assistant after installing
   - Check custom_components directory permissions
   - Verify integration files are in correct location

3. **Holidays not showing:**
   - Check locale and holiday_country settings
   - Verify supported country list
   - Restart add-on after locale changes

4. **Web interface not accessible:**
   - Verify add-on is running
   - Check firewall settings
   - Try direct IP access

### Debug Mode

Enable debug logging:

```yaml
logger:
  default: info
  logs:
    custom_components.calendifier: debug
    calendifier_addon: debug
```

### Health Checks

Test API connectivity:

```bash
# Check add-on health
curl http://localhost:8099/api/v1/health

# Check calendar data
curl http://localhost:8099/api/v1/calendar/2025/1

# Check settings
curl http://localhost:8099/api/v1/settings
```

## 🔄 Updates and Maintenance

### Updating the Add-on

1. **Automatic Updates:**
   - Enable auto-updates in Supervisor settings
   - Updates will be applied automatically

2. **Manual Updates:**
   - Go to Supervisor > Calendifier
   - Click "Update" when available

### Updating the Integration

1. **HACS Updates:**
   - Updates appear in HACS dashboard
   - Click "Update" and restart Home Assistant

2. **Manual Updates:**
   - Replace files in custom_components/calendifier/
   - Restart Home Assistant

### Backup and Restore

**Backup:**
```bash
# Backup calendar data
curl http://localhost:8099/api/v1/export > calendar_backup.json

# Backup Home Assistant configuration
# (Includes integration settings)
```

**Restore:**
```bash
# Restore calendar data
curl -X POST -H "Content-Type: application/json" \
  -d @calendar_backup.json \
  http://localhost:8099/api/v1/import
```

## 📈 Performance Optimization

### Resource Usage

- **Memory:** ~100MB for add-on container
- **CPU:** Minimal (event-driven updates)
- **Storage:** ~50MB for application + data
- **Network:** WebSocket + periodic API calls

### Optimization Tips

1. **Reduce Update Frequency:**
   ```yaml
   scan_interval: 60  # Increase from default 30 seconds
   ```

2. **Limit Event History:**
   - Regularly export and archive old events
   - Keep active events under 1000 for best performance

3. **NTP Optimization:**
   ```yaml
   ntp_interval: 30  # Reduce sync frequency
   ```

## 🔒 Security Considerations

### Network Security

- Add-on runs on internal network only
- No external network access required
- WebSocket connections are local only

### Data Privacy

- All data stored locally in Home Assistant
- No external services or cloud dependencies
- Calendar data never leaves your network

### SSL Configuration

For HTTPS access:

```yaml
ssl: true
certfile: fullchain.pem
keyfile: privkey.pem
```

## 📚 Additional Resources

- **Integration Documentation:** [docs/home_assistant_integration.md](docs/home_assistant_integration.md)
- **API Documentation:** Available at `http://localhost:8099/docs` when add-on is running
- **GitHub Repository:** [https://github.com/oernster/calendifier](https://github.com/oernster/calendifier)
- **Home Assistant Community:** [Community Forum](https://community.home-assistant.io/)

## 🆘 Support

For issues and support:

1. **Check Logs:** Always check both add-on and integration logs
2. **GitHub Issues:** Report bugs and feature requests
3. **Community Forum:** Ask questions and share experiences
4. **Documentation:** Review this guide and API documentation

---

**Congratulations!** You now have a fully integrated Calendifier calendar system in Home Assistant with complete locale support, holiday awareness, and automation capabilities.