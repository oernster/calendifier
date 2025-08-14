#!/usr/bin/env python3
"""
Style initialization module for Calendifier
This module detects the desktop environment and sets appropriate Qt/PySide6 styles
"""

import os
import sys
import platform
import subprocess
from pathlib import Path


def detect_desktop_environment():
    """Detect the current desktop environment"""
    # Check environment variables first
    desktop_env = os.environ.get('XDG_CURRENT_DESKTOP', '')
    if not desktop_env:
        desktop_env = os.environ.get('DESKTOP_SESSION', '')
    
    # Convert to uppercase for easier comparison
    desktop_env = desktop_env.upper()
    
    # Check for specific desktop environments
    if 'XFCE' in desktop_env:
        return 'XFCE'
    elif 'CINNAMON' in desktop_env:
        return 'CINNAMON'
    elif 'GNOME' in desktop_env:
        return 'GNOME'
    elif 'KDE' in desktop_env or 'PLASMA' in desktop_env:
        return 'KDE'
    elif 'HYPRLAND' in desktop_env:
        return 'HYPRLAND'
    
    # If environment variables don't provide the answer, try process detection
    try:
        # Check for running processes
        processes = subprocess.check_output(['ps', 'aux'], text=True).lower()
        
        if 'xfce4-session' in processes or 'xfwm4' in processes:
            return 'XFCE'
        elif 'cinnamon' in processes:
            return 'CINNAMON'
        elif 'gnome-shell' in processes:
            return 'GNOME'
        elif 'plasmashell' in processes:
            return 'KDE'
        elif 'hyprland' in processes:
            return 'HYPRLAND'
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    
    # Default to unknown
    return 'UNKNOWN'


def detect_wayland():
    """Detect if running under Wayland"""
    return 'WAYLAND_DISPLAY' in os.environ


def set_style_for_desktop():
    """Set appropriate Qt/PySide6 style based on desktop environment"""
    # Import PySide6 here to avoid early initialization
    try:
        from PySide6 import QtCore, QtGui, QtWidgets
        from PySide6.QtCore import Qt
    except ImportError:
        print("Warning: PySide6 not available, style initialization skipped")
        return
    
    desktop = detect_desktop_environment()
    is_wayland = detect_wayland()
    
    print(f"Detected desktop environment: {desktop}")
    print(f"Running under Wayland: {is_wayland}")
    
    # Create Qt application if it doesn't exist yet
    if not QtWidgets.QApplication.instance():
        # This is just for style initialization, the real app will be created in main.py
        app = QtWidgets.QApplication([])
    else:
        app = QtWidgets.QApplication.instance()
    
    # Set application attributes
    QtCore.QCoreApplication.setAttribute(Qt.AA_UseHighDpiPixmaps)
    QtCore.QCoreApplication.setAttribute(Qt.AA_EnableHighDpiScaling)
    
    # Set common style properties
    app.setStyle('Fusion')  # Use Fusion as a fallback style
    
    # Desktop-specific style settings
    if desktop == 'XFCE':
        print("Applying XFCE-specific style settings")
        
        # Try to use GTK style if available
        available_styles = QtWidgets.QStyleFactory.keys()
        print(f"Available styles: {', '.join(available_styles)}")
        
        if 'gtk2' in available_styles:
            app.setStyle('gtk2')
            print("Using gtk2 style")
        elif 'GTK+' in available_styles:
            app.setStyle('GTK+')
            print("Using GTK+ style")
        
        # Set platform theme
        os.environ['QT_QPA_PLATFORMTHEME'] = 'gtk3'
        
        # Set palette to match GTK
        palette = app.palette()
        app.setPalette(palette)
        
        # Set font to match system
        font = app.font()
        app.setFont(font)
        
    elif desktop == 'HYPRLAND' or is_wayland:
        print("Applying Wayland/Hyprland-specific style settings")
        
        # Set Wayland-specific environment variables
        os.environ['QT_QPA_PLATFORM'] = 'wayland'
        os.environ['QT_WAYLAND_DISABLE_WINDOWDECORATION'] = '1'
        
        # Use breeze style if available for KDE integration
        if 'breeze' in QtWidgets.QStyleFactory.keys():
            app.setStyle('breeze')
            print("Using breeze style")
    
    elif desktop == 'KDE':
        print("Applying KDE-specific style settings")
        
        # Use breeze style if available
        if 'breeze' in QtWidgets.QStyleFactory.keys():
            app.setStyle('breeze')
            print("Using breeze style")
    
    elif desktop == 'GNOME':
        print("Applying GNOME-specific style settings")
        
        # Use Adwaita style if available
        if 'Adwaita' in QtWidgets.QStyleFactory.keys():
            app.setStyle('Adwaita')
            print("Using Adwaita style")
        
        # Set platform theme
        os.environ['QT_QPA_PLATFORMTHEME'] = 'gnome'
    
    # Print final style information
    print(f"Final style: {app.style().objectName()}")
    
    # Return the app instance in case it's needed
    return app


if __name__ == "__main__":
    # If run directly, just print the detected environment
    desktop = detect_desktop_environment()
    is_wayland = detect_wayland()
    print(f"Detected desktop environment: {desktop}")
    print(f"Running under Wayland: {is_wayland}")