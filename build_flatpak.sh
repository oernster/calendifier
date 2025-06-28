#!/bin/bash

# Exit on error
set -e

# Enable more verbose output
set -x

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    elif [ -f /etc/redhat-release ]; then
        # More specific check for RHEL-based systems
        if grep -q "Rocky Linux" /etc/redhat-release; then
            DISTRO="rocky"
        elif grep -q "AlmaLinux" /etc/redhat-release; then
            DISTRO="alma"
        else
            DISTRO="rhel"
        fi
    else
        DISTRO="unknown"
    fi
    echo $DISTRO
}

# Function to detect desktop environment
detect_desktop() {
    if [ -n "$XDG_CURRENT_DESKTOP" ]; then
        DESKTOP=$XDG_CURRENT_DESKTOP
    elif [ -n "$DESKTOP_SESSION" ]; then
        DESKTOP=$DESKTOP_SESSION
    else
        # Try to detect using ps
        if pgrep -x "cinnamon" > /dev/null; then
            DESKTOP="Cinnamon"
        elif pgrep -x "gnome-shell" > /dev/null; then
            DESKTOP="GNOME"
        elif pgrep -x "plasmashell" > /dev/null; then
            DESKTOP="KDE"
        else
            DESKTOP="unknown"
        fi
    fi
    echo $DESKTOP
}

# Function to display installation instructions for flatpak-builder
install_instructions() {
    DISTRO=$(detect_distro)
    echo "flatpak-builder not found. Please install it first."
    
    case $DISTRO in
        "ubuntu" | "debian" | "linuxmint" | "pop")
            echo "On Debian/Ubuntu/Mint/Pop_OS!: sudo apt install flatpak flatpak-builder"
            ;;
        "fedora")
            echo "On Fedora: sudo dnf install flatpak flatpak-builder"
            ;;
        "rhel" | "centos" | "rocky" | "alma")
            echo "On RHEL/CentOS/Rocky/Alma Linux:"
            echo "1. Enable EPEL repository: sudo dnf install epel-release"
            echo "2. Install flatpak: sudo dnf install flatpak flatpak-builder"
            ;;
        "arch" | "manjaro" | "endeavouros")
            echo "On Arch/Manjaro/EndeavourOS: sudo pacman -S flatpak flatpak-builder"
            ;;
        "opensuse" | "opensuse-leap" | "opensuse-tumbleweed")
            echo "On openSUSE: sudo zypper install flatpak flatpak-builder"
            ;;
        "gentoo")
            echo "On Gentoo: sudo emerge --ask dev-util/flatpak dev-util/flatpak-builder"
            ;;
        "void")
            echo "On Void Linux: sudo xbps-install -S flatpak flatpak-builder"
            ;;
        "slackware")
            echo "On Slackware: Use SlackBuilds from https://slackbuilds.org/repository/15.0/development/flatpak/ and https://slackbuilds.org/repository/15.0/development/flatpak-builder/"
            ;;
        *)
            echo "For other distributions, please check your package manager or visit https://flatpak.org/setup/"
            ;;
    esac
    
    echo "After installation, you may need to log out and log back in to update your environment."
    exit 1
}

# Check if flatpak is installed
if ! command -v flatpak &> /dev/null; then
    echo "flatpak not found!"
    install_instructions
fi

# Check if flatpak-builder is installed
if ! command -v flatpak-builder &> /dev/null; then
    echo "flatpak-builder not found!"
    install_instructions
fi

# Check if required files exist
if [ ! -f "main.py" ]; then
    echo "main.py not found. Please run this script from your source directory."
    exit 1
fi

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "requirements.txt not found. Creating a minimal requirements file..."
    # Create minimal requirements.txt if missing
    cat > requirements.txt << EOL
PySide6>=6.5.0
ntplib>=0.4.0
python-dateutil>=2.8.0
holidays>=0.34
icalendar>=5.0.0
tzdata>=2025.2
psutil>=5.9.0
EOL
fi

# Detect distribution and desktop environment
DISTRO=$(detect_distro)
DESKTOP=$(detect_desktop)
echo "Detected distribution: $DISTRO"
echo "Detected desktop environment: $DESKTOP"

# Get source directory (where the script is being run from)
SOURCE_DIR="$(pwd)"
echo "Building from source directory: $SOURCE_DIR"

