#!/usr/bin/env python3
"""
📦 Flatpak Build Script for Calendifier
Builds Flatpak packages for all common Linux distributions

Supports:
- Debian/Ubuntu (apt-based)
- Red Hat/Fedora/CentOS (dnf/yum-based)
- Arch Linux (pacman-based)
- openSUSE (zypper-based)
- Void Linux (xbps-based)
- EndeavourOS (pacman-based)

Requirements:
- Python 3.12.3
- Flatpak
- flatpak-builder
- org.freedesktop.Platform//23.08
- org.freedesktop.Sdk//23.08

Usage:
    python build_flatpak.py [--debug] [--clean] [--install-deps] [--test-run]
"""

import os
import sys
import json
import shutil
import subprocess
import platform
import argparse
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import urllib.request
import hashlib

# Build configuration
APP_ID = "com.calendifier.Calendar"
APP_NAME = "Calendifier"
APP_VERSION = "1.0.0"
PYTHON_VERSION = "3.12.3"
RUNTIME_VERSION = "23.08"
BUILD_DIR = "flatpak-build"
REPO_DIR = "flatpak-repo"

class DistroDetector:
    """Detect Linux distribution and provide appropriate package manager commands."""
    
    @staticmethod
    def detect_distro() -> Tuple[str, str]:
        """Detect the current Linux distribution."""
        try:
            # Try to read /etc/os-release
            with open('/etc/os-release', 'r') as f:
                os_release = f.read()
            
            # Parse the file
            info = {}
            for line in os_release.split('\n'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    info[key] = value.strip('"')
            
            distro_id = info.get('ID', '').lower()
            distro_name = info.get('NAME', 'Unknown')
            
            # Map distro IDs to package managers
            if distro_id in ['ubuntu', 'debian', 'linuxmint', 'pop', 'elementary']:
                return 'debian', distro_name
            elif distro_id in ['fedora', 'rhel', 'centos', 'rocky', 'almalinux']:
                return 'redhat', distro_name
            elif distro_id in ['arch', 'manjaro', 'endeavouros', 'garuda']:
                return 'arch', distro_name
            elif distro_id in ['opensuse', 'opensuse-leap', 'opensuse-tumbleweed', 'sled', 'sles']:
                return 'opensuse', distro_name
            elif distro_id in ['void']:
                return 'void', distro_name
            else:
                return 'unknown', distro_name
                
        except Exception:
            return 'unknown', 'Unknown'
    
    @staticmethod
    def get_install_commands(distro_family: str) -> Dict[str, str]:
        """Get package installation commands for the distro family."""
        commands = {
            'debian': {
                'update': 'sudo apt update',
                'install': 'sudo apt install -y',
                'packages': 'flatpak flatpak-builder python3.12 python3.12-venv python3.12-dev git'
            },
            'redhat': {
                'update': 'sudo dnf update -y',
                'install': 'sudo dnf install -y',
                'packages': 'flatpak flatpak-builder python3.12 python3.12-devel git'
            },
            'arch': {
                'update': 'sudo pacman -Syu',
                'install': 'sudo pacman -S --noconfirm',
                'packages': 'flatpak flatpak-builder python git'
            },
            'opensuse': {
                'update': 'sudo zypper refresh',
                'install': 'sudo zypper install -y',
                'packages': 'flatpak flatpak-builder python312 python312-devel git'
            },
            'void': {
                'update': 'sudo xbps-install -Su',
                'install': 'sudo xbps-install -y',
                'packages': 'flatpak flatpak-builder python3.12 python3.12-devel git'
            }
        }
        return commands.get(distro_family, commands['debian'])

class FlatpakBuilder:
    """Main Flatpak builder class."""
    
    def __init__(self, debug: bool = False):
        self.debug = debug
        self.project_root = Path.cwd()
        self.build_dir = self.project_root / BUILD_DIR
        self.repo_dir = self.project_root / REPO_DIR
        
    def check_dependencies(self) -> bool:
        """Check if required dependencies are installed."""
        print("🔍 Checking dependencies...")
        
        required_commands = ['flatpak', 'flatpak-builder', 'python3', 'git']
        missing = []
        
        for cmd in required_commands:
            if not shutil.which(cmd):
                missing.append(cmd)
        
        if missing:
            print(f"❌ Missing dependencies: {', '.join(missing)}")
            print("💡 Run with --install-deps to automatically install them")
            return False
        
        # Check Python version
        try:
            result = subprocess.run([sys.executable, '--version'], 
                                  capture_output=True, text=True)
            version = result.stdout.strip().split()[1]
            if not version.startswith('3.12'):
                print(f"⚠️ Python version {version} found, but 3.12.3 is recommended")
        except Exception:
            print("⚠️ Could not verify Python version")
        
        # Check Flatpak runtimes
        try:
            result = subprocess.run(['flatpak', 'list', '--runtime'], 
                                  capture_output=True, text=True)
            if f'org.freedesktop.Platform//{RUNTIME_VERSION}' not in result.stdout:
                print(f"⚠️ Flatpak runtime org.freedesktop.Platform//{RUNTIME_VERSION} not found")
                print("   Run: flatpak install flathub org.freedesktop.Platform//23.08")
            if f'org.freedesktop.Sdk//{RUNTIME_VERSION}' not in result.stdout:
                print(f"⚠️ Flatpak SDK org.freedesktop.Sdk//{RUNTIME_VERSION} not found")
                print("   Run: flatpak install flathub org.freedesktop.Sdk//23.08")
        except Exception:
            print("⚠️ Could not check Flatpak runtimes")
        
        print("✅ Dependencies check completed")
        return True
    
    def install_dependencies(self) -> bool:
        """Install dependencies based on the detected distribution."""
        print("📦 Installing dependencies...")
        
        distro_family, distro_name = DistroDetector.detect_distro()
        print(f"🐧 Detected distribution: {distro_name} ({distro_family})")
        
        if distro_family == 'unknown':
            print("❌ Unknown distribution. Please install dependencies manually:")
            print("   - flatpak")
            print("   - flatpak-builder")
            print("   - python3.12")
            print("   - git")
            return False
        
        commands = DistroDetector.get_install_commands(distro_family)
        
        try:
            # Update package database
            print(f"🔄 Updating package database...")
            try:
                subprocess.run(commands['update'].split(), check=True)
            except subprocess.CalledProcessError as e:
                print(f"⚠️ Package database update failed (exit code {e.returncode}), continuing...")
            
            # Install packages
            print(f"📥 Installing packages...")
            install_cmd = f"{commands['install']} {commands['packages']}"
            try:
                subprocess.run(install_cmd.split(), check=True)
            except subprocess.CalledProcessError as e:
                print(f"⚠️ Some packages may have failed to install (exit code {e.returncode})")
                print("   This might be due to conflicting files or packages already installed.")
                print("   Continuing with build - please ensure required dependencies are available.")
            
            # Install Flatpak runtimes
            print("🏗️ Installing Flatpak runtimes...")
            
            # Add Flathub remote if not already added
            try:
                subprocess.run([
                    'flatpak', 'remote-add', '--if-not-exists', 'flathub',
                    'https://flathub.org/repo/flathub.flatpakrepo'
                ], check=True)
            except subprocess.CalledProcessError:
                print("⚠️ Could not add Flathub remote (may already exist)")
            
            # Install Platform runtime
            try:
                subprocess.run([
                    'flatpak', 'install', '-y', 'flathub',
                    f'org.freedesktop.Platform//{RUNTIME_VERSION}'
                ], check=True)
            except subprocess.CalledProcessError:
                print(f"⚠️ Platform runtime may already be installed or unavailable")
            
            # Install SDK runtime
            try:
                subprocess.run([
                    'flatpak', 'install', '-y', 'flathub',
                    f'org.freedesktop.Sdk//{RUNTIME_VERSION}'
                ], check=True)
            except subprocess.CalledProcessError:
                print(f"⚠️ SDK runtime may already be installed or unavailable")
            
            print("✅ Dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            return False
    
    def generate_requirements_hash(self) -> str:
        """Generate SHA256 hash of requirements.txt for reproducible builds."""
        requirements_path = self.project_root / "requirements.txt"
        if not requirements_path.exists():
            return ""
        
        with open(requirements_path, 'rb') as f:
            content = f.read()
        
        return hashlib.sha256(content).hexdigest()
    
    def create_flatpak_manifest(self) -> Dict:
        """Create the Flatpak manifest."""
        print("📝 Creating Flatpak manifest...")
        
        manifest = {
            "app-id": APP_ID,
            "runtime": f"org.freedesktop.Platform",
            "runtime-version": RUNTIME_VERSION,
            "sdk": f"org.freedesktop.Sdk",
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
                }
            },
            "modules": [
                {
                    "name": "python3-pip",
                    "buildsystem": "simple",
                    "build-commands": [
                        "python3 -m ensurepip"
                    ]
                },
                {
                    "name": "calendifier",
                    "buildsystem": "simple",
                    "build-commands": [
                        "echo 'Current directory contents:'",
                        "ls -la",
                        "echo 'Checking for packaging files:'",
                        "ls -la setup.py pyproject.toml || echo 'Packaging files not found'",
                        "echo 'Creating minimal setup.py if missing:'",
                        "if [ ! -f setup.py ] && [ ! -f pyproject.toml ]; then echo 'from setuptools import setup, find_packages; setup(name=\"calendifier\", version=\"1.0.0\", packages=find_packages(), install_requires=[\"PySide6>=6.5.0\", \"ntplib>=0.4.0\", \"python-dateutil>=2.8.0\", \"holidays>=0.34\", \"icalendar>=5.0.0\", \"tzdata>=2025.2\", \"psutil>=5.9.0\"], entry_points={\"console_scripts\": [\"calendifier=main:main\"]})' > setup.py; fi",
                        "pip3 install --verbose --prefix=${FLATPAK_DEST} --no-build-isolation .",
                        "install -Dm644 assets/calendar_icon.svg ${FLATPAK_DEST}/share/icons/hicolor/scalable/apps/${FLATPAK_ID}.svg",
                        "install -Dm644 assets/calendar_icon_128x128.png ${FLATPAK_DEST}/share/icons/hicolor/128x128/apps/${FLATPAK_ID}.png",
                        "install -Dm644 assets/calendar_icon_64x64.png ${FLATPAK_DEST}/share/icons/hicolor/64x64/apps/${FLATPAK_ID}.png",
                        "install -Dm644 assets/calendar_icon_48x48.png ${FLATPAK_DEST}/share/icons/hicolor/48x48/apps/${FLATPAK_ID}.png",
                        "install -Dm644 assets/calendar_icon_32x32.png ${FLATPAK_DEST}/share/icons/hicolor/32x32/apps/${FLATPAK_ID}.png",
                        "install -Dm644 assets/calendar_icon_16x16.png ${FLATPAK_DEST}/share/icons/hicolor/16x16/apps/${FLATPAK_ID}.png",
                        "install -Dm644 flatpak/${FLATPAK_ID}.desktop ${FLATPAK_DEST}/share/applications/${FLATPAK_ID}.desktop",
                        "install -Dm644 flatpak/${FLATPAK_ID}.metainfo.xml ${FLATPAK_DEST}/share/metainfo/${FLATPAK_ID}.metainfo.xml"
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
        
        return manifest
    
    def create_desktop_file(self) -> str:
        """Create the .desktop file content."""
        return f"""[Desktop Entry]
Version=1.0
Type=Application
Name=Calendifier
GenericName=Calendar Application
Comment=A sophisticated cross-platform desktop calendar application
Comment[es]=Una sofisticada aplicación de calendario de escritorio multiplataforma
Comment[fr]=Une application de calendrier de bureau multiplateforme sophistiquée
Comment[de]=Eine ausgeklügelte plattformübergreifende Desktop-Kalenderanwendung
Comment[it]=Un'applicazione calendario desktop multipiattaforma sofisticata
Comment[pt]=Uma aplicação de calendário de desktop multiplataforma sofisticada
Comment[ru]=Сложное кроссплатформенное настольное календарное приложение
Comment[zh_CN]=一个复杂的跨平台桌面日历应用程序
Comment[ja]=包括的な国際化を備えた洗練されたクロスプラットフォームデスクトップカレンダーアプリケーション
Comment[ko]=포괄적인 국제화를 갖춘 정교한 크로스 플랫폼 데스크톱 캘린더 애플리케이션
Exec=calendifier
Icon={APP_ID}
Terminal=false
Categories=Office;Calendar;Qt;
Keywords=calendar;event;schedule;appointment;reminder;date;time;
Keywords[es]=calendario;evento;horario;cita;recordatorio;fecha;hora;
Keywords[fr]=calendrier;événement;horaire;rendez-vous;rappel;date;heure;
Keywords[de]=kalender;ereignis;zeitplan;termin;erinnerung;datum;zeit;
Keywords[it]=calendario;evento;programma;appuntamento;promemoria;data;ora;
Keywords[pt]=calendário;evento;horário;compromisso;lembrete;data;hora;
Keywords[ru]=календарь;событие;расписание;встреча;напоминание;дата;время;
Keywords[zh_CN]=日历;事件;日程;约会;提醒;日期;时间;
Keywords[ja]=カレンダー;イベント;スケジュール;予定;リマインダー;日付;時間;
Keywords[ko]=달력;이벤트;일정;약속;알림;날짜;시간;
StartupNotify=true
StartupWMClass=calendifier
MimeType=text/calendar;application/ics;
"""
    
    def create_metainfo_file(self) -> str:
        """Create the metainfo XML file content."""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>{APP_ID}</id>
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
  <launchable type="desktop-id">{APP_ID}.desktop</launchable>
  <provides>
    <binary>calendifier</binary>
  </provides>
  <screenshots>
    <screenshot type="default">
      <caption>Main calendar view with dark theme</caption>
      <image>https://raw.githubusercontent.com/oernster/calendifier/main/assets/screenshots/dark-theme.png</image>
    </screenshot>
    <screenshot>
      <caption>Light theme calendar view</caption>
      <image>https://raw.githubusercontent.com/oernster/calendifier/main/assets/screenshots/light-theme.png</image>
    </screenshot>
  </screenshots>
  <url type="homepage">https://github.com/oernster/calendifier</url>
  <url type="bugtracker">https://github.com/oernster/calendifier/issues</url>
  <url type="help">https://github.com/oernster/calendifier/blob/main/README.md</url>
  <developer_name>Oliver Ernster</developer_name>
  <update_contact>oliver.ernster@example.com</update_contact>
  <releases>
    <release version="{APP_VERSION}" date="2025-06-28">
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
"""
    
    def create_setup_py(self) -> str:
        """Create a setup.py file for pip installation."""
        return f"""#!/usr/bin/env python3
from setuptools import setup, find_packages
from pathlib import Path

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_path.exists():
    with open(requirements_path, 'r') as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

# Read README
readme_path = Path(__file__).parent / "README.md"
long_description = ""
if readme_path.exists():
    with open(readme_path, 'r', encoding='utf-8') as f:
        long_description = f.read()

setup(
    name="calendifier",
    version="{APP_VERSION}",
    description="A sophisticated cross-platform desktop calendar application",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Oliver Ernster",
    author_email="oliver.ernster@example.com",
    url="https://github.com/oernster/calendifier",
    packages=find_packages(),
    include_package_data=True,
    package_data={{
        'calendar_app': [
            'localization/translations/*.json',
            'localization/locale_holiday_translations/*.json',
        ],
        '': ['assets/*', 'LICENSE', 'README.md']
    }},
    install_requires=requirements,
    python_requires=">=3.8",
    entry_points={{
        'console_scripts': [
            'calendifier=main:main',
        ],
    }},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Office/Business :: Scheduling",
        "Topic :: Utilities",
    ],
)
"""
    
    def create_manifest_in(self) -> str:
        """Create a MANIFEST.in file to include additional files."""
        return """include README.md
include LICENSE
include requirements.txt
include version.py
recursive-include assets *
recursive-include calendar_app/localization/translations *.json
recursive-include calendar_app/localization/locale_holiday_translations *.json
recursive-include flatpak *.desktop *.xml
"""
    
    def create_pyproject_toml(self) -> str:
        """Create a pyproject.toml file for modern Python packaging."""
        return f"""[build-system]
requires = ["setuptools>=45", "wheel", "setuptools_scm[toml]>=6.2"]
build-backend = "setuptools.build_meta"

[project]
name = "calendifier"
version = "{APP_VERSION}"
description = "A sophisticated cross-platform desktop calendar application"
readme = "README.md"
license = {{text = "MIT"}}
authors = [
    {{name = "Oliver Ernster", email = "oliver.ernster@example.com"}}
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: End Users/Desktop",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.8",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Office/Business :: Scheduling",
    "Topic :: Utilities",
]
requires-python = ">=3.8"
dependencies = [
    "PySide6>=6.5.0",
    "ntplib>=0.4.0",
    "python-dateutil>=2.8.0",
    "holidays>=0.34",
    "icalendar>=5.0.0",
    "tzdata>=2025.2",
    "psutil>=5.9.0"
]

[project.urls]
Homepage = "https://github.com/oernster/calendifier"
"Bug Tracker" = "https://github.com/oernster/calendifier/issues"
Documentation = "https://github.com/oernster/calendifier/blob/main/README.md"

[project.scripts]
calendifier = "main:main"

[tool.setuptools]
packages = ["calendar_app", "calendar_app.config", "calendar_app.core", "calendar_app.data", "calendar_app.localization", "calendar_app.ui", "calendar_app.utils"]

[tool.setuptools.package-data]
calendar_app = [
    "localization/translations/*.json",
    "localization/locale_holiday_translations/*.json"
]
"*" = ["assets/*", "LICENSE", "README.md"]
"""
    
    def prepare_build_environment(self) -> bool:
        """Prepare the build environment."""
        print("🏗️ Preparing build environment...")
        
        # Clean previous builds
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        if self.repo_dir.exists():
            shutil.rmtree(self.repo_dir)
        
        # Create directories
        self.build_dir.mkdir(parents=True, exist_ok=True)
        self.repo_dir.mkdir(parents=True, exist_ok=True)
        
        # Create flatpak directory for metadata files
        flatpak_dir = self.project_root / "flatpak"
        flatpak_dir.mkdir(exist_ok=True)
        
        # Create desktop file
        desktop_content = self.create_desktop_file()
        with open(flatpak_dir / f"{APP_ID}.desktop", 'w') as f:
            f.write(desktop_content)
        
        # Create metainfo file
        metainfo_content = self.create_metainfo_file()
        with open(flatpak_dir / f"{APP_ID}.metainfo.xml", 'w') as f:
            f.write(metainfo_content)
        
        # Create setup.py if it doesn't exist
        setup_py_path = self.project_root / "setup.py"
        if not setup_py_path.exists():
            setup_content = self.create_setup_py()
            with open(setup_py_path, 'w') as f:
                f.write(setup_content)
        
        # Create pyproject.toml for modern Python packaging
        pyproject_path = self.project_root / "pyproject.toml"
        pyproject_content = self.create_pyproject_toml()
        with open(pyproject_path, 'w') as f:
            f.write(pyproject_content)
        
        # Create MANIFEST.in for proper file inclusion
        manifest_in_path = self.project_root / "MANIFEST.in"
        manifest_in_content = self.create_manifest_in()
        with open(manifest_in_path, 'w') as f:
            f.write(manifest_in_content)
        
        # Create manifest
        manifest = self.create_flatpak_manifest()
        manifest_path = self.build_dir / f"{APP_ID}.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print("✅ Build environment prepared")
        return True
    
    def build_flatpak(self) -> bool:
        """Build the Flatpak package."""
        print("🔨 Building Flatpak package...")
        
        manifest_path = self.build_dir / f"{APP_ID}.json"
        
        try:
            # Build command
            cmd = [
                'flatpak-builder',
                '--force-clean',
                '--repo', str(self.repo_dir),
                str(self.build_dir / 'build'),
                str(manifest_path)
            ]
            
            if self.debug:
                cmd.append('--verbose')
            
            print(f"🔧 Running: {' '.join(cmd)}")
            
            # Run flatpak-builder
            result = subprocess.run(cmd, cwd=self.project_root, 
                                  capture_output=not self.debug, text=True)
            
            if result.returncode == 0:
                print("✅ Flatpak build completed successfully")
                return True
            else:
                print(f"❌ Flatpak build failed with exit code {result.returncode}")
                if not self.debug and result.stderr:
                    print(f"Error output: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Unexpected error during build: {e}")
            return False
    
    def create_bundle(self) -> bool:
        """Create a .flatpak bundle file for distribution."""
        print("📦 Creating Flatpak bundle...")
        
        bundle_path = self.project_root / f"{APP_ID}-{APP_VERSION}.flatpak"
        
        try:
            cmd = [
                'flatpak', 'build-bundle',
                str(self.repo_dir),
                str(bundle_path),
                APP_ID
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                size_mb = bundle_path.stat().st_size / (1024 * 1024)
                print(f"✅ Bundle created: {bundle_path}")
                print(f"📏 Bundle size: {size_mb:.1f} MB")
                return True
            else:
                print(f"❌ Bundle creation failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Unexpected error creating bundle: {e}")
            return False
    
    
    def show_installation_instructions(self):
        """Show installation instructions for different distributions."""
        print("\n📋 Installation Instructions")
        print("=" * 50)
        
        bundle_path = self.project_root / f"{APP_ID}-{APP_VERSION}.flatpak"
        
        print(f"""
🎯 Direct Installation:
   flatpak install --user {bundle_path}

🏪 From Repository:
   flatpak remote-add --user calendifier-repo {self.repo_dir}
   flatpak install --user calendifier-repo {APP_ID}

🚀 Run Application:
   flatpak run {APP_ID}

📦 Distribution-Specific Instructions:

🔸 Debian/Ubuntu:
   sudo apt install flatpak
   flatpak install --user {bundle_path}

🔸 Fedora/RHEL/CentOS:
   sudo dnf install flatpak
   flatpak install --user {bundle_path}

🔸 Arch Linux/EndeavourOS:
   sudo pacman -S flatpak
   flatpak install --user {bundle_path}

🔸 openSUSE:
   sudo zypper install flatpak
   flatpak install --user {bundle_path}

🔸 Void Linux:
   sudo xbps-install flatpak
   flatpak install --user {bundle_path}

📝 Note: First-time Flatpak users may need to add Flathub:
   flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
""")

def main():
    """Main build script entry point."""
    parser = argparse.ArgumentParser(description=f"Build {APP_NAME} Flatpak for Linux distributions")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--clean", action="store_true", help="Clean build artifacts before building")
    parser.add_argument("--install-deps", action="store_true", help="Install required dependencies")
    
    args = parser.parse_args()
    
    print(f"📦 {APP_NAME} Flatpak Build Script")
    print("=" * 60)
    print(f"🐍 Python Version: {PYTHON_VERSION}")
    print(f"🏗️ Runtime Version: {RUNTIME_VERSION}")
    print(f"📱 App ID: {APP_ID}")
    print()
    
    builder = FlatpakBuilder(debug=args.debug)
    
    # Install dependencies if requested
    if args.install_deps:
        if not builder.install_dependencies():
            sys.exit(1)
    
    # Check dependencies
    if not builder.check_dependencies():
        print("\n💡 Tip: Use --install-deps to automatically install dependencies")
        sys.exit(1)
    
    # Clean if requested
    if args.clean:
        print("🧹 Cleaning previous builds...")
        if builder.build_dir.exists():
            shutil.rmtree(builder.build_dir)
        if builder.repo_dir.exists():
            shutil.rmtree(builder.repo_dir)
    
    # Prepare build environment
    if not builder.prepare_build_environment():
        sys.exit(1)
    
    # Build Flatpak
    if not builder.build_flatpak():
        sys.exit(1)
    
    # Create bundle
    if not builder.create_bundle():
        sys.exit(1)
    
    # Show installation instructions
    builder.show_installation_instructions()
    
    print("\n🎉 Flatpak build completed successfully!")
    print(f"📦 Bundle: {APP_ID}-{APP_VERSION}.flatpak")
    print(f"🗂️ Repository: {builder.repo_dir}")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n❌ Build interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)