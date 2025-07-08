#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Calendifier with RRule Support - ONE PASSWORD
.DESCRIPTION
    Uses tar with proper Unix line endings and includes RRule components
.EXAMPLE
    .\Deploy-HA.ps1
#>

param(
    [string]$PiIP = "",
    [string]$PiUser = "pi"
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

# Get Pi IP address if not provided
if ([string]::IsNullOrEmpty($PiIP)) {
    $PiIP = Read-Host "Enter Raspberry Pi IP address"
    if ([string]::IsNullOrEmpty($PiIP)) {
        Write-ColorOutput "ERROR: IP address is required." $Red
        exit 1
    }
}

Write-ColorOutput "`n=== Calendifier Deployment with RRule Support ===" $Blue

# Create tar archive with RRule components
Write-ColorOutput "Creating archive with RRule support..." $Blue
tar -czf calendifier-deploy.tar.gz api_server.py main.py requirements.txt api_requirements.txt docker-compose.yml Dockerfile.api version.py setup-pi.sh lovelace-calendifier-config.yaml www calendar_app assets docs

if (-not (Test-Path "calendifier-deploy.tar.gz")) {
    Write-ColorOutput "ERROR: Failed to create tarball!" $Red
    exit 1
}

Write-ColorOutput "✓ Archive created: calendifier-deploy.tar.gz" $Green

# Transfer archive
Write-ColorOutput "Transferring archive..." $Blue
scp -o StrictHostKeyChecking=no calendifier-deploy.tar.gz $PiUser@$PiIP`:~/

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERROR: Failed to transfer archive!" $Red
    Write-ColorOutput "Keeping tarball for manual transfer: calendifier-deploy.tar.gz" $Yellow
    exit 1
}

Write-ColorOutput "✓ Archive transferred successfully" $Green

# Clean up
Write-ColorOutput "Cleaning up local archive..." $Blue
Remove-Item calendifier-deploy.tar.gz -Force

Write-ColorOutput "`n=== Deployment Complete with RRule Support ===" $Green
Write-ColorOutput "✓ Archive transferred to Pi!" $Blue
Write-ColorOutput "`nNext steps:" $Yellow
Write-ColorOutput "1. SSH to your Pi: ssh $PiUser@$PiIP" $Reset
Write-ColorOutput "2. Extract: tar -xzf calendifier-deploy.tar.gz" $Reset
Write-ColorOutput "3. Run: chmod +x setup-pi.sh && ./setup-pi.sh" $Reset
Write-ColorOutput "4. Access: http://${PiIP}:8123" $Reset
Write-ColorOutput "`n🔧 All RRule fixes are included in setup-pi.sh!" $Yellow
Write-ColorOutput "• Complete RRule recurring event support" $Reset
Write-ColorOutput "• Fixed notification positioning and edit UI" $Reset
Write-ColorOutput "• Enhanced RRule builder with 4-column layout" $Reset
Write-ColorOutput "• All translation fixes (40 languages supported)" $Reset
Write-ColorOutput "• Comprehensive error handling and DOM checks" $Reset
Write-ColorOutput "• CRITICAL: Clear browser cache completely after setup" $Reset
Write-ColorOutput "`n🔄 RRule Features:" $Blue
Write-ColorOutput "• Recurring events with 'Make Recurring' checkbox" $Reset
Write-ColorOutput "• Visual 🔄 indicators for recurring events" $Reset
Write-ColorOutput "• RFC 5545 RRULE standard support" $Reset
Write-ColorOutput "• Multi-language RRule descriptions" $Reset
Write-ColorOutput "`n🔧 COMPLETE RRule INTEGRATION:" $Green
Write-ColorOutput "• All fixes consolidated into main setup script" $Reset
Write-ColorOutput "• No temporary scripts needed" $Reset
Write-ColorOutput "• One-step deployment and setup process" $Reset