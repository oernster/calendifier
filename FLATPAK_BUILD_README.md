# 📦 Flatpak Build Guide for Calendifier

This guide provides comprehensive instructions for building Calendifier as a Flatpak package for all major Linux distributions.

## 🎯 Overview

The [`build_flatpak.sh`](build_flatpak.sh) script creates a universal Flatpak package that works across all Linux distributions, ensuring consistent behavior and easy installation.

### ✨ Features

- **🐧 Universal Linux Support**: Works on all major distributions
- **🔧 Auto-dependency Detection**: Automatically detects and installs required dependencies
- **📦 Single Package**: Creates a `.flatpak` bundle for easy distribution
- **🎯 Progress Indicators**: Visual progress bars during build process
- **🌍 Multi-language Support**: Includes all 14 language translations
- **🎨 Icon Support**: Includes PNG and SVG icons for all sizes
- **⚖️ LGPL3 Compliance**: Includes proper license compliance for PySide6

## 🏗️ Supported Distributions

| Distribution | Package Manager | Status |
|--------------|----------------|---------|
| **Debian/Ubuntu** | `apt` | ✅ Fully Supported |
| **Fedora/RHEL/CentOS** | `dnf`/`yum` | ✅ Fully Supported |
| **Arch Linux** | `pacman` | ✅ Fully Supported |
| **EndeavourOS** | `pacman` | ✅ Fully Supported |
| **openSUSE** | `zypper` | ✅ Fully Supported |
| **Void Linux** | `xbps` | ✅ Fully Supported |
| **Linux Mint** | `apt` | ✅ Fully Supported |
| **Pop!_OS** | `apt` | ✅ Fully Supported |
| **Manjaro** | `pacman` | ✅ Fully Supported |

## 🚀 Quick Start

### 1. Make Script Executable

```bash
# Make the build script executable
chmod +x build_flatpak.sh
```

### 2. Run the Build Script

```bash
# Run the interactive build script (auto-detects distribution and installs dependencies)
./build_flatpak.sh
```

The script will automatically:
- Detect your Linux distribution
- Install required dependencies
- Set up Flatpak runtimes
- Build the Flatpak package
- Create the distributable bundle
- Optionally install the package


## 📋 Manual Installation Guide

### Debian/Ubuntu/Linux Mint/Pop!_OS

```bash
# Install dependencies
sudo apt update
sudo apt install -y flatpak flatpak-builder python3.12 python3.12-venv python3.12-dev git

# Add Flathub repository (if not already added)
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Flatpak runtimes
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08

# Build the package
chmod +x build_flatpak.sh
./build_flatpak.sh
```

### Fedora/RHEL/CentOS/Rocky Linux/AlmaLinux

```bash
# Install dependencies (optional - script can do this automatically)
sudo dnf update -y
sudo dnf install -y flatpak flatpak-builder git

# Build the package
chmod +x build_flatpak.sh
./build_flatpak.sh
```

### Arch Linux/EndeavourOS/Manjaro

```bash
# Install dependencies (optional - script can do this automatically)
sudo pacman -Syu
sudo pacman -S --noconfirm flatpak flatpak-builder git

# Build the package
chmod +x build_flatpak.sh
./build_flatpak.sh
```

### openSUSE (Leap/Tumbleweed)

```bash
# Install dependencies (optional - script can do this automatically)
sudo zypper refresh
sudo zypper install -y flatpak flatpak-builder git

# Build the package
chmod +x build_flatpak.sh
./build_flatpak.sh
```

### Void Linux

```bash
# Install dependencies (optional - script can do this automatically)
sudo xbps-install -Su
sudo xbps-install -y flatpak flatpak-builder git

# Build the package
chmod +x build_flatpak.sh
./build_flatpak.sh
```

## 🔧 Build Options

The bash build script automatically handles most configuration:

```bash
# Basic build (recommended)
./build_flatpak.sh
```

The script automatically:
- Detects your Linux distribution
- Installs required dependencies
- Sets up Flatpak repositories and runtimes
- Builds and installs the application
- Provides progress feedback throughout the process

## 📦 Output Files

After a successful build, you'll find:

```
📁 Project Directory
├── 📦 com.calendifier.Calendar-1.0.0.flatpak    # Installable bundle
├── 📁 flatpak-repo/                             # Local repository
├── 📁 flatpak-build/                            # Build artifacts
├── 📁 flatpak/                                  # Metadata files
│   ├── 📄 com.calendifier.Calendar.desktop      # Desktop entry
│   └── 📄 com.calendifier.Calendar.metainfo.xml # App metadata
└── 📄 setup.py                                  # Python package setup
```

