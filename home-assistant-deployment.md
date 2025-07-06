# 🏠 Home Assistant Deployment Guide

This guide will walk you through deploying Calendifier as beautiful dashboard cards in Home Assistant for web-based access.

## 📋 Prerequisites

- **Raspberry Pi** or **Linux server** with Docker
- **SSH access** to your server
- **Windows PC, Mac, or Linux** for deployment script
- **Home Assistant** already installed on your Pi/server

## 🚀 Quick Deployment Steps

### Step 1: Deploy from Your Computer

Choose your operating system:

#### 🪟 Windows (PowerShell)
On your Windows machine, open PowerShell and run:

```powershell
.\Deploy-HA.ps1
```

#### 🍎 Mac / 🐧 Linux (Bash)
On your Mac or Linux machine, open Terminal and run:

```bash
# Make the script executable first
chmod +x deploy-ha.sh

# Run the deployment script
./deploy-ha.sh
```

Both scripts will:
- Package the Calendifier application
- Transfer it to your Raspberry Pi
- Set up the necessary files for Home Assistant integration
- Require only ONE password prompt for SSH

### Step 2: SSH to Your Pi

Connect to your Raspberry Pi via SSH:

```bash
ssh pi@your-pi-ip-address
```

### Step 3: Extract the Application

Once connected to your Pi, extract the Calendifier package:

```bash
tar xvf calendifier*.tar.gz
```

### Step 4: Make Setup Script Executable

Make the setup script executable:

```bash
sudo chmod +x setup-pi.sh
```

### Step 5: Run Setup

Execute the setup script:

```bash
./setup-pi.sh
```

This will:
- Install Docker containers for the Calendifier API
- Configure Home Assistant integration
- Set up the web dashboard cards
- Configure automatic startup

### Step 6: Access Your Calendar

1. Open your Home Assistant web interface:
   ```
   http://your-pi-ip:8123
   ```

2. Log in to Home Assistant

3. Look for **"Calendifier"** in the left sidebar menu

4. Click on the Calendifier menu item to access your beautiful calendar dashboard!

## ✨ What You'll Get

After successful deployment, you'll have:

- 🎨 **Beautiful Dashboard Cards** - Clock, Calendar, Events, Notes, Settings, Data Management
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🌐 **Web Access** - Access from anywhere on your network
- 🔄 **Auto-Updates** - Cards refresh automatically
- 🎯 **Optimized Layout** - No overlapping, proper spacing
- 🌍 **40-Language Support** - Complete localization with runtime language switching
- 🏳️ **40-Country Holiday Support** - Intelligent holiday detection with native translations

## 🔧 Troubleshooting

### If the Calendifier menu doesn't appear:
1. Restart Home Assistant
2. Clear your browser cache
3. Check that the setup script completed without errors

### If you can't SSH to your Pi:
1. Ensure SSH is enabled on your Raspberry Pi
2. Check that you're using the correct IP address
3. Verify your Pi is connected to the network

### If the deploy script fails:
1. Ensure you have PowerShell execution policy set correctly
2. Check your network connection to the Pi
3. Verify the Pi's IP address is correct

## 📞 Support

If you encounter any issues during deployment:
- Check the console output for error messages
- Ensure all prerequisites are met
- Verify network connectivity between your Windows PC and Pi

---

**Enjoy your beautiful, multilingual calendar dashboard in Home Assistant! 🎉**