#!/usr/bin/env python3
"""
Calendifier Build Script
========================

A simple build script that uses PyInstaller to compile Calendifier into a standalone executable
and handles LGPL3 license compliance.

Usage:
    python build.py [options]

Options:
    --debug     Enable debug mode with verbose output
    --console   Enable console window (Windows only)
    --no-launch Don't launch the application after building
"""

import os
import sys
import shutil
import platform
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# Try to import version, or use default
try:
    from version import __version__
except ImportError:
    __version__ = "1.0.0"

# Configuration
APP_NAME = "Calendifier"
MAIN_SCRIPT = "main.py"
OUTPUT_DIR = "dist"
SPEC_FILE = "calendifier.spec"

def ensure_pyinstaller_installed():
    """Check if PyInstaller is installed, and install it if not."""
    try:
        import PyInstaller
        print("✅ PyInstaller is already installed")
        return True
    except ImportError:
        print("⚠️ PyInstaller not found. Attempting to install...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
            print("✅ PyInstaller installed successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to install PyInstaller: {e}")
            print("Please install PyInstaller manually: pip install pyinstaller")
            return False

def clean_output_directory():
    """Ensure output directory exists and is empty."""
    output_path = Path(OUTPUT_DIR)
    
    # Remove if exists
    if output_path.exists():
        shutil.rmtree(output_path)
        print(f"🧹 Cleaned output directory: {OUTPUT_DIR}")
    
    # Create fresh directory
    output_path.mkdir(parents=True)
    print(f"📁 Created output directory: {OUTPUT_DIR}")
    
    # Also clean build directory and spec file
    build_path = Path("build")
    if build_path.exists():
        shutil.rmtree(build_path)
        print(f"🧹 Cleaned build directory")
    
    spec_path = Path(SPEC_FILE)
    if spec_path.exists():
        spec_path.unlink()
        print(f"🧹 Removed spec file: {SPEC_FILE}")

def copy_license_files():
    """Copy LGPL3 license files to output directory."""
    output_path = Path(OUTPUT_DIR) / APP_NAME
    
    # Create directory if it doesn't exist
    if not output_path.exists():
        output_path.mkdir(parents=True)
    
    # Copy main license
    if Path("LICENSE").exists():
        shutil.copy2("LICENSE", output_path / "CALENDIFIER_LICENSE.txt")
        print("📄 Copied Calendifier license")
    
    # Copy LGPL3 license
    if Path("LGPL3_LICENSE.txt").exists():
        shutil.copy2("LGPL3_LICENSE.txt", output_path / "LGPL3_LICENSE.txt")
        print("📄 Copied LGPL3 license")
    
    # Copy or create LGPL3 compliance notice
    if Path("LGPL3_COMPLIANCE_NOTICE.txt").exists():
        with open("LGPL3_COMPLIANCE_NOTICE.txt", "r", encoding="utf-8") as f:
            notice = f.read()
        
        # Update placeholders
        notice = notice.replace("{build_date}", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        notice = notice.replace("{version}", __version__)
        
        with open(output_path / "LGPL3_COMPLIANCE_NOTICE.txt", "w", encoding="utf-8") as f:
            f.write(notice)
        print("📄 Updated and copied LGPL3 compliance notice")
    else:
        # Create a basic compliance notice
        notice = f"""
LGPL3 COMPLIANCE NOTICE FOR CALENDIFIER
=======================================

This application uses PySide6, which is licensed under LGPL3.
In compliance with LGPL3 requirements:

1. SOURCE CODE AVAILABILITY:
   - Calendifier source code: https://github.com/oernster/calendifier
   - PySide6 source code: https://code.qt.io/cgit/pyside/pyside-setup.git/

2. LIBRARY REPLACEMENT:
   While this is a single-file executable, the LGPL3 license grants you the right
   to replace the PySide6 libraries. To exercise this right:
   
   a) Download the Calendifier source code from the repository above
   b) Replace the PySide6 dependency in requirements.txt with your preferred version
   c) Rebuild the application using the provided build script
   
3. LGPL3 LICENSE:
   The full LGPL3 license text is available at:
   https://www.gnu.org/licenses/lgpl-3.0.html

4. DEPENDENCIES:
   This application includes the following LGPL3-licensed components:
   - PySide6 (Qt6 Python bindings)
   - shiboken6 (PySide6 support library)

Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Calendifier Version: {__version__}
"""
        with open(output_path / "LGPL3_COMPLIANCE_NOTICE.txt", "w", encoding="utf-8") as f:
            f.write(notice.strip())
        print("📄 Created LGPL3 compliance notice")

def build_with_pyinstaller(debug=False, console=False):
    """Build the application using PyInstaller."""
    print(f"🚀 Building {APP_NAME} v{__version__}")
    print(f"📦 Platform: {platform.system()} {platform.machine()}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    print(f"🖥️ Console mode: {'Enabled' if console else 'Disabled'}")
    
    # Basic PyInstaller options
    options = [
        "--name", APP_NAME,
        "--onefile",                          # Create a single executable
        "--clean",                            # Clean PyInstaller cache
        "--noconfirm",                        # Replace output directory without asking
    ]
    
    # Add data files
    data_files = [
        "calendar_app/localization/translations;calendar_app/localization/translations",
        "calendar_app/localization/locale_holiday_translations;calendar_app/localization/locale_holiday_translations",
        "calendar_app/localization/country_translations;calendar_app/localization/country_translations",
        "assets;assets",
    ]
    
    for data_file in data_files:
        options.extend(["--add-data", data_file])
    
    # Debug options
    if debug:
        options.extend(["-d", "all"])  # PyInstaller debug requires an argument
    
    # Console options
    if not console and platform.system() == "Windows":
        options.append("--windowed")
    
    # Platform-specific options
    if platform.system() == "Windows":
        if Path("assets/calendar_icon.ico").exists():
            options.extend(["--icon", "assets/calendar_icon.ico"])
    elif platform.system() == "Darwin":  # macOS
        if Path("assets/calendar_icon.icns").exists():
            options.extend(["--icon", "assets/calendar_icon.icns"])
    elif platform.system() == "Linux":
        if Path("assets/calendar_icon.png").exists():
            options.extend(["--icon", "assets/calendar_icon.png"])
    
    # Hidden imports for holidays package
    options.extend(["--hidden-import", "holidays"])
    options.extend(["--hidden-import", "holidays.countries"])
    
    # Build command
    cmd = [sys.executable, "-m", "PyInstaller"] + options + [MAIN_SCRIPT]
    
    print(f"🔨 Running PyInstaller compilation...")
    if debug:
        print(f"Command: {' '.join(cmd)}")
    
    try:
        # Run PyInstaller compilation
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Read output line by line
        for line in process.stdout:
            line = line.rstrip()
            print(line)
        
        # Wait for process to complete
        return_code = process.wait()
        
        if return_code == 0:
            print("✅ Compilation successful!")
            return True
        else:
            print(f"❌ Compilation failed with exit code {return_code}")
            return False
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def launch_executable():
    """Launch the built executable."""
    exe_name = f"{APP_NAME}{'.exe' if platform.system() == 'Windows' else ''}"
    exe_path = Path(OUTPUT_DIR) / APP_NAME / exe_name
    
    if not exe_path.exists():
        # Try alternative location (PyInstaller sometimes puts it directly in dist)
        exe_path = Path(OUTPUT_DIR) / exe_name
        if not exe_path.exists():
            print(f"❌ Executable not found at {exe_path}")
            return False
    
    print(f"🚀 Launching {exe_path}...")
    try:
        if platform.system() == "Windows":
            # Use subprocess.Popen to avoid blocking
            subprocess.Popen([str(exe_path)], creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            # For macOS and Linux
            subprocess.Popen([str(exe_path)])
        print("✅ Application launched successfully!")
        return True
    except Exception as e:
        print(f"❌ Failed to launch application: {e}")
        return False

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description=f"Build {APP_NAME} using PyInstaller")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--console", action="store_true", help="Enable console window on Windows")
    parser.add_argument("--no-launch", action="store_true", help="Don't launch the application after building")
    
    args = parser.parse_args()
    
    print(f"🏗️ {APP_NAME} Build Script")
    print("=" * 50)
    
    # Check if PyInstaller is installed
    if not ensure_pyinstaller_installed():
        sys.exit(1)
    
    # Check if main script exists
    if not Path(MAIN_SCRIPT).exists():
        print(f"❌ Main script not found: {MAIN_SCRIPT}")
        sys.exit(1)
    
    # Clean output directory
    clean_output_directory()
    
    # Build executable
    success = build_with_pyinstaller(debug=args.debug, console=args.console)
    
    if success:
        # Copy license files
        copy_license_files()
        
        print("\n🎉 Build completed successfully!")
        
        exe_name = f"{APP_NAME}{'.exe' if platform.system() == 'Windows' else ''}"
        exe_path = Path(OUTPUT_DIR) / APP_NAME / exe_name
        
        # Check alternative location if not found
        if not exe_path.exists():
            exe_path = Path(OUTPUT_DIR) / exe_name
        
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"📦 Output file: {exe_path}")
            print(f"📏 File size: {size_mb:.1f} MB")
            
            # List files in dist directory
            print("\n📁 Files in dist directory:")
            for root, dirs, files in os.walk(OUTPUT_DIR):
                for file in files:
                    rel_path = os.path.relpath(os.path.join(root, file), OUTPUT_DIR)
                    print(f"   • {rel_path}")
            
            # Launch the executable if not disabled
            if not args.no_launch:
                if launch_executable():
                    print("🎮 Application is now running!")
                else:
                    print("⚠️ Application could not be launched automatically.")
        else:
            print(f"⚠️ Expected executable not found: {exe_path}")
        
        sys.exit(0)
    else:
        print("\n💥 Build failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()