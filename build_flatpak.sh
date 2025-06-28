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

# Function to apply enhanced Fedora Cinnamon icon fixes
fix_fedora_cinnamon_icon() {
    echo "===== Applying Fedora Cinnamon Icon Fixes ====="
    
    # 1. First, find existing icons we can use
    echo "Locating existing Calendifier icons..."
    ICON_SOURCE=""
    
    # Check exported flatpak icon - dynamically find paths based on installation
    FLATPAK_EXPORTS=$(find ~/.local/share/flatpak/exports/share/icons -name "*calendifier*.png" 2>/dev/null | head -1)
    FLATPAK_APP_ICONS=$(find ~/.local/share/flatpak/app/com.calendifier.Calendar -name "*calendar*.png" 2>/dev/null | head -1)
    LOCAL_ICON=$(find ~/.local/share/icons -name "*calendifier*.png" 2>/dev/null | head -1)
    SOURCE_ICON_128="$SOURCE_DIR/assets/calendar_icon_128x128.png"
    SOURCE_ICON="$SOURCE_DIR/assets/calendar_icon.png"
    
    if [ -n "$FLATPAK_EXPORTS" ]; then
        ICON_SOURCE="$FLATPAK_EXPORTS"
        echo "Found icon in Flatpak exports"
    elif [ -n "$FLATPAK_APP_ICONS" ]; then
        ICON_SOURCE="$FLATPAK_APP_ICONS"
        echo "Found icon in Flatpak app directory"
    elif [ -n "$LOCAL_ICON" ]; then
        ICON_SOURCE="$LOCAL_ICON"
        echo "Found icon in local icons directory"
    elif [ -f "$SOURCE_ICON_128" ]; then
        ICON_SOURCE="$SOURCE_ICON_128"
        echo "Using source directory 128x128 icon"
    elif [ -f "$SOURCE_ICON" ]; then
        ICON_SOURCE="$SOURCE_ICON"
        echo "Using source directory icon"
    else
        # Extract from the flatpak as last resort
        echo "No existing icon found, extracting from Flatpak..."
        mkdir -p /tmp/calendifier-fix
        flatpak run --command=sh com.calendifier.Calendar -c "find /app -name '*calendar*.png' -exec cp {} /tmp/calendifier-fix/icon.png \; -quit" || true
        
        if [ -f /tmp/calendifier-fix/icon.png ]; then
            ICON_SOURCE="/tmp/calendifier-fix/icon.png"
            echo "Extracted icon from Flatpak"
        else
            echo "WARNING: Could not find or extract any icons, icon may be missing in menu."
            return 1
        fi
    fi
    
    # 2. Create all the necessary icon directories
    echo "Creating icon directories..."
    mkdir -p ~/.icons
    mkdir -p ~/.local/share/icons/hicolor/16x16/apps
    mkdir -p ~/.local/share/icons/hicolor/22x22/apps
    mkdir -p ~/.local/share/icons/hicolor/24x24/apps
    mkdir -p ~/.local/share/icons/hicolor/32x32/apps
    mkdir -p ~/.local/share/icons/hicolor/48x48/apps
    mkdir -p ~/.local/share/icons/hicolor/64x64/apps
    mkdir -p ~/.local/share/icons/hicolor/128x128/apps
    mkdir -p ~/.local/share/icons/hicolor/256x256/apps
    
    # 3. Copy the icon to all standard locations
    echo "Copying icon to standard locations..."
    cp "$ICON_SOURCE" ~/.icons/com.calendifier.Calendar.png
    cp "$ICON_SOURCE" ~/.local/share/icons/hicolor/128x128/apps/com.calendifier.Calendar.png
    cp "$ICON_SOURCE" ~/.local/share/icons/hicolor/256x256/apps/com.calendifier.Calendar.png
    
    # Also copy with alternate names that Cinnamon might be looking for
    cp "$ICON_SOURCE" ~/.local/share/icons/hicolor/128x128/apps/calendifier.png
    cp "$ICON_SOURCE" ~/.icons/calendifier.png
    
    # 4. Fix the desktop file
    echo "Fixing desktop file..."
    if [ -f ~/.local/share/applications/com.calendifier.Calendar.desktop ]; then
        # Make backup
        cp ~/.local/share/applications/com.calendifier.Calendar.desktop ~/.local/share/applications/com.calendifier.Calendar.desktop.bak
        
        # Change to simple icon name (more reliable)
        sed -i "s|Icon=.*|Icon=com.calendifier.Calendar|g" ~/.local/share/applications/com.calendifier.Calendar.desktop
        
        echo "Desktop file updated to use standard icon name"
    else
        echo "Desktop file not found in expected location"
    fi
    
    # 5. Create an additional desktop file in the specific Cinnamon location
    echo "Creating additional desktop file for Cinnamon..."
    mkdir -p ~/.local/share/cinnamon/applets/menu@cinnamon.org
    
    # Copy desktop file
    cp ~/.local/share/applications/com.calendifier.Calendar.desktop ~/.local/share/cinnamon/applets/menu@cinnamon.org/com.calendifier.Calendar.desktop 2>/dev/null || true
    
    # 6. Refresh icon cache
    echo "Refreshing icon cache..."
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor 2>/dev/null || true
    fi
    
    # 7. Create desktop shortcut as fallback if Desktop directory exists
    if [ -d ~/Desktop ]; then
        echo "Creating desktop shortcut..."
        cat > ~/Desktop/Calendifier.desktop << EOL
[Desktop Entry]
Version=1.0
Type=Application
Name=Calendifier
GenericName=Calendar Application
Comment=A sophisticated cross-platform desktop calendar application
Icon=com.calendifier.Calendar
Exec=flatpak run com.calendifier.Calendar
Terminal=false
Categories=Office;Calendar;Qt;
Keywords=calendar;event;schedule;appointment;reminder;date;time;
StartupNotify=true
X-GNOME-UsesNotifications=true
X-Cinnamon-UsesNotifications=true
EOL
        chmod +x ~/Desktop/Calendifier.desktop
    fi
    
    # 8. Try to refresh Cinnamon menu
    echo "Attempting to refresh Cinnamon menu..."
    dbus-send --session --dest=org.Cinnamon --type=method_call /org/Cinnamon org.Cinnamon.Eval string:'Main.panel.menuManager._updateMenus();' &>/dev/null || true
    dbus-send --session --dest=org.Cinnamon --type=method_call /org/Cinnamon org.Cinnamon.Eval string:'Main.placesManager._refreshAll();' &>/dev/null || true
    
    echo "Fedora Cinnamon icon fixes applied successfully!"
    return 0
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

# Verify essential directories exist
if [ ! -d "calendar_app" ]; then
    echo "calendar_app directory not found. Please run this script from your source directory."
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

# Create simple runner script to start calendifier directly
cat > calendifier-runner.sh << 'EOL'
#!/bin/bash

# Set Python path to include app directory and site-packages
export PYTHONPATH="/app:/app/lib/python3.12/site-packages:$PYTHONPATH"

# PySide6/Qt6 Configuration for KDE Platform
export QT_PLUGIN_PATH="/app/lib/python3.12/site-packages/PySide6/Qt/plugins"
export QT_QPA_PLATFORM_PLUGIN_PATH="/app/lib/python3.12/site-packages/PySide6/Qt/plugins/platforms"

# Platform detection for PySide6 on KDE runtime
if [ -n "$WAYLAND_DISPLAY" ] && [ -z "$FORCE_X11" ]; then
    export QT_QPA_PLATFORM=wayland
    echo 'Calendifier: Using Wayland platform'
elif [ -n "$DISPLAY" ]; then
    export QT_QPA_PLATFORM=xcb
    echo 'Calendifier: Using X11/XCB platform'
else
    export QT_QPA_PLATFORM=xcb
    echo 'Calendifier: Using XCB as fallback'
fi

# Additional Qt6 environment variables
export QT_AUTO_SCREEN_SCALE_FACTOR=1
export QT_ENABLE_HIGHDPI_SCALING=1

# Change to app directory and run Calendifier
cd /app
exec python3 main.py "$@"
EOL

# Make runner script executable
chmod +x calendifier-runner.sh

# Create Flatpak manifest with KDE Platform for better Qt6/PySide6 support
cat > com.calendifier.Calendar.json << 'EOL'
{
    "app-id": "com.calendifier.Calendar",
    "runtime": "org.kde.Platform",
    "runtime-version": "6.8",
    "sdk": "org.kde.Sdk",
    "command": "calendifier",
    "finish-args": [
        "--share=ipc",
        "--socket=x11",
        "--socket=wayland",
        "--socket=fallback-x11",
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
                "echo 'Installing PySide6 and dependencies for Calendifier...'",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} PySide6>=6.5.0",
                "echo 'Verifying PySide6 installation...'",
                "python3 -c 'import PySide6; print(\"PySide6 version:\", PySide6.__version__)'",
                "echo 'Installing other Python dependencies...'",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} ntplib>=0.4.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} python-dateutil>=2.8.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} holidays>=0.34",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} icalendar>=5.0.0",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} tzdata>=2025.2",
                "pip3 install --no-cache-dir --prefix=${FLATPAK_DEST} psutil>=5.9.0",
                "echo 'Checking PySide6 Qt plugins...'",
                "find ${FLATPAK_DEST}/lib/python3.12/site-packages/PySide6/Qt/plugins -name '*platform*' -type d || echo 'Platform plugins not found in expected location'"
            ]
        },
        {
            "name": "calendifier",
            "buildsystem": "simple",
            "build-commands": [
                "echo 'Installing Calendifier application files to /app...'",
                "cp -rv main.py ${FLATPAK_DEST}/",
                "cp -rv calendar_app ${FLATPAK_DEST}/",
                "if [ -f version.py ]; then cp -rv version.py ${FLATPAK_DEST}/; fi",
                "if [ -d assets ]; then cp -rv assets ${FLATPAK_DEST}/; fi",
                "if [ -f LICENSE ]; then cp -rv LICENSE ${FLATPAK_DEST}/; fi",
                "if [ -f LGPL3_COMPLIANCE_NOTICE.txt ]; then cp -rv LGPL3_COMPLIANCE_NOTICE.txt ${FLATPAK_DEST}/; fi",
                "if [ -f LGPL3_LICENSE.txt ]; then cp -rv LGPL3_LICENSE.txt ${FLATPAK_DEST}/; fi",
                "echo 'Verifying main.py exists:'",
                "test -f ${FLATPAK_DEST}/main.py && echo 'main.py successfully copied' || (echo 'ERROR: main.py not found!' && exit 1)",
                "echo 'Verifying calendar_app directory exists:'",
                "test -d ${FLATPAK_DEST}/calendar_app && echo 'calendar_app directory successfully copied' || (echo 'ERROR: calendar_app directory not found!' && exit 1)",
                "echo 'Installing launcher script...'",
                "mkdir -p ${FLATPAK_DEST}/bin",
                "cp calendifier-runner.sh ${FLATPAK_DEST}/bin/calendifier",
                "chmod +x ${FLATPAK_DEST}/bin/calendifier",
                "echo 'Verifying launcher script:'",
                "test -x ${FLATPAK_DEST}/bin/calendifier && echo 'Launcher script created successfully' || (echo 'ERROR: Launcher script creation failed!' && exit 1)",
                "echo 'Final verification - listing /app contents:'",
                "ls -la ${FLATPAK_DEST}/",
                "echo 'Testing Python can find main.py:'",
                "cd ${FLATPAK_DEST} && python3 -c 'import os; print(\"main.py exists:\", os.path.exists(\"main.py\"))'",
                "install -Dm644 com.calendifier.Calendar.desktop ${FLATPAK_DEST}/share/applications/com.calendifier.Calendar.desktop",
                "install -Dm644 com.calendifier.Calendar.metainfo.xml ${FLATPAK_DEST}/share/metainfo/com.calendifier.Calendar.metainfo.xml",
                "if [ -f assets/calendar_icon.svg ]; then install -Dm644 assets/calendar_icon.svg ${FLATPAK_DEST}/share/icons/hicolor/scalable/apps/com.calendifier.Calendar.svg; fi",
                "if [ -f assets/calendar_icon_128x128.png ]; then install -Dm644 assets/calendar_icon_128x128.png ${FLATPAK_DEST}/share/icons/hicolor/128x128/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_64x64.png ]; then install -Dm644 assets/calendar_icon_64x64.png ${FLATPAK_DEST}/share/icons/hicolor/64x64/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_48x48.png ]; then install -Dm644 assets/calendar_icon_48x48.png ${FLATPAK_DEST}/share/icons/hicolor/48x48/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_32x32.png ]; then install -Dm644 assets/calendar_icon_32x32.png ${FLATPAK_DEST}/share/icons/hicolor/32x32/apps/com.calendifier.Calendar.png; fi",
                "if [ -f assets/calendar_icon_16x16.png ]; then install -Dm644 assets/calendar_icon_16x16.png ${FLATPAK_DEST}/share/icons/hicolor/16x16/apps/com.calendifier.Calendar.png; fi"
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

# Create desktop file following Flatpak conventions
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
X-Flatpak=com.calendifier.Calendar
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
    <release version="1.0.2" date="2025-06-28">
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
  <categories>
    <category>Office</category>
    <category>Calendar</category>
    <category>Qt</category>
  </categories>
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

# Install required KDE 6.8 runtimes with specific distribution handling
echo "Installing KDE 6.8 Platform and SDK (optimized for Qt6/PySide6)..."

# Check for Arch-based systems with special handling
if [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO" == "endeavouros" ]]; then
    echo "Detected Arch-based system. Using special installation procedure..."
    
    # First try to install the runtime with user installation
    if ! flatpak install --user -y flathub org.kde.Platform//6.8; then
        echo "User installation failed. Trying system installation..."
        if ! sudo flatpak install -y flathub org.kde.Platform//6.8; then
            echo "Failed to install KDE Platform runtime. Please check your internet connection."
            echo "You may need to install the ca-certificates package: sudo pacman -S ca-certificates"
            echo "Also ensure your Flathub repository is correctly configured."
            exit 1
        fi
    fi
    
    # Then install the SDK
    if ! flatpak install --user -y flathub org.kde.Sdk//6.8; then
        echo "User installation failed. Trying system installation..."
        if ! sudo flatpak install -y flathub org.kde.Sdk//6.8; then
            echo "Failed to install KDE SDK runtime. Please check your internet connection."
            exit 1
        fi
    fi
else
    # For non-Arch systems, use the original method
    if ! flatpak install --user -y flathub org.kde.Platform//6.8; then
        echo "Failed to install KDE Platform runtime. Please check your internet connection."
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

    if ! flatpak install --user -y flathub org.kde.Sdk//6.8; then
        echo "Failed to install KDE SDK runtime. Please check your internet connection."
        exit 1
    fi
fi

echo "Building Flatpak..."

# Create build directory if it doesn't exist
mkdir -p build

# Clean any previous builds
rm -rf build/* 2>/dev/null || true

# Create special permissions for Arch/EndeavourOS with Cinnamon
if [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO" == "endeavouros" ]]; then
    echo "Configuring special permissions for Arch-based systems..."
    
    # Create temporary file with fixed permissions for Cinnamon
    cat > flatpak_override_settings << EOL
[Context]
shared=network;ipc;
sockets=x11;wayland;
devices=dri;
filesystems=xdg-documents:ro;xdg-download:ro;
EOL
    
    echo "Will apply these custom permissions after build."
fi

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
        
        # Apply custom overrides for Arch/EndeavourOS if needed
        if [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" || "$DISTRO" == "endeavouros" ]]; then
            echo "Applying custom permission overrides for better compatibility with $DISTRO..."
            mkdir -p ~/.local/share/flatpak/overrides
            cp flatpak_override_settings ~/.local/share/flatpak/overrides/com.calendifier.Calendar
            echo "Custom permissions applied."
        fi
        
        # Apply custom overrides for Fedora+Cinnamon
        if [[ "$DISTRO" == "fedora" && ("$DESKTOP" == *"Cinnamon"* || "$DESKTOP" == *"CINNAMON"* || "$DESKTOP" == *"X-Cinnamon"*) ]]; then
            echo "Applying Fedora+Cinnamon specific overrides..."
            mkdir -p ~/.local/share/flatpak/overrides
            cat > ~/.local/share/flatpak/overrides/com.calendifier.Calendar << EOL
[Context]
shared=network;ipc;
sockets=x11;wayland;
devices=dri;
filesystems=xdg-documents:ro;xdg-download:ro;~/.config/cinnamon:ro;~/.local/share/cinnamon:ro;
EOL
            echo "Fedora+Cinnamon overrides applied."
        fi
        
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
        
        # Apply enhanced icon fixes for Fedora+Cinnamon
        if [[ "$DISTRO" == "fedora" && ("$DESKTOP" == *"Cinnamon"* || "$DESKTOP" == *"CINNAMON"* || "$DESKTOP" == *"X-Cinnamon"*) ]]; then
            echo "Applying enhanced icon fixes for Fedora+Cinnamon..."
            fix_fedora_cinnamon_icon
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
        
        # Test the installation
        echo ""
        echo "🧪 Testing the installation..."
        echo "Running: flatpak run com.calendifier.Calendar --version"
        timeout 10s flatpak run com.calendifier.Calendar --version 2>/dev/null || echo "Version check completed (or timed out)"
        
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
echo "The necessary KDE runtime will be automatically downloaded if needed."
echo ""
echo "Runtime used: org.kde.Platform//6.8 (includes complete Qt6 support for PySide6)"
echo "================================================================"