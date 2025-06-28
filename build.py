#!/usr/bin/env python3
"""
🚀 Nuitka Build Script for Calendifier

This script builds Calendifier into a single executable using Nuitka
while complying with PySide6's LGPL3 license requirements.

LGPL3 Compliance:
- Source code availability information is included
- License files are bundled with the executable

Usage:
    python build.py [--debug] [--clean]

Requirements:
    pip install nuitka
"""

import os
import sys
import shutil
import subprocess
import platform
import argparse
import threading
import time
from pathlib import Path
from typing import List, Optional

# Build configuration
APP_NAME = "Calendifier"
APP_VERSION = "1.1.0"
MAIN_SCRIPT = "main.py"
OUTPUT_DIR = "dist"
BUILD_DIR = "build"

def get_platform_specific_options() -> List[str]:
    """Get platform-specific Nuitka options."""
    options = []
    
    if platform.system() == "Windows":
        options.extend([
            "--windows-console-mode=disable",  # No console window
            "--windows-icon-from-ico=assets/calendar_icon.ico",  # Application icon
            "--windows-company-name=Oliver Ernster",
            "--windows-product-name=Calendifier",
            "--windows-file-version=1.1.0.0",
            "--windows-product-version=1.1.0.0",
            "--windows-file-description=Cross-platform Desktop Calendar Application"
        ])
    elif platform.system() == "Darwin":  # macOS
        options.extend([
            "--macos-app-icon=assets/calendar_icon.icns",  # macOS icon (if available)
            "--macos-app-name=Calendifier",
            "--macos-app-version=1.1.0"
        ])
    elif platform.system() == "Linux":
        options.extend([
            "--linux-icon=assets/calendar_icon.png"  # Linux icon (if available)
        ])
    
    return options

def get_nuitka_options(debug: bool = False) -> List[str]:
    """Generate Nuitka compilation options."""
    options = [
        # Basic compilation options
        "--onefile",  # Single executable file (default mode)
        "--assume-yes-for-downloads",  # Auto-download dependencies
        
        # Output configuration
        f"--output-dir={OUTPUT_DIR}",
        f"--output-filename=calendifier",
        
        # Performance options
        "--lto=yes" if not debug else "--lto=no",  # Link-time optimization
        "--jobs=4",  # Parallel compilation
        
        # Python optimization
        "--python-flag=no_site" if not debug else "",
        "--python-flag=no_warnings" if not debug else "",
        
        # Plugin configuration
        "--enable-plugin=pyside6",  # PySide6 support
        
        # Include data files and directories
        "--include-data-dir=calendar_app/localization/translations=calendar_app/localization/translations",
        "--include-data-dir=calendar_app/localization/locale_holiday_translations=calendar_app/localization/locale_holiday_translations",
        "--include-data-dir=assets=assets",
        
        # Include package data
        "--include-package-data=calendar_app",
        "--include-package-data=holidays",
        
        # Clean output - remove intermediate files
        "--remove-output",  # Remove build directory after successful build
        
        # Debug options
        "--debug" if debug else "",
        "--verbose" if debug else "",
        
        # Optimization
        "--prefer-source-code" if debug else "",
    ]
    
    # Add platform-specific options
    options.extend(get_platform_specific_options())
    
    # Remove empty options
    return [opt for opt in options if opt]

def create_license_bundle():
    """Create license bundle for LGPL compliance in dist root."""
    # Copy application license to dist root
    if Path("LICENSE").exists():
        shutil.copy2("LICENSE", Path(OUTPUT_DIR) / "CALENDIFIER_LICENSE.txt")
        print("📄 Copied Calendifier license to dist root")
    
    # Create LGPL compliance notice in dist root
    lgpl_notice = """
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

For questions about LGPL compliance, contact: oliver.ernster@example.com

Generated on: {build_date}
Calendifier Version: {version}
"""
    
    from datetime import datetime
    notice_content = lgpl_notice.format(
        build_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        version=APP_VERSION
    )
    
    with open(Path(OUTPUT_DIR) / "LGPL3_COMPLIANCE_NOTICE.txt", "w", encoding="utf-8") as f:
        f.write(notice_content.strip())
    
    print("📄 Created LGPL3 compliance notice in dist root")

