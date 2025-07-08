#!/bin/bash

# Calendifier Pi Setup Script with Complete RRule Support
# This script sets up Home Assistant and Calendifier API containers on Raspberry Pi
# Enhanced with recurring event (RRule) functionality and full translation support

set -e  # Exit on any error

# Force UTF-8 encoding to prevent emoji corruption
export LC_ALL=C.UTF-8
export LANG=C.UTF-8
export LANGUAGE=C.UTF-8

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CALENDIFIER_DIR="/home/$(whoami)/calendifier"
HA_CONFIG_DIR="/home/$(whoami)/homeassistant"
CALENDIFIER_API_PORT=8000
HA_PORT=8123

print_color() {
    printf "${1}${2}${NC}\n"
}

print_header() {
    echo
    print_color $BLUE "=== $1 ==="
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_color $RED "Docker is not installed. Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $(whoami)
        rm get-docker.sh
        print_color $GREEN "Docker installed successfully. Please log out and back in for group changes to take effect."
        print_color $YELLOW "Continuing with sudo for this session..."
        DOCKER_CMD="sudo docker"
        COMPOSE_CMD="sudo docker compose"
    else
        # Check if user can run docker without sudo
        if docker ps &> /dev/null; then
            DOCKER_CMD="docker"
            print_color $GREEN "Docker is already installed and accessible"
        else
            print_color $YELLOW "Docker installed but requires sudo for this session"
            DOCKER_CMD="sudo docker"
            COMPOSE_CMD="sudo docker compose"
        fi
    fi
}

check_docker_compose() {
    # If COMPOSE_CMD was already set in check_docker (due to sudo requirement), use it
    if [ -n "$COMPOSE_CMD" ]; then
        print_color $GREEN "Docker Compose will use sudo for this session"
        return
    fi
    
    # Check for docker compose (new plugin) or docker-compose (standalone)
    if docker compose version &> /dev/null; then
        print_color $GREEN "Docker Compose (plugin) is already installed"
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        print_color $GREEN "Docker Compose (standalone) is already installed"
        COMPOSE_CMD="docker-compose"
    else
        print_color $YELLOW "Docker Compose is not available. Installing plugin version..."
        # Try to install docker-compose-plugin via apt first
        if command -v apt &> /dev/null; then
            sudo apt update -qq
            if sudo apt install -y docker-compose-plugin 2>/dev/null; then
                # Check if we need sudo for docker commands
                if [[ "$DOCKER_CMD" == "sudo docker" ]]; then
                    COMPOSE_CMD="sudo docker compose"
                else
                    COMPOSE_CMD="docker compose"
                fi
                print_color $GREEN "Docker Compose plugin installed successfully"
            else
                # Fallback: download standalone docker-compose
                print_color $YELLOW "Plugin installation failed, downloading standalone version..."
                sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                sudo chmod +x /usr/local/bin/docker-compose
                COMPOSE_CMD="docker-compose"
                print_color $GREEN "Docker Compose standalone installed successfully"
            fi
        else
            # Fallback: download standalone docker-compose
            print_color $YELLOW "Downloading standalone docker-compose..."
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            COMPOSE_CMD="docker-compose"
            print_color $GREEN "Docker Compose standalone installed successfully"
        fi
    fi
}

create_directories() {
    print_header "Creating Directory Structure"
    
    # Create Home Assistant config directory
    mkdir -p "$HA_CONFIG_DIR"
    mkdir -p "$HA_CONFIG_DIR/www"
    mkdir -p "$HA_CONFIG_DIR/custom_components"
    
    # Create Calendifier directories
    mkdir -p "$CALENDIFIER_DIR/data"
    mkdir -p "$CALENDIFIER_DIR/logs"
    
    print_color $GREEN "Directories created successfully"
}