# Create Flatpak manifest
cat > com.calendifier.Calendar.json << 'EOL'
{
    "app-id": "com.calendifier.Calendar",
    "runtime": "org.freedesktop.Platform",
    "runtime-version": "23.08",
    "sdk": "org.freedesktop.Sdk",
    "command": "calendifier",
    "finish-args": [
        "--share=ipc",
        "--socket=x11",
        "--socket=wayland",
        "--device=dri",
        "--share=network",
        "--filesystem=home",
        "--filesystem=xdg-documents",
        "--filesystem=xdg-download",
        "--talk-name=org.freedesktop.Notifications",
        "--talk-name=org.kde.StatusNotifierWatcher",
        "--own-name=com.calendifier.Calendar"
    ],
    "build-options": {
        "env": {
            "PIP_CACHE_DIR": "/run/build/calendifier/pip-cache"
        },
        "build-args": [
            "--share=network"
        ]
    },
    "modules": [
        {
            "name": "python3-pip",
            "buildsystem": "simple",
            "build-commands": [
                "python3 -m ensurepip --upgrade"
            ]
        },
        {
            "name": "python-dependencies",
            "buildsystem": "simple",
            "build-commands": [
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} PySide6>=6.5.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} ntplib>=0.4.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} python-dateutil>=2.8.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} holidays>=0.34",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} icalendar>=5.0.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} tzdata>=2025.2",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} psutil>=5.9.0"
            ]
        },
        {
            "name": "calendifier",
            "buildsystem": "simple",
            "build-commands": [
                "echo 'Installing Calendifier application...'",
                "echo 'Source directory contents:'",
                "ls -la",
                "echo 'Creating proper Python package structure...'",
                "mkdir -p ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier",
                "cp -rv main.py ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv calendar_app ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv version.py ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv requirements.txt ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv assets ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv LICENSE ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv LGPL3_COMPLIANCE_NOTICE.txt ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "cp -rv LGPL3_LICENSE.txt ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "echo 'Creating __init__.py for package...'",
                "touch ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/__init__.py",
                "echo 'Creating launcher script...'",
                "mkdir -p ${FLATPAK_DEST}/bin",
                "echo '#!/bin/bash' > ${FLATPAK_DEST}/bin/calendifier",
                "echo 'cd /app/lib/python3.11/site-packages/calendifier' >> ${FLATPAK_DEST}/bin/calendifier",
                "echo 'exec python3 main.py \"$@\"' >> ${FLATPAK_DEST}/bin/calendifier",
                "chmod +x ${FLATPAK_DEST}/bin/calendifier",
                "echo 'Verifying installation - calendifier package contents:'",
                "ls -la ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/",
                "echo 'Verifying main.py exists:'",
                "ls -la ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/main.py",
                "echo 'Verifying calendar_app directory:'",
                "ls -la ${FLATPAK_DEST}/lib/python3.11/site-packages/calendifier/calendar_app/",
                "echo 'Installing icons...'",
                "if [ -f assets/calendar_icon.svg ]; then install -Dm644 assets/calendar_icon.svg ${FLATPAK_DEST}/share/icons/hicolor/scalable/apps/com.calendifier.Calendar.svg; fi",
                "if [ -f assets/calendar_icon_128x128.png ]; then install -Dm644 assets/calendar_icon_128x128.png ${FLATPAK_DEST}/share/icons/hicolor/128x128/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_64x64.png ]; then install -Dm644 assets/calendar_icon_64x64.png ${FLATPAK_DEST}/share/icons/hicolor/64x64/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_48x48.png ]; then install -Dm644 assets/calendar_icon_48x48.png ${FLATPAK_DEST}/share/icons/hicolor/48x48/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_32x32.png ]; then install -Dm644 assets/calendar_icon_32x32.png ${FLATPAK_DEST}/share/icons/hicolor/32x32/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_16x16.png ]; then install -Dm644 assets/calendar_icon_16x16.png ${FLATPAK_DEST}/share/icons/hicolor/16x16/apps/com.calendifier.Calendar.png; fi",
                "echo 'Installing desktop file...'",
                "install -Dm644 com.calendifier.Calendar.desktop ${FLATPAK_DEST}/share/applications/com.calendifier.Calendar.desktop",
                "echo 'Installing metainfo...'",
                "install -Dm644 com.calendifier.Calendar.metainfo.xml ${FLATPAK_DEST}/share/metainfo/com.calendifier.Calendar.metainfo.xml",
                "echo 'Installation complete!'"
            ],
            "sources": [
                {
                    "type": "dir",
                    "path": "."
                }
            ]
        }
    ]
}
EOL