def check_dependencies():
    """Check if required dependencies are installed."""
    try:
        import nuitka
        # Try to get version from different possible locations
        try:
            version = nuitka.__version__
        except AttributeError:
            try:
                from nuitka.Version import getNuitkaVersion
                version = getNuitkaVersion()
            except:
                version = "installed"
        print(f"✅ Nuitka found: {version}")
    except ImportError:
        print("❌ Nuitka not found. Install with: pip install nuitka")
        return False
    
    # Check if main script exists
    if not Path(MAIN_SCRIPT).exists():
        print(f"❌ Main script not found: {MAIN_SCRIPT}")
        return False
    
    # Check if assets directory exists
    if not Path("assets").exists():
        print("⚠️ Assets directory not found. Icon may not be included.")
    
    return True

def clean_build():
    """Clean previous build artifacts."""
    dirs_to_clean = [OUTPUT_DIR, BUILD_DIR, "calendifier.build", "calendifier.dist"]
    
    for dir_path in dirs_to_clean:
        if Path(dir_path).exists():
            shutil.rmtree(dir_path)
            print(f"🧹 Cleaned directory: {dir_path}")

def clean_dist_directory():
    """Clean the dist directory before building."""
    if Path(OUTPUT_DIR).exists():
        shutil.rmtree(OUTPUT_DIR)
        print(f"🧹 Cleaned output directory: {OUTPUT_DIR}")
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

def cleanup_dist_directory():
    """Clean up dist directory to keep only the main executable and license files."""
    dist_path = Path(OUTPUT_DIR)
    if not dist_path.exists():
        return
    
    # Files to keep in dist root
    exe_name = f"calendifier{'.exe' if platform.system() == 'Windows' else ''}"
    files_to_keep = {
        exe_name,
        "CALENDIFIER_LICENSE.txt",
        "LGPL3_COMPLIANCE_NOTICE.txt"
    }
    
    # Remove any files/directories that aren't in our keep list
    removed_count = 0
    for item in dist_path.iterdir():
        if item.name not in files_to_keep:
            if item.is_dir():
                shutil.rmtree(item)
                print(f"🧹 Removed directory: {item.name}")
            else:
                item.unlink()
                print(f"🧹 Removed file: {item.name}")
            removed_count += 1
    
    if removed_count > 0:
        print(f"🧹 Cleaned up {removed_count} extra items from dist directory")
    else:
        print("✨ Dist directory already clean")

def show_progress_spinner():
    """Show a spinning progress indicator."""
    spinner_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    i = 0
    while not getattr(show_progress_spinner, 'stop', False):
        print(f"\r{spinner_chars[i % len(spinner_chars)]} Compiling...", end="", flush=True)
        time.sleep(0.1)
        i += 1
    print("\r" + " " * 20 + "\r", end="", flush=True)  # Clear the spinner

def parse_nuitka_progress(line: str) -> Optional[str]:
    """Parse Nuitka output line for progress information."""
    line = line.strip()
    
    # Common Nuitka progress indicators
    progress_indicators = [
        ("Nuitka-Options:", "🔧 Parsing options"),
        ("Nuitka-Plugins:", "🔌 Loading plugins"),
        ("Nuitka:INFO:", "ℹ️"),
        ("Nuitka:WARNING:", "⚠️"),
        ("Nuitka-Progress:", "📊"),
        ("Creating single file", "📦 Creating executable"),
        ("Running data composer", "🎵 Composing data"),
        ("Backend C compiler", "⚙️ C compilation"),
        ("Linking", "🔗 Linking"),
        ("Optimizing", "⚡ Optimizing"),
        ("Collecting", "📥 Collecting dependencies"),
        ("Including", "📂 Including files"),
        ("Processing", "⚙️ Processing"),
        ("Completed", "✅ Completed"),
    ]
    
    for indicator, emoji in progress_indicators:
        if indicator in line:
            # Clean up the line for display
            clean_line = line.replace("Nuitka:", "").replace("INFO:", "").replace("WARNING:", "").strip()
            return f"{emoji} {clean_line}"
    
    return None

