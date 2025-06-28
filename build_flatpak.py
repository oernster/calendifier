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
import time
import threading
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

class ProgressBar:
    """Simple progress bar for build operations."""
    
    def __init__(self, total_steps: int, description: str = "Progress"):
        self.total_steps = total_steps
        self.current_step = 0
        self.description = description
        self.start_time = time.time()
        
    def update(self, step_description: str = ""):
        """Update progress bar."""
        self.current_step += 1
        percentage = (self.current_step / self.total_steps) * 100
        
        # Create progress bar
        bar_length = 40
        filled_length = int(bar_length * self.current_step // self.total_steps)
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        
        # Calculate elapsed time
        elapsed = time.time() - self.start_time
        
        # Estimate remaining time
        if self.current_step > 0:
            eta = (elapsed / self.current_step) * (self.total_steps - self.current_step)
            eta_str = f"ETA: {int(eta//60):02d}:{int(eta%60):02d}"
        else:
            eta_str = "ETA: --:--"
        
        # Print progress
        print(f"\r🔨 {self.description}: [{bar}] {percentage:5.1f}% ({self.current_step}/{self.total_steps}) {eta_str} - {step_description}", end="", flush=True)
        
        if self.current_step >= self.total_steps:
            elapsed_str = f"{int(elapsed//60):02d}:{int(elapsed%60):02d}"
            print(f"\n✅ {self.description} completed in {elapsed_str}")
    
    def finish(self, message: str = ""):
        """Finish progress bar."""
        elapsed = time.time() - self.start_time
        elapsed_str = f"{int(elapsed//60):02d}:{int(elapsed%60):02d}"
        print(f"\n✅ {self.description} completed in {elapsed_str} - {message}")

class SpinnerProgress:
    """Spinner for indeterminate progress."""
    
    def __init__(self, description: str):
        self.description = description
        self.spinner_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        self.running = False
        self.thread = None
        
    def start(self):
        """Start spinner."""
        self.running = True
        self.thread = threading.Thread(target=self._spin, daemon=True)
        self.thread.start()
        
    def stop(self, message: str = ""):
        """Stop spinner."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=0.5)
        print(f"\r✅ {self.description} - {message}")
        
    def _spin(self):
        """Spinner animation."""
        i = 0
        while self.running:
            char = self.spinner_chars[i % len(self.spinner_chars)]
            print(f"\r{char} {self.description}...", end="", flush=True)
            time.sleep(0.1)
            i += 1

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
        progress = ProgressBar(6, "Installing dependencies")
        
        distro_family, distro_name = DistroDetector.detect_distro()
        progress.update(f"Detected distribution: {distro_name} ({distro_family})")
        
        if distro_family == 'unknown':
            progress.finish("❌ Unknown distribution")
            print("Please install dependencies manually:")
            print("   - flatpak")
            print("   - flatpak-builder")
            print("   - python3.12")
            print("   - git")
            return False
        
        commands = DistroDetector.get_install_commands(distro_family)
        
        try:
            # Update package database
            progress.update("Updating package database")
            try:
                subprocess.run(commands['update'].split(), check=True)
            except subprocess.CalledProcessError as e:
                print(f"\n⚠️ Package database update failed (exit code {e.returncode}), continuing...")
            
            # Install packages
            progress.update("Installing system packages")
            install_cmd = f"{commands['install']} {commands['packages']}"
            try:
                subprocess.run(install_cmd.split(), check=True)
            except subprocess.CalledProcessError as e:
                print(f"\n⚠️ Some packages may have failed to install (exit code {e.returncode})")
                print("   This might be due to conflicting files or packages already installed.")
                print("   Continuing with build - please ensure required dependencies are available.")
            
            # Add Flathub remote
            progress.update("Adding Flathub remote")
            try:
                subprocess.run([
                    'flatpak', 'remote-add', '--if-not-exists', 'flathub',
                    'https://flathub.org/repo/flathub.flatpakrepo'
                ], check=True)
            except subprocess.CalledProcessError:
                pass  # May already exist
            
            # Install Platform runtime
            progress.update("Installing Flatpak Platform runtime")
            try:
                subprocess.run([
                    'flatpak', 'install', '-y', 'flathub',
                    f'org.freedesktop.Platform//{RUNTIME_VERSION}'
                ], check=True)
            except subprocess.CalledProcessError:
                pass  # May already be installed
            
            # Install SDK runtime
            progress.update("Installing Flatpak SDK runtime")
            try:
                subprocess.run([
                    'flatpak', 'install', '-y', 'flathub',
                    f'org.freedesktop.Sdk//{RUNTIME_VERSION}'
                ], check=True)
            except subprocess.CalledProcessError:
                pass  # May already be installed
            
            progress.finish("Dependencies installed successfully")
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
                    "PIP_CACHE_DIR": "/run/build/calendifier/pip-cache",
                    "PATH": "/app/bin:/usr/bin",
                    "PYTHONPATH": "/app/lib/python3.11/site-packages"
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
                        "echo 'Current directory contents:'",
                        "ls -la",
                        "echo 'Creating setup.py:'",
                        "echo 'from setuptools import setup, find_packages' > setup.py",
                        "echo 'setup(' >> setup.py",
                        "echo '    name=\"calendifier\",' >> setup.py",
                        "echo '    version=\"1.0.0\",' >> setup.py",
                        "echo '    packages=find_packages(),' >> setup.py",
                        "echo '    include_package_data=True,' >> setup.py",
                        "echo '    entry_points={\"console_scripts\": [\"calendifier=main:main\"]},' >> setup.py",
                        "echo '    install_requires=[]' >> setup.py",
                        "echo ')' >> setup.py",
                        "cat setup.py",
                        "pip3 install --no-deps --use-pep517 --prefix=${FLATPAK_DEST} .",
                        "if [ -f assets/calendar_icon.svg ]; then install -Dm644 assets/calendar_icon.svg ${FLATPAK_DEST}/share/icons/hicolor/scalable/apps/${FLATPAK_ID}.svg; fi",
                        "if [ -f assets/calendar_icon_128x128.png ]; then install -Dm644 assets/calendar_icon_128x128.png ${FLATPAK_DEST}/share/icons/hicolor/128x128/apps/${FLATPAK_ID}.png; fi",
                        "if [ -f assets/calendar_icon_64x64.png ]; then install -Dm644 assets/calendar_icon_64x64.png ${FLATPAK_DEST}/share/icons/hicolor/64x64/apps/${FLATPAK_ID}.png; fi",
                        "if [ -f assets/calendar_icon_48x48.png ]; then install -Dm644 assets/calendar_icon_48x48.png ${FLATPAK_DEST}/share/icons/hicolor/48x48/apps/${FLATPAK_ID}.png; fi",
                        "if [ -f assets/calendar_icon_32x32.png ]; then install -Dm644 assets/calendar_icon_32x32.png ${FLATPAK_DEST}/share/icons/hicolor/32x32/apps/${FLATPAK_ID}.png; fi",
                        "if [ -f assets/calendar_icon_16x16.png ]; then install -Dm644 assets/calendar_icon_16x16.png ${FLATPAK_DEST}/share/icons/hicolor/16x16/apps/${FLATPAK_ID}.png; fi",
                        "if [ -f flatpak/${FLATPAK_ID}.desktop ]; then install -Dm644 flatpak/${FLATPAK_ID}.desktop ${FLATPAK_DEST}/share/applications/${FLATPAK_ID}.desktop; fi",
                        "if [ -f flatpak/${FLATPAK_ID}.metainfo.xml ]; then install -Dm644 flatpak/${FLATPAK_ID}.metainfo.xml ${FLATPAK_DEST}/share/metainfo/${FLATPAK_ID}.metainfo.xml; fi"
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
        progress = ProgressBar(8, "Preparing build environment")
        
        # Clean previous builds
        progress.update("Cleaning previous builds")
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        if self.repo_dir.exists():
            shutil.rmtree(self.repo_dir)
        
        # Create directories
        progress.update("Creating build directories")
        self.build_dir.mkdir(parents=True, exist_ok=True)
        self.repo_dir.mkdir(parents=True, exist_ok=True)
        
        # Create flatpak directory for metadata files
        flatpak_dir = self.project_root / "flatpak"
        flatpak_dir.mkdir(exist_ok=True)
        
        # Create desktop file
        progress.update("Creating desktop file")
        desktop_content = self.create_desktop_file()
        with open(flatpak_dir / f"{APP_ID}.desktop", 'w') as f:
            f.write(desktop_content)
        
        # Create metainfo file
        progress.update("Creating metainfo file")
        metainfo_content = self.create_metainfo_file()
        with open(flatpak_dir / f"{APP_ID}.metainfo.xml", 'w') as f:
            f.write(metainfo_content)
        
        # Create setup.py if it doesn't exist
        progress.update("Creating setup.py")
        setup_py_path = self.project_root / "setup.py"
        if not setup_py_path.exists():
            setup_content = self.create_setup_py()
            with open(setup_py_path, 'w') as f:
                f.write(setup_content)
        
        # Create pyproject.toml for modern Python packaging
        progress.update("Creating pyproject.toml")
        pyproject_path = self.project_root / "pyproject.toml"
        pyproject_content = self.create_pyproject_toml()
        with open(pyproject_path, 'w') as f:
            f.write(pyproject_content)
        
        # Create MANIFEST.in for proper file inclusion
        progress.update("Creating MANIFEST.in")
        manifest_in_path = self.project_root / "MANIFEST.in"
        manifest_in_content = self.create_manifest_in()
        with open(manifest_in_path, 'w') as f:
            f.write(manifest_in_content)
        
        # Create manifest
        progress.update("Creating Flatpak manifest")
        manifest = self.create_flatpak_manifest()
        manifest_path = self.build_dir / f"{APP_ID}.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        progress.finish("Build environment prepared")
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
        bundle_path = self.project_root / f"{APP_ID}-{APP_VERSION}.flatpak"
        
        # Calculate repository size for progress estimation
        try:
            repo_size = sum(f.stat().st_size for f in self.repo_dir.rglob('*') if f.is_file())
            repo_size_mb = repo_size / (1024 * 1024)
        except:
            repo_size_mb = 100  # Default estimate
        
        print(f"🔨 Creating Flatpak bundle: [{' ' * 40}] 0.0% - Analyzing {repo_size_mb:.0f}MB repository...", end="", flush=True)
        
        try:
            cmd = [
                'flatpak', 'build-bundle',
                str(self.repo_dir),
                str(bundle_path),
                APP_ID
            ]
            
            if self.debug:
                print(f"\n🔧 Running: {' '.join(cmd)}")
                result = subprocess.run(cmd, text=True)
            else:
                # Run process and show simple progress
                start_time = time.time()
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                
                # Simple progress animation while process runs
                progress_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
                char_index = 0
                
                while process.poll() is None:
                    elapsed = time.time() - start_time
                    char = progress_chars[char_index % len(progress_chars)]
                    
                    if elapsed < 60:
                        print(f"\r{char} Creating Flatpak bundle: Compressing {repo_size_mb:.0f}MB repository... ({elapsed:.0f}s)", end="", flush=True)
                    else:
                        print(f"\r{char} Creating Flatpak bundle: Large bundle - still compressing... ({elapsed:.0f}s)", end="", flush=True)
                    
                    char_index += 1
                    time.sleep(0.2)
                
                # Get final result
                stdout, stderr = process.communicate()
                result = process
            
            # Clear progress line and show completion
            elapsed = time.time() - start_time if 'start_time' in locals() else 0
            elapsed_str = f"{int(elapsed//60):02d}:{int(elapsed%60):02d}"
            
            if result.returncode == 0:
                if bundle_path.exists():
                    size_mb = bundle_path.stat().st_size / (1024 * 1024)
                    print(f"\r✅ Creating Flatpak bundle completed in {elapsed_str}")
                    print(f"📦 Bundle created: {bundle_path}")
                    print(f"📏 Bundle size: {size_mb:.1f} MB")
                    return True
                else:
                    print(f"\r❌ Bundle creation reported success but file not found")
                    return False
            else:
                error_msg = stderr if 'stderr' in locals() and stderr else "Unknown error"
                print(f"\r❌ Bundle creation failed after {elapsed_str}: {error_msg}")
                return False
                
        except Exception as e:
            print(f"\r❌ Unexpected error creating bundle: {e}")
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
    
    # Overall build progress
    total_steps = 4
    if args.clean:
        total_steps += 1
    
    overall_progress = ProgressBar(total_steps, "Overall Build Progress")
    
    # Clean if requested
    if args.clean:
        overall_progress.update("Cleaning previous builds")
        if builder.build_dir.exists():
            shutil.rmtree(builder.build_dir)
        if builder.repo_dir.exists():
            shutil.rmtree(builder.repo_dir)
    
    # Prepare build environment
    overall_progress.update("Preparing build environment")
    if not builder.prepare_build_environment():
        sys.exit(1)
    
    # Build Flatpak
    overall_progress.update("Building Flatpak package")
    spinner = SpinnerProgress("Building Flatpak package (this may take several minutes)")
    spinner.start()
    
    success = builder.build_flatpak()
    spinner.stop("Build completed" if success else "Build failed")
    
    if not success:
        sys.exit(1)
    
    # Create bundle
    overall_progress.update("Creating distribution bundle")
    if not builder.create_bundle():
        sys.exit(1)
    
    overall_progress.finish("Flatpak build completed successfully!")
    
    # Show installation instructions
    builder.show_installation_instructions()
    
    print(f"\n🎉 Build completed successfully!")
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