# Create desktop file
cat > com.calendifier.Calendar.desktop << EOL
[Desktop Entry]
Version=1.0
Type=Application
Name=Calendifier
GenericName=Calendar Application
Comment=A sophisticated cross-platform desktop calendar application
Icon=com.calendifier.Calendar
Exec=calendifier
Terminal=false
Categories=Office;Calendar;Qt;
Keywords=calendar;event;schedule;appointment;reminder;date;time;
StartupNotify=true
StartupWMClass=calendifier
MimeType=text/calendar;application/ics;
EOL

# Add desktop environment specific entries
case "$DESKTOP" in
    *"Cinnamon"* | *"CINNAMON"* | *"X-Cinnamon"*)
        echo "Adding Cinnamon-specific desktop entries..."
        cat >> com.calendifier.Calendar.desktop << 'EOL'
X-Cinnamon-UsesNotifications=true
X-GNOME-UsesNotifications=true
EOL
        ;;
    *"GNOME"* | *"UBUNTU"*)
        echo "Adding GNOME-specific desktop entries..."
        cat >> com.calendifier.Calendar.desktop << 'EOL'
X-GNOME-UsesNotifications=true
EOL
        ;;
    *"KDE"* | *"PLASMA"*)
        echo "Adding KDE-specific desktop entries..."
        cat >> com.calendifier.Calendar.desktop << 'EOL'
X-KDE-FormFactor=desktop,tablet,handset
X-KDE-StartupNotify=true
EOL
        ;;
    *)
        # Default entries for other desktop environments
        cat >> com.calendifier.Calendar.desktop << 'EOL'
X-GNOME-UsesNotifications=true
EOL
        ;;
esac

# Create metainfo file
cat > com.calendifier.Calendar.metainfo.xml << 'EOL'
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>com.calendifier.Calendar</id>
  <metadata_license>MIT</metadata_license>
  <project_license>MIT</project_license>
  <name>Calendifier</name>
  <summary>A sophisticated cross-platform desktop calendar application</summary>
  <description>
    <p>
      Calendifier is a feature-rich, cross-platform desktop calendar built with Python and PySide6,
      designed to serve users worldwide with native-quality localization and intelligent holiday management.
    </p>
    <p>Features:</p>
    <ul>
      <li>Full Calendar Management with monthly view and intuitive navigation</li>
      <li>14-Language Support with complete localization and runtime language switching</li>
      <li>14-Country Holiday Support with intelligent holiday detection and native translations</li>
      <li>Real-time Analog Clock with NTP synchronization for accurate timekeeping</li>
      <li>Comprehensive Event Management with categories and recurring events</li>
      <li>Dynamic Theming with Dark/Light mode and instant switching</li>
      <li>Integrated Notes with built-in note-taking functionality</li>
      <li>Import/Export support for iCalendar, CSV, and JSON formats</li>
      <li>Extensive Configuration with customizable settings for all preferences</li>
    </ul>
  </description>
  <launchable type="desktop-id">com.calendifier.Calendar.desktop</launchable>
  <provides>
    <binary>calendifier</binary>
  </provides>
  <url type="homepage">https://github.com/oernster/calendifier</url>
  <url type="bugtracker">https://github.com/oernster/calendifier/issues</url>
  <url type="help">https://github.com/oernster/calendifier/blob/main/README.md</url>
  <developer_name>Oliver Ernster</developer_name>
  <update_contact>oliver.ernster@example.com</update_contact>
  <releases>
    <release version="1.0.0" date="2025-06-28">
      <description>
        <p>Initial release of Calendifier with comprehensive internationalization support.</p>
      </description>
    </release>
  </releases>
  <content_rating type="oars-1.1"/>
  <supports>
    <control>pointing</control>
    <control>keyboard</control>
  </supports>
</component>
EOL