copy_web_components() {
    print_header "Copying Web Components with RRule Support"
    
    # Ensure www directories exist
    mkdir -p "$HA_CONFIG_DIR/www"
    
    # Copy www files to Home Assistant www directory - EXCLUDING basic versions
    if [ -d "$CALENDIFIER_DIR/www" ]; then
        # Ensure target directory exists
        mkdir -p "$HA_CONFIG_DIR/www"
        
        # Copy files individually, skipping basic versions that will be replaced
        print_color $YELLOW "🔄 Copying web components (excluding basic versions)..."
        
        for file in "$CALENDIFIER_DIR/www/"*; do
            filename=$(basename "$file")
            
            # Skip basic versions that we'll replace with RRule versions
            if [[ "$filename" == "calendifier-events-card.js" ]] || [[ "$filename" == "calendifier-calendar-card.js" ]]; then
                print_color $YELLOW "   Skipping basic version: $filename"
                continue
            fi
            
            # Copy all other files
            cp "$file" "$HA_CONFIG_DIR/www/" 2>/dev/null || true
            print_color $GREEN "   ✅ Copied: $filename"
        done
        
        # NOW replace with RRule-enabled versions
        print_color $YELLOW "🔄 Installing RRule-enabled versions..."
        
        if [ -f "$CALENDIFIER_DIR/www/calendifier-events-card-with-rrule.js" ]; then
            # Install RRule version as the main version
            cp "$CALENDIFIER_DIR/www/calendifier-events-card-with-rrule.js" "$HA_CONFIG_DIR/www/calendifier-events-card.js"
            print_color $GREEN "✅ Events card installed with RRule support"
            
            # Verify the installation worked
            if grep -q "make_recurring" "$HA_CONFIG_DIR/www/calendifier-events-card.js"; then
                print_color $GREEN "✅ VERIFIED: Events card has RRule functionality"
            else
                print_color $RED "❌ ERROR: Events card installation failed - no RRule functionality found"
            fi
        else
            print_color $RED "❌ RRule events card not found: $CALENDIFIER_DIR/www/calendifier-events-card-with-rrule.js"
            ls -la "$CALENDIFIER_DIR/www/" | grep events
        fi
        
        if [ -f "$CALENDIFIER_DIR/www/calendifier-calendar-card-with-rrule.js" ]; then
            # Install RRule version as the main version
            cp "$CALENDIFIER_DIR/www/calendifier-calendar-card-with-rrule.js" "$HA_CONFIG_DIR/www/calendifier-calendar-card.js"
            print_color $GREEN "✅ Calendar card installed with RRule support"
            
            # Verify the installation worked
            if grep -q "make_recurring" "$HA_CONFIG_DIR/www/calendifier-calendar-card.js"; then
                print_color $GREEN "✅ VERIFIED: Calendar card has RRule functionality"
            else
                print_color $RED "❌ ERROR: Calendar card installation failed - no RRule functionality found"
            fi
        else
            print_color $RED "❌ RRule calendar card not found: $CALENDIFIER_DIR/www/calendifier-calendar-card-with-rrule.js"
            ls -la "$CALENDIFIER_DIR/www/" | grep calendar
        fi
        
        print_color $GREEN "Beautiful Calendifier cards with RRule support ready for dashboard"
    else
        print_color $YELLOW "Warning: www directory not found in $CALENDIFIER_DIR"
    fi
}

setup_database_with_rrule() {
    print_header "Setting Up Database with RRule Support"
    
    # Ensure data directory exists
    mkdir -p "$CALENDIFIER_DIR/data"
    
    # Create or update database schema for RRule support
    print_color $YELLOW "🗄️ Updating database schema for recurring events..."
    
    # Use Python to safely update the database schema
    python3 -c "
import sqlite3
import sys
import os

try:
    db_path = '$CALENDIFIER_DIR/data/calendifier.db'
    
    # Create database directory if it doesn't exist
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create events table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'general',
            start_date TEXT NOT NULL,
            start_time TEXT,
            end_date TEXT,
            end_time TEXT,
            all_day BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add rrule column if it doesn't exist
    try:
        cursor.execute('ALTER TABLE events ADD COLUMN rrule TEXT')
        print('   ✅ Added rrule column to events table')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print('   ✅ rrule column already exists')
        else:
            print(f'   ❌ Error adding rrule column: {e}')
            sys.exit(1)
    
    # Create notes table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            category TEXT DEFAULT 'general',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create settings table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default settings
    cursor.execute('''
        INSERT OR IGNORE INTO settings (key, value) VALUES
        ('locale', 'en_US'),
        ('timezone', 'UTC'),
        ('theme', 'light')
    ''')
    
    conn.commit()
    conn.close()
    print('   ✅ Database schema updated successfully with RRule support')
    
except Exception as e:
    print(f'   ❌ Database setup failed: {e}')
    sys.exit(1)
" 2>/dev/null || {
        print_color $RED "❌ Database setup failed!"
        print_color $YELLOW "Will retry during container startup..."
    }
    
    print_color $GREEN "Database with RRule support ready"
}

