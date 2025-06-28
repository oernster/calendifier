# 📦 Flatpak Build Guide for Calendifier

This guide provides comprehensive instructions for building Calendifier as a Flatpak package for all major Linux distributions.

## 🎯 Overview

The [`build_flatpak.py`](build_flatpak.py) script creates a universal Flatpak package that works across all Linux distributions, ensuring consistent behavior and easy installation.

### ✨ Features

- **🐧 Universal Linux Support**: Works on all major distributions
- **🐍 Python 3.12.3**: Uses the specified Python version
- **📦 Single Package**: Creates a `.flatpak` bundle for easy distribution
- **🔧 Auto-dependency Detection**: Automatically installs required dependencies
- **🧪 Built-in Testing**: Tests the package before distribution
- **🌍 Multi-language Support**: Includes all 14 language translations
- **🎨 Icon Support**: Includes PNG and SVG icons for all sizes

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

### 1. Auto-Install Dependencies

```bash
# Automatically detect your distribution and install dependencies
python build_flatpak.py --install-deps
```

### 2. Build the Flatpak

```bash
# Build the Flatpak package
python build_flatpak.py
```


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
python build_flatpak.py
```

### Fedora/RHEL/CentOS/Rocky Linux/AlmaLinux

```bash
# Install dependencies
sudo dnf update -y
sudo dnf install -y flatpak flatpak-builder python3.12 python3.12-devel git

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Flatpak runtimes
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08

# Build the package
python build_flatpak.py
```

### Arch Linux/EndeavourOS/Manjaro

```bash
# Install dependencies
sudo pacman -Syu
sudo pacman -S --noconfirm flatpak flatpak-builder python git

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Flatpak runtimes
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08

# Build the package
python build_flatpak.py
```

### openSUSE (Leap/Tumbleweed)

```bash
# Install dependencies
sudo zypper refresh
sudo zypper install -y flatpak flatpak-builder python312 python312-devel git

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Flatpak runtimes
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08

# Build the package
python build_flatpak.py
```

### Void Linux

```bash
# Install dependencies
sudo xbps-install -Su
sudo xbps-install -y flatpak flatpak-builder python3.12 python3.12-devel git

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Flatpak runtimes
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08

# Build the package
python build_flatpak.py
```

## 🔧 Build Options

### Command Line Arguments

```bash
python build_flatpak.py [OPTIONS]

Options:
  --debug         Enable debug mode with verbose output
  --clean         Clean build artifacts before building
  --install-deps  Automatically install required dependencies
```

### Examples

```bash
# Clean build with debug output
python build_flatpak.py --clean --debug

# Auto-install dependencies
python build_flatpak.py --install-deps

# Full build process
python build_flatpak.py --install-deps --clean
```

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
flatpak install --user com.calendifier.Calendar-1.0.0.flatpak

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
# Check what's missing
python build_flatpak.py

# Auto-install missing dependencies
python build_flatpak.py --install-deps
```

#### Dependency Installation Conflicts
If you encounter package conflicts (like nvidia firmware conflicts), you can:
```bash
# Skip automatic dependency installation and install manually
sudo pacman -S flatpak flatpak-builder python git --needed

# Or force overwrite conflicting files (use with caution)
sudo pacman -S flatpak flatpak-builder python git --overwrite '*'
```

#### Build Failures
```bash
# Clean and rebuild with debug output
python build_flatpak.py --clean --debug
```

#### Runtime Issues
```bash
# Ensure Flatpak runtimes are installed
flatpak install flathub org.freedesktop.Platform//23.08
flatpak install flathub org.freedesktop.Sdk//23.08

# Add Flathub if not already added
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

### Debug Mode

Enable debug mode for detailed build information:
```bash
python build_flatpak.py --debug
```

This will show:
- Detailed Flatpak builder output
- Dependency resolution steps
- File installation process
- Error details

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
