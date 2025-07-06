#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Calendifier with ONE PASSWORD - Fixed line endings
.DESCRIPTION
    Uses tar with proper Unix line endings
.EXAMPLE
    .\Deploy-Final.ps1
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

Write-ColorOutput "`n=== ONE PASSWORD Deployment (Fixed) ===" $Blue

# Ensure setup-pi.sh has Unix line endings before archiving
Write-ColorOutput "Ensuring Unix line endings..." $Blue
$SetupScript = Get-Content setup-pi.sh -Raw
$UnixSetupScript = $SetupScript -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText("setup-pi.sh", $UnixSetupScript, [System.Text.UTF8Encoding]::new($false))

# Create tar archive
Write-ColorOutput "Creating archive..." $Blue
tar -czf calendifier-deploy.tar.gz api_server.py main.py requirements.txt api_requirements.txt docker-compose.yml Dockerfile.api version.py setup-pi.sh lovelace-calendifier-config.yaml www calendar_app assets docs

Write-ColorOutput "`nDeploying with ONE password..." $Blue

# Create the remote script with proper Unix line endings
$RemoteScript = @"
cat > calendifier-deploy.tar.gz
mkdir -p ~/calendifier ~/calendifier/homeassistant/www
tar -xzf calendifier-deploy.tar.gz
mv api_server.py main.py requirements.txt api_requirements.txt docker-compose.yml Dockerfile.api version.py setup-pi.sh lovelace-calendifier-config.yaml ~/calendifier/
mv www calendar_app assets docs ~/calendifier/
cp -r ~/calendifier/www/* ~/calendifier/homeassistant/www/
chmod -R 755 ~/calendifier
chmod +x ~/calendifier/setup-pi.sh
rm calendifier-deploy.tar.gz
echo DEPLOYMENT_COMPLETE
"@

# Convert to Unix line endings and send
$UnixScript = $RemoteScript -replace "`r`n", "`n" -replace "`r", "`n"

# Send everything in one command
cmd /c "type calendifier-deploy.tar.gz | ssh -o StrictHostKeyChecking=no $PiUser@$PiIP `"$UnixScript`""

# Clean up
Remove-Item calendifier-deploy.tar.gz -Force

Write-ColorOutput "`n=== Deployment Complete ===" $Green
Write-ColorOutput "✓ ONE password only!" $Blue
Write-ColorOutput "`nNext steps:" $Yellow
Write-ColorOutput "1. SSH to your Pi: ssh $PiUser@$PiIP" $Reset
Write-ColorOutput "2. Run: cd calendifier && ./setup-pi.sh" $Reset
Write-ColorOutput "3. Access: http://$PiIP:8123" $Reset
Write-ColorOutput "`nWide Layout:" $Blue
Write-ColorOutput "• Wide cards are automatically applied during setup" $Reset
Write-ColorOutput "• Clear browser cache if cards appear narrow" $Reset