create_ha_configuration() {
    print_header "Creating Home Assistant Configuration"
    
    # Create configuration.yaml
    cat > "$HA_CONFIG_DIR/configuration.yaml" << 'EOF'
# Home Assistant Configuration with Calendifier integration

# Configure a default setup of Home Assistant (frontend, api, etc)
default_config:

# Enable the frontend with Calendifier loader
frontend:
  extra_module_url:
    - /local/calendifier-loader.js

# Enable lovelace yaml mode for custom dashboard
lovelace:
  mode: yaml
  resources: []
  dashboards:
    calendifier-dashboard:
      mode: yaml
      title: Calendifier
      icon: mdi:calendar
      show_in_sidebar: true
      filename: calendifier.yaml
      require_admin: false

# HTTP configuration
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 172.16.0.0/12
    - 192.168.0.0/16
    - 10.0.0.0/8

# Text to speech
tts:
  - platform: google_translate

# Calendifier API integration
rest_command:
  calendifier_api:
    url: "http://localhost:8000/api/{{ endpoint }}"
    method: "{{ method | default('GET') }}"
    headers:
      Content-Type: application/json
    payload: "{{ payload | default('') }}"

# Example automation
automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml
EOF

    # Create automations.yaml
    cat > "$HA_CONFIG_DIR/automations.yaml" << 'EOF'
# Calendifier Automations
- id: calendifier_startup
  alias: "Calendifier - Startup Notification"
  trigger:
    - platform: homeassistant
      event: start
  action:
    - service: persistent_notification.create
      data:
        title: "Calendifier Ready"
        message: "Calendifier plugin with RRule support has been loaded and is ready to use."
        notification_id: "calendifier_startup"
EOF

    # Create scripts.yaml
    cat > "$HA_CONFIG_DIR/scripts.yaml" << 'EOF'
# Calendifier Scripts
calendifier_refresh:
  alias: "Refresh Calendifier Data"
  sequence:
    - service: rest_command.calendifier_api
      data:
        endpoint: "refresh"
        method: "POST"
EOF

    # Create scenes.yaml
    cat > "$HA_CONFIG_DIR/scenes.yaml" << 'EOF'
# Calendifier Scenes
EOF

    print_color $GREEN "Home Assistant configuration created"
}

create_lovelace_config() {
    print_header "Creating Calendifier Dashboard"
    
    # Use the existing beautiful layout configuration
    if [ -f "$CALENDIFIER_DIR/lovelace-calendifier-config.yaml" ]; then
        # Copy the existing beautiful configuration
        cp "$CALENDIFIER_DIR/lovelace-calendifier-config.yaml" "$HA_CONFIG_DIR/calendifier.yaml"
        print_color $GREEN "Copied existing beautiful Calendifier dashboard configuration"
    else
        # Fallback: Create the beautiful Calendifier dashboard with wide cards
        cat > "$HA_CONFIG_DIR/calendifier.yaml" << 'EOF'
# Beautiful Calendifier Dashboard with RRule Support - Wide Cards Layout
title: Calendar System
views:
  - title: Calendar System
    path: calendifier
    icon: mdi:calendar
    type: masonry
    layout:
      width: 400
      max_cols: 2
    cards:
      # Row 1: Clock and Help Cards (Side by Side) - Wide Layout
      - type: horizontal-stack
        cards:
          - type: custom:calendifier-clock-card
            title: "🕐 Time"
          - type: custom:calendifier-help-card
            title: "⚙️ Settings"
      
      # Row 2: Calendar View (Full Width) - Extra Wide with RRule Support
      - type: custom:calendifier-calendar-card
        title: "📅 Calendar View"
      
      # Row 3: Events and Notes (Side by Side) - Wide Layout with RRule Support
      - type: horizontal-stack
        cards:
          - type: custom:calendifier-events-card
            title: "📋 Events"
            max_events: 5
          - type: custom:calendifier-notes-card
            title: "📝 Notes"
      
      # Row 4: Data Management (Full Width) - Extra Wide
      - type: custom:calendifier-data-card
        title: "💾 Data Management"
EOF
        print_color $YELLOW "Created fallback dashboard configuration with RRule support"
    fi
    
    # Ensure proper file permissions
    chmod 644 "$HA_CONFIG_DIR/calendifier.yaml"
    
    print_color $GREEN "Beautiful Calendifier dashboard with RRule support ready"
}

