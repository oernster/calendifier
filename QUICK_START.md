# 🚀 Calendifier Home Assistant Integration - Quick Start Guide

## 📋 What You Get

A complete calendar system in Home Assistant with:
- 📅 Full calendar with events and holidays
- 🕐 Analog clock with NTP time sync
- 📝 Notes system
- 🌍 14 languages + locale-aware holidays
- 🎨 Dark/light themes
- 🤖 Home Assistant automation integration

## 🔍 First: Check Your Home Assistant Type

**Look at your sidebar** - do you see "Supervisor"?

### ✅ If you see "Supervisor" → You have Home Assistant OS
Follow the **Add-on Installation** method below.

### ❌ If you DON'T see "Supervisor" → You have Home Assistant Core/Container
Skip to **Standalone Installation** method below.

---

## 🏠 Home Assistant OS Installation (With Supervisor)

### Step 1: Install the Add-on

**Choose your preferred method to copy files:**

#### **Method A: File Editor Add-on (Easiest)**

1. **Install File Editor Add-on**
   - Go to **Supervisor > Add-on Store**
   - Search for "File editor"
   - Install and start it
   - Click "Open Web UI"

2. **Create Add-on Structure**
   - In File Editor, create folder: `addons/local/calendifier/`
   - Copy each file from the `homeassistant-addon/` folder manually
   - Create the following files in `/config/addons/local/calendifier/`:

   **config.yaml** (copy content from `homeassistant-addon/config.yaml`)
   **Dockerfile** (copy content from `homeassistant-addon/Dockerfile`)
   **README.md** (copy content from `homeassistant-addon/README.md`)
   **requirements.txt** (copy content from `homeassistant-addon/requirements.txt`)
   **build.yaml** (copy content from `homeassistant-addon/build.yaml`)

   And create these folders with their contents:
   - `rootfs/` (copy all contents from `homeassistant-addon/rootfs/`)
   - `calendifier_addon/` (copy all contents from `homeassistant-addon/calendifier_addon/`)
   - `web/` (copy all contents from `homeassistant-addon/web/`)

#### **Method B: SSH Add-on**

1. **Install SSH Add-on**
   - Go to **Supervisor > Add-on Store**
   - Search for "Terminal & SSH"
   - Install and start it
   - Set a password in the configuration

2. **SSH into Home Assistant**
   ```bash
   # From your computer's terminal:
   ssh root@your-home-assistant-ip
   # Enter the password you set
   ```

3. **Copy Add-on Files**
   ```bash
   # Create directory and copy files
   mkdir -p /config/addons/local/calendifier
   # Now copy the homeassistant-addon files here
   ```

#### **Method C: Samba Share**

1. **Install Samba Add-on**
   - Go to **Supervisor > Add-on Store**
   - Search for "Samba share"
   - Install and start it

2. **Access via Network**
   - On Windows: Open `\\your-home-assistant-ip\config`
   - On Mac: Open Finder > Go > Connect to Server > `smb://your-home-assistant-ip`
   - Copy the `homeassistant-addon` folder to `addons/local/calendifier/`

### Install the Add-on

3. **Install via Supervisor**
   - Go to **Home Assistant > Supervisor > Add-on Store**
   - Click **⋮** (three dots) > **Repositories**
   - Add: `file:///config/addons/local` (for local add-on)
   - Refresh the page
   - Find "Calendifier" and click **Install**

4. **Start the Add-on**
   - Click **Start**
   - Wait for it to show "Running"
   - Click **Open Web UI** to see the calendar

### Step 2: Install the Integration Files (Home Assistant OS)

**Use the same method you chose above to copy these files:**

1. **Copy Integration Files**
   Create this folder structure in `/config/custom_components/calendifier/`:
   ```
   /config/custom_components/calendifier/
   ├── __init__.py
   ├── manifest.json
   ├── config_flow.py
   ├── const.py
   ├── calendar.py
   ├── sensor.py
   ├── binary_sensor.py
   ├── services.yaml
   └── strings.json
   ```

2. **Copy each file** from the `custom_components/calendifier/` folder to your Home Assistant

---

## 💻 Standalone Installation (Home Assistant Core/Container - No Supervisor)

Since you don't have Supervisor, you'll run Calendifier as a standalone service and connect it to Home Assistant.

### Step 1: Access Your Server

**You need to SSH into the actual server/computer running Home Assistant:**

#### **Option A: SSH from another computer**
```bash
# From your laptop/desktop terminal:
ssh username@your-server-ip
# Example: ssh pi@192.168.1.100
# Enter your server password when prompted
```

#### **Option B: Direct access (Recommended if SSH fails)**
If you have physical access to the server, open a terminal directly on it.

#### **Option C: Enable SSH (Recommended - fixes "Connection refused")**
Since you got "Connection refused", SSH is not enabled. Here's how to enable it:

**For Raspberry Pi (your setup) - Multiple methods:**