# Function to setup Flathub repository
setup_flathub() {
    # Remove existing Flathub remote if it exists and is causing issues
    echo "Removing existing Flathub remote if it exists..."
    flatpak remote-delete --force flathub 2>/dev/null || true

    # Add Flathub repository with the correct URL based on distribution
    echo "Adding Flathub repository with correct URL..."
    if [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO" == "endeavouros" ]]; then
        flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    else
        flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
    fi

    # Verify the remote is correctly added
    echo "Verifying Flathub remote configuration..."
    flatpak remotes
}

# Setup Flathub repository
setup_flathub

# Install required runtimes
echo "Installing Freedesktop Platform and SDK..."

# Check for Arch-based systems with special handling
if [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO" == "endeavouros" ]]; then
    echo "Detected Arch-based system. Using special installation procedure..."
    
    # First try to install the runtime with user installation
    if ! flatpak install --user -y flathub org.freedesktop.Platform//23.08; then
        echo "User installation failed. Trying system installation..."
        if ! sudo flatpak install -y flathub org.freedesktop.Platform//23.08; then
            echo "Failed to install Freedesktop Platform runtime. Please check your internet connection."
            echo "You may need to install the ca-certificates package: sudo pacman -S ca-certificates"
            echo "Also ensure your Flathub repository is correctly configured."
            exit 1
        fi
    fi
    
    # Then install the SDK
    if ! flatpak install --user -y flathub org.freedesktop.Sdk//23.08; then
        echo "User installation failed. Trying system installation..."
        if ! sudo flatpak install -y flathub org.freedesktop.Sdk//23.08; then
            echo "Failed to install Freedesktop SDK runtime. Please check your internet connection."
            exit 1
        fi
    fi
else
    # For non-Arch systems, use the original method
    if ! flatpak install --user -y flathub org.freedesktop.Platform//23.08; then
        echo "Failed to install Freedesktop Platform runtime. Please check your internet connection."
        case $DISTRO in
            "ubuntu" | "debian" | "linuxmint" | "pop")
                echo "You may need to install the ca-certificates package: sudo apt install ca-certificates"
                ;;
            "fedora" | "rhel" | "centos" | "rocky" | "alma")
                echo "You may need to install the ca-certificates package: sudo dnf install ca-certificates"
                ;;
        esac
        exit 1
    fi

    if ! flatpak install --user -y flathub org.freedesktop.Sdk//23.08; then
        echo "Failed to install Freedesktop SDK runtime. Please check your internet connection."
        exit 1
    fi
fi

echo "Building Flatpak..."

# Create build directory if it doesn't exist
mkdir -p build