## 🚀 Installation Instructions

### For End Users

#### Direct Installation
```bash
# Install the bundle directly
flatpak install --user calendifier.flatpak

# Run the application
flatpak run com.calendifier.Calendar
```

#### From Repository
```bash
# Add the local repository
flatpak remote-add --user calendifier-repo flatpak-repo

# Install from repository
flatpak install --user calendifier-repo com.calendifier.Calendar

# Run the application
flatpak run com.calendifier.Calendar
```

### Desktop Integration

After installation, Calendifier will appear in your application menu with:
- 🎨 **Proper icon** in multiple sizes (16x16 to 512x512)
- 🌍 **Localized descriptions** in 14 languages
- 📂 **File associations** for calendar files (.ics)
- 🔍 **Search keywords** in multiple languages

## 🔍 Troubleshooting

### Common Issues

#### Missing Dependencies
```bash
# The script automatically installs dependencies, but if it fails:
# Run the script and it will show what's missing
./build_flatpak.sh

# Or install manually based on your distribution (see manual installation guide above)
```

#### Dependency Installation Conflicts
If you encounter package conflicts (like nvidia firmware conflicts), you can:
```bash
# Install dependencies manually before running the script
# On Arch-based systems:
sudo pacman -S flatpak flatpak-builder git --needed

# Or force overwrite conflicting files (use with caution)
sudo pacman -S flatpak flatpak-builder git --overwrite '*'
```

#### Build Failures
```bash
# Clean build directory and try again
rm -rf .flatpak-builder build-dir repo
./build_flatpak.sh

# Check the script output for detailed error messages
```

#### Download/Network Issues
If you encounter 404 errors or download failures during build:
```bash
# Ensure you have internet access during build
# The build process downloads Python dependencies from PyPI
# Make sure your firewall allows flatpak-builder to access the internet
```

#### Permission Issues
If you encounter permission errors:
```bash
# Make sure the script is executable
chmod +x build_flatpak.sh

# Check script permissions
ls -la build_flatpak.sh
```

#### Runtime Issues
```bash
# Ensure Flatpak runtimes are installed
flatpak install flathub org.freedesktop.Platform//23.08
flatpak install flathub org.freedesktop.Sdk//23.08

# Add Flathub if not already added
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

#### Application Won't Start
```bash
# Check if the application is properly installed
flatpak list | grep calendifier

# Try running with verbose output
flatpak run --verbose com.calendifier.Calendar

# Check application logs
journalctl --user -f | grep flatpak
```

## 📋 Manifest Details

The build script generates a comprehensive Flatpak manifest with:

### Runtime Configuration
- **Runtime**: `org.freedesktop.Platform//23.08`
- **SDK**: `org.freedesktop.Sdk//23.08`
- **Python**: 3.12.3 (as specified)

### Permissions
- **Display**: X11 and Wayland support
- **Hardware**: DRI access for graphics acceleration
- **Network**: Internet access for NTP synchronization
- **Filesystem**: Home directory and document access
- **Notifications**: Desktop notification support

### Included Components
- **PySide6**: Qt6 Python bindings
- **Python Dependencies**: All requirements from `requirements.txt`
- **Application Data**: Translations, icons, and assets
- **Desktop Integration**: `.desktop` and metainfo files

## 🌍 Internationalization

The Flatpak package includes:
- **14 language translations** in JSON format
- **14 country holiday data** with localized names
- **Localized desktop entries** with descriptions and keywords
- **Runtime language switching** capability

## 📄 License Compliance

The Flatpak build ensures proper license compliance:
- **MIT License**: Application license included
- **LGPL3 Compliance**: PySide6 license requirements met
- **Source Availability**: Links to source code provided
- **Library Replacement**: Instructions for replacing LGPL libraries

## 🤝 Contributing

To contribute to the Flatpak build process:

1. **Test on your distribution**
2. **Report issues** with specific error messages
3. **Suggest improvements** for better compatibility
4. **Add support** for additional distributions

## 📞 Support

For Flatpak-specific issues:
- 📖 **Documentation**: This README
- 🐛 **Issues**: [GitHub Issues](https://github.com/oernster/calendifier/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/oernster/calendifier/discussions)

---

**Made with ❤️ for the Linux community**

*Supporting all major Linux distributions with universal Flatpak packaging*