def build_application(debug: bool = False):
    """Build the application using Nuitka with real-time progress."""
    print(f"🚀 Building {APP_NAME} v{APP_VERSION}")
    print(f"📦 Platform: {platform.system()} {platform.machine()}")
    print(f"🐍 Python: {sys.version}")
    
    # Clean dist directory before building
    clean_dist_directory()
    
    # Get Nuitka options
    nuitka_options = get_nuitka_options(debug)
    
    # Build command
    cmd = [sys.executable, "-m", "nuitka"] + nuitka_options + [MAIN_SCRIPT]
    
    print(f"🔨 Running Nuitka compilation...")
    if debug:
        print(f"Command: {' '.join(cmd)}")
    
    try:
        # Start progress spinner in a separate thread for non-debug mode
        spinner_thread = None
        if not debug:
            show_progress_spinner.stop = False
            spinner_thread = threading.Thread(target=show_progress_spinner, daemon=True)
            spinner_thread.start()
        
        # Run Nuitka compilation with real-time output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        output_lines = []
        last_progress_time = time.time()
        
        # Read output line by line
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            
            if line:
                line = line.rstrip()
                output_lines.append(line)
                
                # Parse for progress information
                progress_msg = parse_nuitka_progress(line)
                if progress_msg:
                    # Stop spinner temporarily to show progress
                    if spinner_thread and not debug:
                        show_progress_spinner.stop = True
                        if spinner_thread.is_alive():
                            spinner_thread.join(timeout=0.1)
                        print(f"\r{progress_msg}")
                        # Restart spinner
                        show_progress_spinner.stop = False
                        spinner_thread = threading.Thread(target=show_progress_spinner, daemon=True)
                        spinner_thread.start()
                    elif debug:
                        print(progress_msg)
                    
                    last_progress_time = time.time()
                elif debug:
                    # In debug mode, show all output
                    print(line)
                elif time.time() - last_progress_time > 30:  # Show heartbeat every 30 seconds
                    if spinner_thread:
                        show_progress_spinner.stop = True
                        if spinner_thread.is_alive():
                            spinner_thread.join(timeout=0.1)
                        print(f"\r💓 Still compiling... (this may take several minutes)")
                        show_progress_spinner.stop = False
                        spinner_thread = threading.Thread(target=show_progress_spinner, daemon=True)
                        spinner_thread.start()
                    last_progress_time = time.time()
        
        # Stop spinner
        if spinner_thread:
            show_progress_spinner.stop = True
            if spinner_thread.is_alive():
                spinner_thread.join(timeout=0.5)
        
        # Wait for process to complete
        return_code = process.wait()
        
        if return_code == 0:
            print("✅ Compilation successful!")
            
            # Create license bundle for LGPL compliance
            create_license_bundle()
            
            # Clean up any extra files in dist directory (keep only exe and license files)
            cleanup_dist_directory()
            
            # Show output information
            output_file = Path(OUTPUT_DIR) / f"calendifier{'.exe' if platform.system() == 'Windows' else ''}"
            if output_file.exists():
                size_mb = output_file.stat().st_size / (1024 * 1024)
                print(f"📦 Output file: {output_file}")
                print(f"📏 File size: {size_mb:.1f} MB")
                print(f"🎯 Ready to distribute!")
                
                # Show final dist contents
                dist_files = list(Path(OUTPUT_DIR).iterdir())
                print(f"📁 Dist directory contains {len(dist_files)} files:")
                for file in sorted(dist_files):
                    print(f"   • {file.name}")
            else:
                print("⚠️ Output file not found in expected location")
            
            return True
        else:
            print(f"❌ Compilation failed with exit code {return_code}")
            if not debug:
                print("📝 Full output:")
                for line in output_lines[-50:]:  # Show last 50 lines
                    print(line)
            return False
        
    except Exception as e:
        # Stop spinner on error
        if 'spinner_thread' in locals() and spinner_thread:
            show_progress_spinner.stop = True
            if spinner_thread.is_alive():
                spinner_thread.join(timeout=0.5)
        
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Main build script entry point."""
    parser = argparse.ArgumentParser(description=f"Build {APP_NAME} using Nuitka")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--clean", action="store_true", help="Clean build artifacts before building")
    
    args = parser.parse_args()
    
    print(f"🏗️ {APP_NAME} Build Script")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Clean if requested
    if args.clean:
        clean_build()
    
    # Build application
    success = build_application(debug=args.debug)
    
    if success:
        print("\n🎉 Build completed successfully!")
        print("\nLGPL3 Compliance:")
        print("- License information included in dist/licenses/")
        print("- Source code availability notice provided")
        print("- PySide6 replacement instructions included")
        sys.exit(0)
    else:
        print("\n💥 Build failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()