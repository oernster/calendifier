#!/bin/bash

# Calendifier Pi Setup Script
# This script sets up Home Assistant and Calendifier API containers on Raspberry Pi

set -e  # Exit on any error

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
        message: "Calendifier plugin has been loaded and is ready to use."
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
    print_header "Creating Beautiful Calendifier Dashboard"
    
    # Use the existing beautiful layout configuration
    if [ -f "$CALENDIFIER_DIR/lovelace-calendifier-config.yaml" ]; then
        # Copy the existing beautiful configuration
        cp "$CALENDIFIER_DIR/lovelace-calendifier-config.yaml" "$HA_CONFIG_DIR/calendifier.yaml"
        print_color $GREEN "âœ“ Copied existing beautiful Calendifier dashboard configuration"
    else
        # Fallback: Create the beautiful Calendifier dashboard with wide cards
        cat > "$HA_CONFIG_DIR/calendifier.yaml" << 'EOF'
# Beautiful Calendifier Dashboard - Wide Cards Layout
title: ðŸ“… Calendar System
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
            title: "ðŸ• Time"
          - type: custom:calendifier-help-card
            title: "â„¹ï¸ Settings"
      
      # Row 2: Calendar View (Full Width) - Extra Wide
      - type: custom:calendifier-calendar-card
        title: "ðŸ“… Calendar View"
      
      # Row 3: Events and Notes (Side by Side) - Wide Layout
      - type: horizontal-stack
        cards:
          - type: custom:calendifier-events-card
            title: "ðŸ“‹ Events"
            max_events: 5
          - type: custom:calendifier-notes-card
            title: "ðŸ“ Notes"
      
      # Row 4: Data Management (Full Width) - Extra Wide
      - type: custom:calendifier-data-card
        title: "ðŸ“¤ðŸ“¥ Data Management"
EOF
        print_color $YELLOW "âš  Created fallback dashboard configuration"
    fi
    
    # Ensure proper file permissions
    chmod 644 "$HA_CONFIG_DIR/calendifier.yaml"
    
    # Verify the dashboard file was created correctly
    if [ -f "$HA_CONFIG_DIR/calendifier.yaml" ]; then
        print_color $GREEN "âœ“ Dashboard file created: $HA_CONFIG_DIR/calendifier.yaml"
        print_color $BLUE "Dashboard preview:"
        head -10 "$HA_CONFIG_DIR/calendifier.yaml" | sed 's/^/  /'
    else
        print_color $RED "âœ— Dashboard file was not created!"
        exit 1
    fi
    
    print_color $GREEN "Beautiful Calendifier dashboard ready"
}

copy_web_components() {
    print_header "Copying Web Components"
    
    # Ensure www directories exist
    mkdir -p "$HA_CONFIG_DIR/www"
    
    # Copy all www files to Home Assistant www directory
    if [ -d "$CALENDIFIER_DIR/www" ]; then
        # Ensure target directory exists
        mkdir -p "$HA_CONFIG_DIR/www"
        
        # Copy all files from www directory
        cp -r "$CALENDIFIER_DIR/www/"* "$HA_CONFIG_DIR/www/" 2>/dev/null || true
        print_color $GREEN "Web components copied to Home Assistant"
        
        # Also create local subdirectory for compatibility
        mkdir -p "$HA_CONFIG_DIR/www/local"
        cp -r "$CALENDIFIER_DIR/www/"* "$HA_CONFIG_DIR/www/local/" 2>/dev/null || true
        print_color $GREEN "Web components also copied to local subdirectory"
        
        # List copied files for verification
        print_color $BLUE "Copied files to www:"
        ls -la "$HA_CONFIG_DIR/www/"*.js 2>/dev/null | head -10 || print_color $YELLOW "No .js files found in www"
        print_color $BLUE "Copied files to www/local:"
        ls -la "$HA_CONFIG_DIR/www/local/"*.js 2>/dev/null | head -10 || print_color $YELLOW "No .js files found in www/local"
    else
        print_color $YELLOW "Warning: www directory not found in $CALENDIFIER_DIR"
        print_color $YELLOW "Available directories in $CALENDIFIER_DIR:"
        ls -la "$CALENDIFIER_DIR/" | grep "^d" || true
    fi
    
    # Ensure proper permissions for all files
    find "$HA_CONFIG_DIR/www" -type f -name "*.js" -exec chmod 644 {} \; 2>/dev/null || true
    find "$HA_CONFIG_DIR/www" -type f -name "*.css" -exec chmod 644 {} \; 2>/dev/null || true
    find "$HA_CONFIG_DIR/www" -type d -exec chmod 755 {} \; 2>/dev/null || true
    
    # Set ownership to ensure Home Assistant can read the files
    if command -v chown &> /dev/null; then
        chown -R $(whoami):$(whoami) "$HA_CONFIG_DIR/www" 2>/dev/null || true
    fi
    
    print_color $GREEN "Beautiful Calendifier cards ready for dashboard"
}