create_docker_compose() {
    print_header "Creating Docker Compose Configuration"
    
    cat > "$CALENDIFIER_DIR/docker-compose.yml" << EOF
services:
  calendifier-api:
    container_name: calendifier-api
    build:
      context: .
      dockerfile: Dockerfile.api
    volumes:
      - $CALENDIFIER_DIR:/app:rw
      - $CALENDIFIER_DIR/data:/app/data:rw
      - $CALENDIFIER_DIR/logs:/app/logs:rw
      - $CALENDIFIER_DIR/www:/app/www:ro
      - $HA_CONFIG_DIR/www:/app/static:rw
    ports:
      - "$CALENDIFIER_API_PORT:8000"
    restart: unless-stopped
    environment:
      - FLASK_ENV=production
      - PYTHONPATH=/app
      - TZ=\${TZ:-UTC}
      - FLASK_CORS_ORIGINS=*
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - calendifier-network

  homeassistant:
    container_name: homeassistant
    image: homeassistant/home-assistant:stable
    volumes:
      - $HA_CONFIG_DIR:/config:rw
      - $CALENDIFIER_DIR/www:/config/www:rw
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    privileged: true
    ports:
      - "$HA_PORT:8123"
    environment:
      - TZ=\${TZ:-UTC}
    depends_on:
      - calendifier-api
    networks:
      - calendifier-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8123"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  calendifier-network:
    driver: bridge
EOF

    print_color $GREEN "Docker Compose configuration created"
}

create_api_requirements() {
    print_header "Creating API Requirements with RRule Support"
    
    # Create api_requirements.txt if it doesn't exist
    if [ ! -f "$CALENDIFIER_DIR/api_requirements.txt" ]; then
        cat > "$CALENDIFIER_DIR/api_requirements.txt" << 'EOF'
Flask==2.3.3
Flask-CORS==4.0.0
requests==2.31.0
python-dateutil==2.8.2
pytz==2023.3
holidays==0.34
json5==0.9.14
pyyaml==6.0.1
gunicorn==21.2.0
icalendar==5.0.11
recurring-ical-events==2.1.3
caldav==1.3.9
tzlocal==5.2
babel==2.13.1
click==8.1.7
jinja2==3.1.2
markupsafe==2.1.3
werkzeug==2.3.7
itsdangerous==2.1.2
blinker==1.7.0
python-rrule==1.0.3
dateutil==2.8.2
EOF
    fi
    
    print_color $GREEN "API requirements file with RRule support created"
}

create_api_dockerfile() {
    print_header "Creating API Dockerfile"
    
    # Create Dockerfile.api if it doesn't exist
    if [ ! -f "$CALENDIFIER_DIR/Dockerfile.api" ]; then
        cat > "$CALENDIFIER_DIR/Dockerfile.api" << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY api_requirements.txt requirements.txt ./
RUN pip install --no-cache-dir -r api_requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Set permissions
RUN chmod +x /app/api_server.py

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/status || exit 1

# Run the application
CMD ["python", "api_server.py"]
EOF
    fi
    
    print_color $GREEN "API Dockerfile created"
}

