#!/bin/bash
#
# Deploy Calendifier to Home Assistant - Mac/Linux Version
# Usage: ./deploy-ha.sh [pi_ip] [pi_user]
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local message="$1"
    local color="$2"
    echo -e "${color}${message}${NC}"
}

# Default values
PI_IP="$1"
PI_USER="${2:-pi}"

# Get Pi IP address if not provided
if [ -z "$PI_IP" ]; then
    echo -n "Enter Raspberry Pi IP address: "
    read PI_IP
    if [ -z "$PI_IP" ]; then
        print_color "ERROR: IP address is required." "$RED"
        exit 1
    fi
fi

print_color "\n=== ONE PASSWORD Deployment (Mac/Linux) ===" "$BLUE"

# Create tar archive
print_color "Creating archive..." "$BLUE"
tar -czf calendifier-deploy.tar.gz \
    api_server.py \
    main.py \
    requirements.txt \
    api_requirements.txt \
    docker-compose.yml \
    Dockerfile.api \
    version.py \
    setup-pi.sh \
    lovelace-calendifier-config.yaml \
    www \
    calendar_app \
    assets \
    docs

if [ $? -ne 0 ]; then
    print_color "ERROR: Failed to create archive. Make sure all files exist." "$RED"
    exit 1
fi

print_color "\nDeploying with ONE password..." "$BLUE"

# Create the remote script
REMOTE_SCRIPT='cat > calendifier-deploy.tar.gz
mkdir -p ~/calendifier ~/calendifier/homeassistant/www
tar -xzf calendifier-deploy.tar.gz
mv api_server.py main.py requirements.txt api_requirements.txt docker-compose.yml Dockerfile.api version.py setup-pi.sh lovelace-calendifier-config.yaml ~/calendifier/
mv www calendar_app assets docs ~/calendifier/
cp -r ~/calendifier/www/* ~/calendifier/homeassistant/www/
chmod -R 755 ~/calendifier
chmod +x ~/calendifier/setup-pi.sh
rm calendifier-deploy.tar.gz
echo DEPLOYMENT_COMPLETE'

# Send everything in one command
cat calendifier-deploy.tar.gz | ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "$REMOTE_SCRIPT"

if [ $? -ne 0 ]; then
    print_color "ERROR: Deployment failed. Check your SSH connection and Pi credentials." "$RED"
    rm -f calendifier-deploy.tar.gz
    exit 1
fi

# Clean up
rm -f calendifier-deploy.tar.gz

print_color "\n=== Deployment Complete ===" "$GREEN"
print_color "✓ ONE password only!" "$BLUE"
print_color "\nNext steps:" "$YELLOW"
print_color "1. SSH to your Pi: ssh $PI_USER@$PI_IP" "$NC"
print_color "2. Run: cd calendifier && ./setup-pi.sh" "$NC"
print_color "3. Access: http://$PI_IP:8123" "$NC"
print_color "\nWide Layout:" "$BLUE"
print_color "• Wide cards are automatically applied during setup" "$NC"
print_color "• Clear browser cache if cards appear narrow" "$NC"