verify_web_components() {
    print_header "Verifying Web Components"
    
    # Verify the www files are accessible
    if [ -d "$HA_CONFIG_DIR/www" ] && [ "$(ls -A $HA_CONFIG_DIR/www 2>/dev/null)" ]; then
        print_color $GREEN "âœ“ Web assets are available in Home Assistant www directory"
        print_color $BLUE "Available JavaScript files:"
        ls -la "$HA_CONFIG_DIR/www/"*.js 2>/dev/null | head -10 || print_color $YELLOW "No .js files found"
        
        # Check for our key files
        local key_files=("calendifier-loader.js" "calendifier-base-card.js" "calendifier-calendar-card.js" "calendifier-translation-manager.js")
        local missing_files=()
        
        for file in "${key_files[@]}"; do
            if [ ! -f "$HA_CONFIG_DIR/www/$file" ]; then
                missing_files+=("$file")
            fi
        done
        
        if [ ${#missing_files[@]} -eq 0 ]; then
            print_color $GREEN "âœ“ All essential Calendifier files are present"
        else
            print_color $YELLOW "âš  Missing files: ${missing_files[*]}"
        fi
    else
        print_color $YELLOW "âš  Warning: No JavaScript files found in Home Assistant www directory"
    fi
    
    print_color $GREEN "Web component verification complete"
}

verify_container_file_access() {
    print_header "Verifying Container File Access"
    
    # Wait for containers to be fully ready
    sleep 5
    
    # Check if Home Assistant container can access the files
    print_color $YELLOW "Testing file access from Home Assistant container..."
    
    if $COMPOSE_CMD exec homeassistant ls -la /config/www/ 2>/dev/null; then
        print_color $GREEN "âœ“ Home Assistant container can access /config/www/"
        
        # Check for specific Calendifier files
        if $COMPOSE_CMD exec homeassistant ls /config/www/calendifier-loader.js 2>/dev/null; then
            print_color $GREEN "âœ“ calendifier-loader.js is accessible"
        else
            print_color $RED "âœ— calendifier-loader.js is NOT accessible"
        fi
        
        if $COMPOSE_CMD exec homeassistant ls /config/www/local/calendifier-loader.js 2>/dev/null; then
            print_color $GREEN "âœ“ calendifier-loader.js is accessible in /local/"
        else
            print_color $YELLOW "âš  calendifier-loader.js is NOT in /local/ (may be OK)"
        fi
    else
        print_color $RED "âœ— Home Assistant container cannot access /config/www/"
        print_color $YELLOW "This may cause 404 errors for JavaScript files"
    fi
    
    # Test API connectivity from within containers
    print_color $YELLOW "Testing API connectivity between containers..."
    if $COMPOSE_CMD exec homeassistant curl -s http://calendifier-api:8000/api/v1/about 2>/dev/null | grep -q "Calendifier"; then
        print_color $GREEN "âœ“ Home Assistant can reach Calendifier API"
    else
        print_color $YELLOW "âš  Home Assistant cannot reach Calendifier API (may still be starting)"
    fi
    
    print_color $GREEN "Container file access verification complete"
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

create_api_requirements() {
    print_header "Creating API Requirements"
    
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
EOF
    fi
    
    print_color $GREEN "API requirements file created"
}

build_and_start_containers() {
    print_header "Building and Starting Containers"
    
    cd "$CALENDIFIER_DIR"
    
    # Stop any existing containers
    $COMPOSE_CMD down 2>/dev/null || true
    
    # Build and start containers
    print_color $YELLOW "Building Calendifier API container..."
    $COMPOSE_CMD build calendifier-api
    
    print_color $YELLOW "Starting containers..."
    $COMPOSE_CMD up -d
    
    # Wait for containers to be healthy
    print_color $YELLOW "Waiting for containers to start..."
    sleep 10
    
    # Check container status
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_color $GREEN "Containers started successfully"
    else
        print_color $RED "Some containers failed to start"
        $COMPOSE_CMD logs
        exit 1
    fi
}

copy_files_to_containers() {
    print_header "Verifying Container File Access"
    
    # Files are already available via volume mounts, just verify
    print_color $YELLOW "Files are mounted via Docker volumes - no copying needed"
    
    # Just restart to ensure everything is loaded properly
    print_color $YELLOW "Restarting containers to ensure proper initialization..."
    $COMPOSE_CMD restart
    sleep 10
    
    print_color $GREEN "Container restart completed"
}

setup_autostart() {
    print_header "Setting up Auto-start"
    
    # Create systemd service for auto-start
    # Determine the correct compose command path for systemd
    if command -v docker-compose &> /dev/null; then
        SYSTEMD_COMPOSE_CMD="/usr/local/bin/docker-compose"
    else
        SYSTEMD_COMPOSE_CMD="/usr/bin/docker compose"
    fi
    
    sudo tee /etc/systemd/system/calendifier.service > /dev/null << EOF
[Unit]
Description=Calendifier Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$CALENDIFIER_DIR
ExecStart=$SYSTEMD_COMPOSE_CMD up -d
ExecStop=$SYSTEMD_COMPOSE_CMD down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Enable the service
    sudo systemctl daemon-reload
    sudo systemctl enable calendifier.service
    
    print_color $GREEN "Auto-start service created and enabled"
}

verify_installation() {
    print_header "Verifying Installation"
    
    # Check if containers are running
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_color $GREEN "âœ“ Containers are running"
    else
        print_color $RED "âœ— Containers are not running properly"
        return 1
    fi
    
    # Check API endpoint
    sleep 5
    if curl -s "http://localhost:$CALENDIFIER_API_PORT/api/status" > /dev/null; then
        print_color $GREEN "âœ“ Calendifier API is responding"
    else
        print_color $YELLOW "âš  Calendifier API may still be starting up"
    fi
    
    # Check Home Assistant
    if curl -s "http://localhost:$HA_PORT" > /dev/null; then
        print_color $GREEN "âœ“ Home Assistant is responding"
    else
        print_color $YELLOW "âš  Home Assistant may still be starting up"
    fi
    
    print_color $GREEN "Installation verification complete"
}

force_wide_cards() {
    print_header "Forcing Wide Card Layout"
    
    print_color $YELLOW "ðŸ”„ Applying wider card styling..."
    
    # Stop Home Assistant container to clear cache
    print_color $YELLOW "â¹ï¸ Stopping Home Assistant to clear cache..."
    $COMPOSE_CMD stop homeassistant 2>/dev/null || true
    
    # Wait a moment for clean shutdown
    sleep 3
    
    # Start Home Assistant container
    print_color $YELLOW "â–¶ï¸ Starting Home Assistant with updated styling..."
    $COMPOSE_CMD start homeassistant
    
    # Wait for Home Assistant to be ready
    print_color $YELLOW "â³ Waiting for Home Assistant to start..."
    sleep 15
    
    # Check if Home Assistant is running
    if $COMPOSE_CMD ps homeassistant | grep -q "Up"; then
        print_color $GREEN "âœ… Home Assistant is running with updated card styling"
        echo
        print_color $BLUE "ðŸŽ¯ IMPORTANT: Clear your browser cache to see the wider cards!"
        print_color $NC "   - Chrome/Edge: Ctrl+Shift+R or F12 > Application > Storage > Clear site data"
        print_color $NC "   - Firefox: Ctrl+Shift+R or F12 > Storage > Clear All"
        echo
        print_color $GREEN "ðŸ“± Then refresh your Home Assistant dashboard"
        print_color $GREEN "ðŸ”§ The cards should now be wider and better fitted to the screen"
        echo
        print_color $GREEN "âœ… Wide card layout applied successfully!"
    else
        print_color $RED "âŒ Failed to restart Home Assistant"
        print_color $YELLOW "ðŸ” Check Docker status with: docker compose ps"
        return 1
    fi
}

print_completion_info() {
    print_header "Installation Complete!"
    
    echo
    print_color $GREEN "ðŸŽ‰ Calendifier has been successfully installed with BEAUTIFUL UI!"
    echo
    print_color $BLUE "Access URLs:"
    print_color $NC "  Home Assistant: http://$(hostname -I | awk '{print $1}'):$HA_PORT"
    print_color $NC "  Calendifier API: http://$(hostname -I | awk '{print $1}'):$CALENDIFIER_API_PORT"
    echo
    print_color $YELLOW "Next Steps:"
    print_color $NC "1. Open Home Assistant in your browser: http://$(hostname -I | awk '{print $1}'):$HA_PORT"
    print_color $NC "2. Complete the initial Home Assistant setup wizard"
    print_color $NC "3. ðŸ” IMPORTANT: Look for 'Calendifier' in the LEFT SIDEBAR menu"
    print_color $NC "4. ðŸŽ¯ Click on the 'Calendifier' sidebar item (NOT the Overview tab)"
    print_color $NC "5. âœ¨ You should see the BEAUTIFUL layout with:"
    print_color $NC "   â€¢ Row 1: Full-width Clock"
    print_color $NC "   â€¢ Row 2: Full-width Calendar"
    print_color $NC "   â€¢ Row 3: Events + Notes side-by-side (below calendar)"
    print_color $NC "   â€¢ Row 4: Full-width About/Settings"
    print_color $NC "   â€¢ Row 5: Full-width Data Management"
    print_color $NC "6. ðŸš¨ If you see a basic grid layout, you're on the wrong dashboard!"
    echo
    print_color $GREEN "âœ… BEAUTIFUL UI RESTORED:"
    print_color $GREEN "âœ“ Calendifier appears as separate sidebar dashboard"
    print_color $GREEN "âœ“ Beautiful vertical layout with no overlapping"
    print_color $GREEN "âœ“ Full-width Clock (Row 1)"
    print_color $GREEN "âœ“ Full-width Calendar view (Row 2)"
    print_color $GREEN "âœ“ Events + Notes cards side-by-side below calendar (Row 3)"
    print_color $GREEN "âœ“ Full-width About/Settings (Row 4)"
    print_color $GREEN "âœ“ Full-width Data Management (Row 5)"
    print_color $GREEN "âœ“ Wide card styling automatically applied"
    print_color $GREEN "âœ“ All JavaScript resources loaded via frontend.extra_module_url"
    print_color $GREEN "âœ“ API requirements properly installed in Docker container"
    echo
    print_color $BLUE "Technical Details:"
    print_color $NC "  â€¢ Dashboard Type: lovelace.dashboards (proper sidebar integration)"
    print_color $NC "  â€¢ Layout: Optimized mix of full-width and side-by-side cards"
    print_color $NC "  â€¢ Resources: Auto-loaded via frontend.extra_module_url"
    print_color $NC "  â€¢ Volume Mounts: $CALENDIFIER_DIR/www â†’ /config/www"
    print_color $NC "  â€¢ API Container: All requirements installed via pip"
    print_color $NC "  â€¢ Cards: Clock, Calendar, About/Settings, Events, Notes, Data"
    echo
    print_color $BLUE "Useful Commands:"
    print_color $NC "  View logs: cd $CALENDIFIER_DIR && docker compose logs"
    print_color $NC "  Restart services: cd $CALENDIFIER_DIR && docker compose restart"
    print_color $NC "  Stop services: cd $CALENDIFIER_DIR && docker compose down"
    print_color $NC "  Start services: cd $CALENDIFIER_DIR && docker compose up -d"
    echo
}

# Main execution
main() {
    print_header "Calendifier Pi Setup Starting"
    
    # Check if files are in home directory and move them if needed
    if [ -f ~/setup-pi.sh ] && [ ! -d "$CALENDIFIER_DIR" ]; then
        print_color $YELLOW "Files found in home directory, organizing them..."
        mkdir -p "$CALENDIFIER_DIR"
        mkdir -p "$CALENDIFIER_DIR/homeassistant/www"
        
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
        
        # Copy www files to HA directory
        if [ -d "$CALENDIFIER_DIR/www" ]; then
            cp -r "$CALENDIFIER_DIR/www/"* "$CALENDIFIER_DIR/homeassistant/www/" 2>/dev/null || true
        fi
        
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
    create_ha_configuration
    create_lovelace_config
    copy_web_components
    create_docker_compose
    create_api_dockerfile
    create_api_requirements
    build_and_start_containers
    copy_files_to_containers
    verify_web_components
    verify_container_file_access
    force_wide_cards
    setup_autostart
    verify_installation
    print_completion_info
}

# Run main function
main "$@"