# Clean any previous builds
rm -rf build/* 2>/dev/null || true

# Build the Flatpak with dependencies from Flathub
echo "Building with flatpak-builder..."
if ! flatpak-builder --verbose --user --install-deps-from=flathub --force-clean build com.calendifier.Calendar.json; then
    echo "Flatpak build failed. Trying with alternative build options..."
    
    # Attempt with different options for Arch
    if [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO" == "endeavouros" ]]; then
        echo "Trying alternate build for Arch systems..."
        if ! flatpak-builder --verbose --user --install-deps-from=flathub --force-clean --keep-build-dirs build com.calendifier.Calendar.json; then
            echo "Alternative build also failed. This could be due to network issues or missing dependencies."
            echo "Check the build logs in the build directory for more details."
            exit 1
        fi
    else
        echo "Flatpak build failed. This could be due to network issues or missing dependencies."
        echo "If you're behind a proxy, make sure to set the http_proxy and https_proxy environment variables."
        exit 1
    fi
fi

echo "Creating repository..."
flatpak-builder --repo=repo --force-clean --user build com.calendifier.Calendar.json

echo "Creating single-file bundle..."

# Function to show progress for bundle creation
show_bundle_progress() {
    local pid=$1
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local delay=0.1
    local count=0
    
    while kill -0 $pid 2>/dev/null; do
        local char=${chars:$((count % ${#chars})):1}
        local elapsed=$((count / 10))
        printf "\r%s Creating bundle... %02d:%02d elapsed" "$char" $((elapsed / 60)) $((elapsed % 60))
        sleep $delay
        ((count++))
    done
    
    # Clear the progress line
    printf "\r"
}

# Start bundle creation in background and show progress
flatpak build-bundle repo calendifier.flatpak com.calendifier.Calendar &
BUNDLE_PID=$!

# Show progress while bundle is being created
show_bundle_progress $BUNDLE_PID

# Wait for bundle creation to complete
wait $BUNDLE_PID
BUNDLE_EXIT_CODE=$?

if [ $BUNDLE_EXIT_CODE -eq 0 ]; then
    echo "✅ Bundle creation completed successfully!"
    
    # Show bundle size if file exists
    if [ -f "calendifier.flatpak" ]; then
        BUNDLE_SIZE=$(du -h calendifier.flatpak | cut -f1)
        echo "📦 Bundle size: $BUNDLE_SIZE"
    fi
else
    echo "❌ Bundle creation failed with exit code $BUNDLE_EXIT_CODE"
    exit 1
fi

echo "Done! You can install the Flatpak with:"
echo "flatpak install --user calendifier.flatpak"

# Ask if user wants to install the Flatpak
read -p "Do you want to install the Flatpak now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing Flatpak..."
    flatpak install --user -y calendifier.flatpak
    
    # Check if installation was successful
    if flatpak list | grep -q com.calendifier.Calendar; then
        echo "Flatpak installed successfully."
        echo "You can run it with: flatpak run com.calendifier.Calendar"
        
        # Enhanced desktop integration
        echo "Setting up desktop integration..."
        
        # Get the location of the exported desktop file
        EXPORTED_DESKTOP_FILE=$(find ~/.local/share/flatpak/exports/share/applications -name "com.calendifier.Calendar.desktop" 2>/dev/null)
        
        if [ -n "$EXPORTED_DESKTOP_FILE" ]; then
            mkdir -p ~/.local/share/applications
            cp "$EXPORTED_DESKTOP_FILE" ~/.local/share/applications/com.calendifier.Calendar.desktop
            
            # Update the desktop database
            update-desktop-database ~/.local/share/applications 2>/dev/null || true
            
            echo "Desktop file created successfully."
            
            # Copy icon to standard locations
            mkdir -p ~/.local/share/icons/hicolor/128x128/apps/
            
            # Try to extract icon from flatpak
            if [ -f "$SOURCE_DIR/assets/calendar_icon_128x128.png" ]; then
                cp "$SOURCE_DIR/assets/calendar_icon_128x128.png" ~/.local/share/icons/hicolor/128x128/apps/com.calendifier.Calendar.png
            elif [ -f "$SOURCE_DIR/assets/calendar_icon.png" ]; then
                cp "$SOURCE_DIR/assets/calendar_icon.png" ~/.local/share/icons/hicolor/128x128/apps/com.calendifier.Calendar.png
            fi
            
            if command -v gtk-update-icon-cache &> /dev/null; then
                gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor 2>/dev/null || true
            fi
        fi
        
        # Special menu integration for Cinnamon
        if [[ "$DESKTOP" == *"Cinnamon"* || "$DESKTOP" == *"CINNAMON"* || "$DESKTOP" == *"X-Cinnamon"* ]]; then
            echo "Applying special Cinnamon menu integration..."
            
            # Force refresh Cinnamon menu
            if pgrep -x "cinnamon" > /dev/null; then
                echo "Refreshing Cinnamon menu..."
                
                # Try to refresh Cinnamon via DBus
                dbus-send --session --dest=org.Cinnamon --type=method_call /org/Cinnamon org.Cinnamon.Eval string:'Main.panel.menuManager._updateMenus();' &> /dev/null || true
            fi
            
            echo "Menu integration completed. You may need to log out and back in for the menu entry to appear."
        fi
    else
        echo "Installation failed. Please try installing manually with: flatpak install --user calendifier.flatpak"
    fi
fi

# Print information about distributing the Flatpak
echo ""
echo "================================================================"
echo "DISTRIBUTION INFORMATION"
echo "================================================================"
echo "The generated Flatpak package 'calendifier.flatpak' can now be distributed"
echo "to other users and systems. Users can install it with:"
echo ""
echo "flatpak install calendifier.flatpak"
echo ""
echo "The Flatpak is self-contained and works on any Linux distribution"
echo "that supports Flatpak, regardless of the user's home directory or username."
echo "The necessary Freedesktop runtime will be automatically downloaded if needed."
echo "================================================================"