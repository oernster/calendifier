#!/bin/bash

# Calendifier System Cleanup Script
# Removes all system references while preserving ~/Development/calendifier/

echo "=== Calendifier System Cleanup Script ==="
echo "This will remove all system references to calendifier while preserving your development directory."
echo

# Force remove flatpak installations
echo "1. Removing flatpak installations..."
flatpak --user uninstall com.calendifier.Calendar --delete-data 2>/dev/null || true
sudo flatpak uninstall com.calendifier.Calendar --delete-data 2>/dev/null || true

# Remove flatpak repository references
echo "2. Cleaning flatpak repository references..."
rm -rf ~/.local/share/flatpak/repo/refs/heads/deploy/app/com.calendifier.Calendar 2>/dev/null || true
rm -rf ~/.local/share/flatpak/repo/refs/remotes/calendar-origin/app/com.calendifier.Calendar 2>/dev/null || true

# Clean up runtime files (ignore permission errors)
echo "3. Cleaning runtime files..."
rm -rf /run/user/1000/app/com.calendifier.Calendar 2>/dev/null || true
rm -rf /run/user/1000/doc/by-app/com.calendifier.Calendar 2>/dev/null || true
rm -rf /run/user/1000/.flatpak/com.calendifier.Calendar 2>/dev/null || true

# Remove exported desktop files and icons
echo "4. Removing exported desktop files and icons..."
rm -f ~/.local/share/flatpak/exports/share/applications/com.calendifier.Calendar.desktop 2>/dev/null || true
find ~/.local/share/flatpak/exports/ -name "*calendifier*" -delete 2>/dev/null || true

# Clean up any remaining user desktop files
echo "5. Cleaning user desktop files..."
find ~/.local/share/applications/ -name "*calendifier*" -delete 2>/dev/null || true
find ~/.local/share/applications/ -name "*Calendifier*" -delete 2>/dev/null || true

# Clean up system desktop files
echo "6. Cleaning system desktop files..."
sudo find /usr/share/applications/ -name "*calendifier*" -delete 2>/dev/null || true
sudo find /usr/share/applications/ -name "*Calendifier*" -delete 2>/dev/null || true

# Remove user data and configuration (excluding development directory)
echo "7. Removing user data and configuration..."
rm -rf ~/.local/share/calendifier/ 2>/dev/null || true
rm -rf ~/.config/calendifier/ 2>/dev/null || true
rm -rf ~/.cache/calendifier/ 2>/dev/null || true
rm -rf ~/.var/app/*calendifier* 2>/dev/null || true

# Remove icons
echo "8. Removing icons..."
find ~/.local/share/icons/ -name "*calendifier*" -delete 2>/dev/null || true
find ~/.icons/ -name "*calendifier*" -delete 2>/dev/null || true
sudo find /usr/share/icons/ -name "*calendifier*" -delete 2>/dev/null || true
sudo find /usr/share/pixmaps/ -name "*calendifier*" -delete 2>/dev/null || true

# Clean MIME associations
echo "9. Cleaning MIME associations..."
find ~/.local/share/mime/ -name "*calendifier*" -delete 2>/dev/null || true
find ~/.local/share/applications/ -name "mimeinfo.cache" -delete 2>/dev/null || true

# Update desktop and icon databases
echo "10. Updating desktop and icon databases..."
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
sudo update-desktop-database /usr/share/applications/ 2>/dev/null || true
update-mime-database ~/.local/share/mime/ 2>/dev/null || true
gtk-update-icon-cache ~/.local/share/icons/hicolor/ 2>/dev/null || true
sudo gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true

# Restart XFCE panel
echo "11. Restarting XFCE panel..."
xfce4-panel --restart 2>/dev/null || true

echo
echo "=== Cleanup Complete ==="
echo "Your development directory ~/Development/calendifier/ has been preserved."
echo "Please log out and back in to ensure all menu changes take effect."
echo
echo "To verify cleanup, you can run:"
echo "  flatpak list | grep -i calendifier"
echo "  find / -name '*calendifier*' 2>/dev/null | grep -v Development | grep -v mnt | grep -v proc | grep -v sys"