**Method 1: Using SD card (easiest if you can access the Pi's SD card):**
1. **Shut down your Raspberry Pi safely**
2. **Remove SD card and put it in your computer**
3. **Open the "boot" partition** (should appear as a drive)
4. **Create empty file named `ssh`** (no extension) in the boot partition
5. **Put SD card back in Pi and boot up**
6. **SSH should now work:** `ssh pi@192.168.0.172` (default user is usually `pi`)

**Method 2: Physical access (if you have keyboard/monitor):**
1. Connect keyboard/monitor to your Pi
2. Open terminal and run: `sudo systemctl enable ssh && sudo systemctl start ssh`

**Method 3: If you have VNC enabled:**
1. Connect via VNC viewer to your Pi
2. Open terminal and run: `sudo systemctl enable ssh && sudo systemctl start ssh`

**Note:** You cannot enable SSH through Home Assistant web UI when running Core/Container - you need physical access or SD card access.

**For Windows:**
1. Open Command Prompt as Administrator
2. Enable SSH: `dism /online /enable-feature /featurename:OpenSSH.Server`
3. Start service: `net start sshd`

**For Ubuntu/Debian:**
1. Connect to server directly
2. Install SSH: `sudo apt update && sudo apt install openssh-server`
3. Enable SSH: `sudo systemctl enable ssh && sudo systemctl start ssh`

#### **Option D: Windows PowerShell/Command Prompt (If HA runs on Windows)**
Since you can't install terminal add-ons without Supervisor, use Windows built-in terminal:

1. **Open PowerShell as Administrator** (Right-click Start → "Windows PowerShell (Admin)")
2. **Navigate to where Home Assistant is installed**
3. **Run commands directly on Windows**

#### **Option E: Alternative - Use existing terminal**
If SSH won't work, you can run commands directly where Home Assistant is installed:
- **Docker**: `docker exec -it homeassistant bash`
- **Python venv**: Activate the environment where HA is installed
- **Direct install**: Use the terminal on the server itself

#### **Option F: Simplified Windows Installation**
**If Home Assistant runs on the same Windows machine:**

1. **Open PowerShell as Administrator**
2. **Install Python packages globally:**
   ```powershell
   pip install fastapi uvicorn python-multipart holidays babel pytz requests
   ```
3. **Create Calendifier folder:**
   ```powershell
   mkdir C:\calendifier
   cd C:\calendifier
   ```
4. **Copy files to this folder** (manually or using copy commands)
5. **Run Calendifier:**
   ```powershell
   python api_server.py
   ```

### Step 2: Install Python Dependencies

**Once connected to your server:**

```bash
# Install required Python packages
pip install fastapi uvicorn python-multipart holidays babel pytz requests

# Or if using a virtual environment (common with Home Assistant Core):
source /path/to/your/venv/bin/activate
pip install fastapi uvicorn python-multipart holidays babel pytz requests

# If pip doesn't work, try:
pip3 install fastapi uvicorn python-multipart holidays babel pytz requests
```

### Step 3: Copy Calendifier Service Files

1. **Create Calendifier directory**
   ```bash
   # Create directory for Calendifier
   mkdir -p /opt/calendifier
   cd /opt/calendifier
   ```

2. **Copy service files**
   Copy these files from the project to `/opt/calendifier/`:
   - All files from `homeassistant-addon/calendifier_addon/` → `/opt/calendifier/`
   - All files from `homeassistant-addon/web/` → `/opt/calendifier/web/`

### Step 4: Create Systemd Service

1. **Create service file**
   ```bash
   sudo nano /etc/systemd/system/calendifier.service
   ```

2. **Add service configuration**
   ```ini
   [Unit]
   Description=Calendifier Calendar Service
   After=network.target

   [Service]
   Type=simple
   User=homeassistant
   WorkingDirectory=/opt/calendifier
   ExecStart=/usr/bin/python3 api_server.py
   Restart=always
   RestartSec=10
   Environment=HOST=0.0.0.0
   Environment=PORT=8099

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable calendifier
   sudo systemctl start calendifier
   sudo systemctl status calendifier
   ```

### Step 5: Install the Integration Files (Core/Container)

1. **Copy Integration Files to Home Assistant**
   
   **Find your Home Assistant config directory:**
   - **Docker**: Usually `/path/to/config` or mounted volume
   - **Python venv**: Usually `~/.homeassistant` or `/home/homeassistant/.homeassistant`
   - **Manual install**: Where you installed Home Assistant

   **Copy files:**
   ```bash
   # Create the custom components directory
   mkdir -p /path/to/your/homeassistant/config/custom_components/calendifier
   
   # Copy all integration files
   cp custom_components/calendifier/* /path/to/your/homeassistant/config/custom_components/calendifier/
   ```

2. **Verify files are in place:**
   ```
   /config/custom_components/calendifier/
   ├── __init__.py
   ├── manifest.json
   ├── config_flow.py
   ├── const.py
   ├── calendar.py
   ├── sensor.py
   ├── binary_sensor.py
   ├── services.yaml
   └── strings.json
   ```

---

## 🔄 Final Steps (Both Installation Types)

### Step 6: Restart Home Assistant

**IMPORTANT**: You must restart Home Assistant for the integration to be recognized!

1. Go to **Settings > System > Restart**
2. Wait for Home Assistant to fully restart (this may take a few minutes)
3. Log back in

### Step 7: Add the Integration

**Now** the integration will appear in the search:

1. Go to **Settings > Devices & Services**
2. Click **+ Add Integration**
3. Search for "Calendifier" (it should now appear!)
4. Click on "Calendifier" when it appears
5. Enter the connection details:
   - **Host**: `localhost` (or your server IP if running elsewhere)
   - **Port**: `8099`
   - **SSL**: `false` (uncheck the box)
6. Click **Submit**

If successful, you'll see "Calendifier" appear in your integrations list!

## 🔧 Troubleshooting Installation

### "I don't see Supervisor"
**You have Home Assistant Core/Container** - Use the **Standalone Installation** method above instead of the Add-on method.

### "Can't access command line" (Home Assistant OS)
**Solutions**:
- **Easiest**: Use File Editor add-on
- **Network**: Use Samba share add-on
- **SSH**: Install Terminal & SSH add-on

### "Calendifier not found in search"
**Cause**: Integration files not installed or Home Assistant not restarted

**Solution**:
1. Check files are in `/config/custom_components/calendifier/`
2. Restart Home Assistant completely
3. Wait 2-3 minutes after restart before searching

### "Cannot connect to Calendifier"
**Home Assistant OS**: Check add-on is running in Supervisor
**Core/Container**: Check service status:
```bash
sudo systemctl status calendifier
# If not running:
sudo systemctl start calendifier
```

### "Service won't start" (Core/Container)
**Check logs:**
```bash
sudo journalctl -u calendifier -f
```
**Common fixes:**
- Install missing Python packages: `pip install fastapi uvicorn python-multipart holidays babel pytz requests`
- Check file permissions: `sudo chown -R homeassistant:homeassistant /opt/calendifier`
- Verify Python path in service file

### "Add-on not appearing" (Home Assistant OS)
**Cause**: Files not in correct location

**Solution**:
1. Check files are in `/config/addons/local/calendifier/`
2. Go to Supervisor > Add-on Store > ⋮ > Repositories
3. Make sure `file:///config/addons/local` is added
4. Refresh the page

## 🎯 Basic Usage

### Creating Events
1. Open the web interface (Supervisor > Calendifier > "Open Web UI")
2. Click **+ Event** or double-click a date
3. Fill in event details
4. Click **Save Event**

### Changing Language
1. Use the language dropdown in the top-right of the web interface
2. Or go to Settings in the web interface
3. Select your language and country for holidays

### Home Assistant Integration
After successful setup, you'll automatically get these entities:
- `calendar.calendifier_calendar` - Main calendar
- `sensor.calendifier_next_event` - Next upcoming event
- `sensor.calendifier_next_holiday` - Next holiday (in your language!)
- `binary_sensor.calendifier_holiday_today` - Is today a holiday?

## 🤖 Simple Automation Example

```yaml
# Get notified of today's events every morning
automation:
  - alias: "Morning Calendar Briefing"
    trigger:
      - platform: time
        at: "08:00:00"
    condition:
      - condition: numeric_state
        entity_id: sensor.calendifier_today_events
        above: 0
    action:
      - service: notify.mobile_app_your_phone
        data:
          message: "Good morning! You have {{ states('sensor.calendifier_today_events') }} events today."
```

## 🌍 Language & Holiday Setup

The system automatically detects your Home Assistant language and shows holidays for your country. 

**Supported Languages:**
🇺🇸 English (US), 🇬🇧 English (UK), 🇪🇸 Spanish, 🇫🇷 French, 🇩🇪 German, 🇮🇹 Italian, 🇧🇷 Portuguese, 🇷🇺 Russian, 🇨🇳 Chinese, 🇹🇼 Traditional Chinese, 🇯🇵 Japanese, 🇰🇷 Korean, 🇮🇳 Hindi, 🇸🇦 Arabic

## 📱 Dashboard Setup

Add to your Home Assistant dashboard:

```yaml
# Calendar card
type: calendar
entity: calendar.calendifier_calendar

# Event summary
type: entities
title: "Calendar Summary"
entities:
  - sensor.calendifier_next_event
  - sensor.calendifier_today_events
  - sensor.calendifier_next_holiday
  - binary_sensor.calendifier_holiday_today
```

## 🔍 Verification Steps

After installation, verify everything works:

1. **Add-on Running**: Supervisor > Calendifier shows "Running"
2. **Web Interface**: "Open Web UI" shows the calendar
3. **Integration Active**: Settings > Devices & Services shows "Calendifier"
4. **Entities Created**: Developer Tools > States shows calendifier entities

## 📚 More Help

- **Full Documentation**: See `DEPLOYMENT_GUIDE.md` for complete instructions
- **Integration Plan**: See `docs/home_assistant_integration.md` for technical details
- **API Docs**: Available at `http://localhost:8099/docs` when running

## 🎉 That's It!

You now have a complete calendar system integrated with Home Assistant that:
- Shows holidays in your language
- Syncs time with NTP
- Provides automation entities
- Works on all devices
- Supports 14 languages and countries

Enjoy your new calendar system! 📅✨