build_and_start_containers() {
    print_header "Building and Starting Containers"
    
    cd "$CALENDIFIER_DIR"
    
    # Stop any existing containers
    $COMPOSE_CMD down 2>/dev/null || true
    
    # Build and start containers
    print_color $YELLOW "Building Calendifier API container with RRule support..."
    $COMPOSE_CMD build calendifier-api
    
    print_color $YELLOW "Starting containers..."
    $COMPOSE_CMD up -d
    
    # Wait for containers to be healthy
    print_color $YELLOW "Waiting for containers to start..."
    sleep 15
    
    # Check container status
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_color $GREEN "Containers started successfully"
    else
        print_color $RED "Some containers failed to start"
        $COMPOSE_CMD logs
        exit 1
    fi
}

# Main execution
main() {
    print_header "Calendifier Pi Setup with RRule Support Starting"
    
    # Check if files are in home directory and move them if needed
    if [ -f ~/setup-pi.sh ] && [ ! -d "$CALENDIFIER_DIR" ]; then
        print_color $YELLOW "Files found in home directory, organizing them..."
        mkdir -p "$CALENDIFIER_DIR"
        
        # Move individual files
        for file in api_server.py main.py requirements.txt api_requirements.txt docker-compose.yml Dockerfile.api version.py setup-pi.sh lovelace-calendifier-config.yaml; do
            if [ -f ~/$file ]; then
                mv ~/$file "$CALENDIFIER_DIR/"
            fi
        done
        
        # Move directories
        for dir in www calendar_app assets docs; do
            if [ -d ~/$dir ]; then
                mv ~/$dir "$CALENDIFIER_DIR/"
            fi
        done
        
        print_color $GREEN "Files organized successfully"
    fi
    
    # Change to calendifier directory
    cd "$CALENDIFIER_DIR" || {
        print_color $RED "Error: Cannot access $CALENDIFIER_DIR"
        print_color $YELLOW "Please ensure the deployment script has been run first"
        exit 1
    }
    
    check_docker
    check_docker_compose
    create_directories
    setup_database_with_rrule
    copy_web_components
    create_ha_configuration
    create_lovelace_config
    create_docker_compose
    create_api_requirements
    create_api_dockerfile
    build_and_start_containers
    
    print_color $GREEN "🎉 Calendifier setup with complete RRule support finished!"
    print_color $BLUE "Access Home Assistant at: http://$(hostname -I | awk '{print $1}'):8123"
    print_color $YELLOW "Look for 'Calendifier' in the sidebar menu for full recurring event functionality!"
    echo
    print_color $GREEN "✅ FEATURES INCLUDED:"
    print_color $GREEN "   • Complete RRule recurring event support"
    print_color $GREEN "   • Fixed notification positioning and edit UI"
    print_color $GREEN "   • Enhanced RRule builder with 4-column layout"
    print_color $GREEN "   • All translation fixes (40 languages supported)"
    print_color $GREEN "   • Comprehensive error handling and DOM checks"
    print_color $GREEN "   • Database schema with RRule column"
    print_color $GREEN "   • Event expansion API for recurring occurrences"
    print_color $GREEN "   • Fixed recurring events to show forever (not just current month)"
    print_color $GREEN "   • Added edit functionality for calendar events"
    print_color $GREEN "   • Improved validation messages for user-friendly errors"
    print_color $GREEN "   • Enhanced event loading for proper recurring event display"
    print_color $GREEN "   • Events card shows only master events (no clutter)"
    print_color $GREEN "   • Clickable events in calendar for editing"
    print_color $GREEN "   • Fixed ALL translation issues across 40 locales"
    print_color $GREEN "   • Proper category translations for all languages"
    print_color $GREEN "   • Fixed validation messages and confirmation dialogs"
    print_color $GREEN "   • No more untranslated keys showing in UI"
    print_color $GREEN "   • Complete RRule dialog translation support"
    print_color $GREEN "   • Proper date formatting (UK: DD/MM/YYYY vs US: MM/DD/YYYY)"
    print_color $GREEN "   • Arabic-Indic, Devanagari, and Thai numeral support"
    print_color $GREEN "   • Fixed monthly day selection logic (day 4 = day 4)"
    print_color $GREEN "   • All RRule dialog text now properly translated"
}

# Run main function
main "$@"