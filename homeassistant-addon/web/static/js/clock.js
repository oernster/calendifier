/**
 * Clock functionality for Calendifier
 */

class CalendifierClock {
    constructor() {
        this.ntpStatus = null;
        this.clockInterval = null;
        this.ntpCheckInterval = null;
        
        this.initializeElements();
        this.startClock();
        this.startNTPMonitoring();
    }

    initializeElements() {
        this.analogClock = document.getElementById('analog-clock');
        this.digitalClock = document.getElementById('digital-clock');
        this.dateDisplay = document.getElementById('date-display');
        this.ntpIndicator = document.getElementById('ntp-indicator');
        this.ntpText = document.getElementById('ntp-text');
        
        this.hourHand = this.analogClock.querySelector('.hour-hand');
        this.minuteHand = this.analogClock.querySelector('.minute-hand');
        this.secondHand = this.analogClock.querySelector('.second-hand');
    }

    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);
    }

    updateClock() {
        const now = new Date();
        
        // Update digital clock
        this.updateDigitalClock(now);
        
        // Update date display
        this.updateDateDisplay(now);
        
        // Update analog clock
        this.updateAnalogClock(now);
    }

    updateDigitalClock(now) {
        const timeString = now.toLocaleTimeString([], {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.digitalClock.textContent = timeString;
    }

    updateDateDisplay(now) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const dateString = now.toLocaleDateString(undefined, options);
        this.dateDisplay.textContent = dateString;
    }

    updateAnalogClock(now) {
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Calculate angles
        const secondAngle = (seconds * 6) - 90; // 6 degrees per second
        const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90; // 6 degrees per minute + smooth seconds
        const hourAngle = (hours * 30) + (minutes * 0.5) - 90; // 30 degrees per hour + smooth minutes

        // Apply rotations
        this.secondHand.style.transform = `rotate(${secondAngle}deg)`;
        this.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
        this.hourHand.style.transform = `rotate(${hourAngle}deg)`;
    }

    startNTPMonitoring() {
        this.checkNTPStatus();
        this.ntpCheckInterval = setInterval(() => {
            this.checkNTPStatus();
        }, 30000); // Check every 30 seconds
    }

    async checkNTPStatus() {
        try {
            this.ntpStatus = await calendifierAPI.getNTPStatus();
            this.updateNTPIndicator();
        } catch (error) {
            console.error('Error checking NTP status:', error);
            this.updateNTPIndicator({ is_synced: false, error: 'Connection failed' });
        }
    }

    updateNTPIndicator(status = null) {
        const ntpData = status || this.ntpStatus;
        
        if (!ntpData) {
            this.ntpText.textContent = 'Checking...';
            this.ntpIndicator.className = 'ntp-indicator checking';
            return;
        }

        if (ntpData.is_synced) {
            this.ntpText.textContent = `Synced${ntpData.server ? ` (${ntpData.server})` : ''}`;
            this.ntpIndicator.className = 'ntp-indicator synced';
            this.ntpIndicator.title = `Last sync: ${ntpData.last_sync || 'Unknown'}\nOffset: ${ntpData.offset || 0}ms`;
        } else {
            this.ntpText.textContent = ntpData.error || 'Not synced';
            this.ntpIndicator.className = 'ntp-indicator error';
            this.ntpIndicator.title = ntpData.error || 'NTP synchronization failed';
        }
    }

    async forceNTPSync() {
        try {
            this.ntpText.textContent = 'Syncing...';
            this.ntpIndicator.className = 'ntp-indicator syncing';
            
            const result = await calendifierAPI.syncNTP();
            
            if (result.success) {
                this.ntpStatus = {
                    is_synced: true,
                    server: result.server,
                    offset: result.offset,
                    last_sync: new Date().toISOString()
                };
            } else {
                this.ntpStatus = {
                    is_synced: false,
                    error: result.error || 'Sync failed'
                };
            }
            
            this.updateNTPIndicator();
            
        } catch (error) {
            console.error('Error forcing NTP sync:', error);
            this.ntpStatus = {
                is_synced: false,
                error: 'Sync request failed'
            };
            this.updateNTPIndicator();
        }
    }

    bindNTPClickHandler() {
        this.ntpIndicator.addEventListener('click', () => {
            this.forceNTPSync();
        });
        
        this.ntpIndicator.style.cursor = 'pointer';
        this.ntpIndicator.title = 'Click to force NTP synchronization';
    }

    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        if (this.ntpCheckInterval) {
            clearInterval(this.ntpCheckInterval);
        }
    }
}

// Initialize clock when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendifierClock = new CalendifierClock();
    window.calendifierClock.bindNTPClickHandler();
});