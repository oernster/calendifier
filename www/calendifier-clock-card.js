/**
 * Calendifier Clock Card - Enhanced with New Translation System
 * Displays analog and digital clocks with world time zones and NTP synchronization
 * Uses the new unified translation manager for reliable language support
 */

// Ensure base card is loaded first
(function() {
  function initClockCard() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initClockCard, 100);
      return;
    }

    class CalendifierClockCard extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.clockInterval = null;
        this.ntpSynced = false;
        this.timezone = 'UTC';
        this.use24Hour = true;
        this.worldTimezones = [
          { name: 'New York', flag: '🇺🇸', timezone: 'America/New_York' },
          { name: 'London', flag: '🇬🇧', timezone: 'Europe/London' },
          { name: 'Tokyo', flag: '🇯🇵', timezone: 'Asia/Tokyo' },
          { name: 'Sydney', flag: '🇦🇺', timezone: 'Australia/Sydney' },
          { name: 'Paris', flag: '🇫🇷', timezone: 'Europe/Paris' },
          { name: 'Dubai', flag: '🇦🇪', timezone: 'Asia/Dubai' }
        ];
        this.settings = {};
        this.loading = true;
      }

      async setConfig(config) {
        super.setConfig(config);
        
        // Load initial data
        await this.loadInitialData();
        
        // Listen for locale changes
        document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
        document.addEventListener('calendifier-locale-changed', this.handleLocaleChangeSync.bind(this));
        
        this.render();
        this.startClock();
        this.checkNTPStatus();
        // Auto-sync NTP on launch with delay to ensure card is fully ready
        setTimeout(() => {
          this.syncNTP();
        }, 2000);
      }

      async loadInitialData() {
        try {
          this.loading = true;
          this.render();
          
          await this.loadSettings();
          
          this.loading = false;
          this.render();
        } catch (error) {
          console.error('[ClockCard] Failed to load initial data:', error);
          this.loading = false;
          this.render();
        }
      }

      async loadSettings() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/settings`);
          if (response.ok) {
            this.settings = await response.json();
            this.timezone = this.settings.timezone || 'UTC';
            this.use24Hour = this.settings.time_format === '24h';
            
            // Load custom world timezones if configured
            if (this.settings.world_timezones) {
              this.worldTimezones = this.settings.world_timezones;
            }
          }
        } catch (error) {
        }
      }

      async saveSettings() {
        try {
          const updatedSettings = {
            ...this.settings,
            timezone: this.timezone,
            time_format: this.use24Hour ? '24h' : '12h',
            world_timezones: this.worldTimezones
          };
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/settings`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updatedSettings)
          });
          
          if (response.ok) {
            this.settings = updatedSettings;
            this.showNotification(this.t('settings.saved', 'Settings saved'), 'success');
          }
        } catch (error) {
          this.showNotification(this.t('settings.save_failed', 'Failed to save settings'), 'error');
        }
      }

      async checkNTPStatus() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/ntp/status`);
          if (response.ok) {
            const data = await response.json();
            this.ntpSynced = data.synced;
          } else {
            this.ntpSynced = false;
          }
        } catch (error) {
          this.ntpSynced = false;
        }
        // Always update display after checking status
        this.updateNTPDisplay();
      }

      async syncNTP() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/ntp/sync`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
          });
          
          if (response.ok) {
            const data = await response.json();
            this.ntpSynced = data.success;
            this.updateNTPDisplay();
            this.updateClockDisplay(); // Force clock update after sync
          } else {
            this.ntpSynced = false;
            this.updateNTPDisplay();
          }
        } catch (error) {
          console.error('NTP sync error:', error);
          this.ntpSynced = false;
          this.updateNTPDisplay();
        }
      }

      async toggleTimeFormat() {
        try {
          this.use24Hour = !this.use24Hour;
          await this.saveSettings();
          this.updateClockDisplay(); // Immediately update display
          this.render();
          // Auto-sync NTP after format change
          this.syncNTP();
        } catch (error) {
          console.error('Error toggling time format:', error);
          this.showNotification('Error changing time format', 'error');
        }
      }

      toggleSettings() {
        const settingsPanel = this.shadowRoot.querySelector('.settings-panel');
        settingsPanel.classList.toggle('show');
      }

      async updateTimezone(newTimezone) {
        try {
          this.timezone = newTimezone;
          await this.saveSettings();
          this.updateClockDisplay(); // Immediately update display
          this.render();
          // Auto-sync NTP after timezone change
          this.syncNTP();
        } catch (error) {
          console.error('Error updating timezone:', error);
          this.showNotification('Error changing timezone', 'error');
        }
      }

      updateWorldTimezone(index, timezone) {
        // Find the timezone info from predefined list
        const timezoneOptions = [
          { name: 'New York', flag: '🇺🇸', timezone: 'America/New_York' },
          { name: 'Los Angeles', flag: '🇺🇸', timezone: 'America/Los_Angeles' },
          { name: 'London', flag: '🇬🇧', timezone: 'Europe/London' },
          { name: 'Paris', flag: '🇫🇷', timezone: 'Europe/Paris' },
          { name: 'Berlin', flag: '🇩🇪', timezone: 'Europe/Berlin' },
          { name: 'Tokyo', flag: '🇯🇵', timezone: 'Asia/Tokyo' },
          { name: 'Shanghai', flag: '🇨🇳', timezone: 'Asia/Shanghai' },
          { name: 'Sydney', flag: '🇦🇺', timezone: 'Australia/Sydney' },
          { name: 'Mumbai', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
          { name: 'Dubai', flag: '🇦🇪', timezone: 'Asia/Dubai' }
        ];
        
        const selectedTimezone = timezoneOptions.find(tz => tz.timezone === timezone);
        if (selectedTimezone) {
          this.worldTimezones[index] = selectedTimezone;
          this.saveSettings();
          this.render();
        }
      }

      updateNTPDisplay() {
        const ntpStatus = this.shadowRoot.querySelector('.ntp-status');
        const syncButton = this.shadowRoot.querySelector('.sync-button');
        
        if (ntpStatus) {
          ntpStatus.className = `ntp-status ${this.ntpSynced ? 'synced' : 'not-synced'}`;
          ntpStatus.innerHTML = `
            <span>${this.ntpSynced ? '📡' : '⚠️'}</span>
            <span>NTP: ${this.ntpSynced ? this.t('connected', 'Connected') : this.t('disconnected', 'Disconnected')}</span>
          `;
        }
        
        if (syncButton) {
          syncButton.style.display = this.ntpSynced ? 'none' : 'flex';
        }
      }

      startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        
        this.clockInterval = setInterval(() => {
          this.updateClockDisplay();
        }, 1000);
        
        // Update immediately
        this.updateClockDisplay();
      }

      updateClockDisplay() {
        if (!this.shadowRoot) return;
        
        const now = new Date();
        const digitalTime = this.shadowRoot.querySelector('.digital-time');
        const digitalDate = this.shadowRoot.querySelector('.digital-date');
        const hourHand = this.shadowRoot.querySelector('.hour-hand');
        const minuteHand = this.shadowRoot.querySelector('.minute-hand');
        const secondHand = this.shadowRoot.querySelector('.second-hand');

        // Update digital display
        if (digitalTime) {
          const locale = (this.currentLocale || 'en-US').replace('_', '-');
          digitalTime.textContent = now.toLocaleTimeString(locale, {
            hour12: !this.use24Hour,
            timeZone: this.timezone
          });
        }

        if (digitalDate) {
          const locale = (this.currentLocale || 'en-US').replace('_', '-');
          digitalDate.textContent = now.toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: this.timezone
          });
        }

        // Update analog clock hands (always use local time for analog display)
        const localTime = new Date(now.toLocaleString("en-US", {timeZone: this.timezone}));
        const hours = localTime.getHours() % 12;
        const minutes = localTime.getMinutes();
        const seconds = localTime.getSeconds();

        const hourAngle = (hours * 30) + (minutes * 0.5);
        const minuteAngle = minutes * 6;
        const secondAngle = seconds * 6;

        if (hourHand) hourHand.style.transform = `rotate(${hourAngle}deg)`;
        if (minuteHand) minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
        if (secondHand) secondHand.style.transform = `rotate(${secondAngle}deg)`;

        // Update world clocks
        this.updateWorldClocks();
      }

      updateWorldClocks() {
        const worldClocks = this.shadowRoot.querySelectorAll('.world-clock-time');
        
        worldClocks.forEach((clock, index) => {
          if (this.worldTimezones[index]) {
            const locale = (this.currentLocale || 'en-US').replace('_', '-');
            const time = new Date().toLocaleTimeString(locale, {
              timeZone: this.worldTimezones[index].timezone,
              hour12: !this.use24Hour
            });
            clock.textContent = time;
          }
        });
      }

      handleLocaleChangeSync(event) {
        // Auto-sync NTP when locale changes
        setTimeout(() => {
          this.syncNTP();
        }, 1000); // Small delay to ensure locale is fully loaded
      }

      render() {
        if (this.loading) {
          this.shadowRoot.innerHTML = `
            <style>${this.getCommonStyles()}</style>
            ${this.renderLoadingState(this.t('loading', 'Loading clock...'))}
          `;
          return;
        }

        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            .header-actions {
              display: flex;
              gap: 8px;
              align-items: center;
            }
            
            .clock-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            
            .clocks-row {
              display: flex;
              gap: 24px;
              align-items: center;
              justify-content: center;
              flex-wrap: wrap;
            }
            
            .analog-clock {
              width: 160px;
              height: 160px;
              border: 3px solid var(--primary-color);
              border-radius: 50%;
              position: relative;
              background: var(--card-background-color);
            }
            
            .clock-center {
              position: absolute;
              top: 50%;
              left: 50%;
              width: 8px;
              height: 8px;
              background: var(--primary-color);
              border-radius: 50%;
              transform: translate(-50%, -50%);
              z-index: 10;
            }
            
            .clock-hand {
              position: absolute;
              background: var(--primary-text-color);
              transform-origin: bottom center;
              border-radius: 2px;
            }
            
            .hour-hand {
              width: 4px;
              height: 40px;
              top: 40px;
              left: 50%;
              margin-left: -2px;
              background: var(--primary-color);
            }
            
            .minute-hand {
              width: 3px;
              height: 55px;
              top: 25px;
              left: 50%;
              margin-left: -1.5px;
              background: var(--primary-text-color);
            }
            
            .second-hand {
              width: 1px;
              height: 65px;
              top: 15px;
              left: 50%;
              margin-left: -0.5px;
              background: var(--accent-color);
            }
            
            .clock-numbers {
              position: absolute;
              width: 100%;
              height: 100%;
            }
            
            .clock-number {
              position: absolute;
              font-size: 12px;
              font-weight: bold;
              color: var(--primary-text-color);
              transform: translate(-50%, -50%);
            }
            
            .digital-display {
              text-align: center;
              background: var(--secondary-background-color);
              padding: 16px;
              border-radius: 8px;
              min-width: 200px;
            }
            
            .digital-time {
              font-size: 2em;
              font-weight: bold;
              color: var(--primary-color);
              font-family: 'Courier New', monospace;
              margin-bottom: 8px;
            }
            
            .digital-date {
              font-size: 0.9em;
              color: var(--secondary-text-color);
              margin-bottom: 12px;
            }
            
            .timezone-info {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-bottom: 8px;
              font-size: 0.9em;
              color: var(--secondary-text-color);
            }
            
            .time-format-toggle {
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 4px;
              padding: 4px 8px;
              font-size: 0.8em;
              cursor: pointer;
              margin-left: 8px;
            }
            
            .ntp-status {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              font-size: 0.7em;
              padding: 3px 6px;
              border-radius: 4px;
              margin-bottom: 8px;
            }
            
            .ntp-status.synced {
              background: rgba(76, 175, 80, 0.2);
              color: #4caf50;
            }
            
            .ntp-status.not-synced {
              background: rgba(244, 67, 54, 0.2);
              color: #f44336;
            }
            
            .sync-button {
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 4px;
              padding: 6px 12px;
              font-size: 0.8em;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              margin: 0 auto;
              transition: background 0.2s;
            }
            
            .sync-button:hover {
              background: var(--primary-color-dark);
            }
            
            .world-clocks {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              gap: 8px;
              margin-top: 12px;
              width: 100%;
            }
            
            .world-clock {
              background: var(--secondary-background-color);
              padding: 8px;
              border-radius: 6px;
              text-align: center;
              font-size: 0.8em;
            }
            
            .world-clock-city {
              font-weight: bold;
              color: var(--primary-text-color);
              margin-bottom: 2px;
            }
            
            .world-clock-time {
              color: var(--secondary-text-color);
              font-family: 'Courier New', monospace;
            }
            
            .settings-panel {
              position: absolute;
              top: 50px;
              right: 10px;
              background: var(--card-background-color);
              border: 1px solid var(--divider-color);
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2);
              z-index: 1000;
              min-width: 250px;
              display: none;
            }
            
            .settings-panel.show {
              display: block;
            }
            
            .settings-section {
              margin-bottom: 16px;
            }
            
            .settings-label {
              font-weight: bold;
              margin-bottom: 8px;
              color: var(--primary-text-color);
            }
            
            .settings-input {
              width: 100%;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
            }
            
            /* Increase all emoji sizes by 130% */
            .card-header > span,
            .settings-label,
            .world-clock-city,
            .ntp-status span,
            .sync-button,
            .time-format-toggle {
              font-size: 1.3em;
            }
            
            /* Keep header action buttons normal size for better layout */
            .header-actions .action-button {
              font-size: 0.9em;
            }
            
            /* Specific adjustments for smaller elements */
            .world-clock-city {
              font-size: 1.04em; /* 0.8em * 1.3 */
            }
            
            .ntp-status {
              font-size: 0.91em; /* 0.7em * 1.3 */
            }
            
            .sync-button {
              font-size: 1.04em; /* 0.8em * 1.3 */
            }
            
            .time-format-toggle {
              font-size: 1.04em; /* 0.8em * 1.3 */
            }
          </style>
          
          <div class="notification"></div>
          
          <div class="card-header">
            <span>🕐 ${this.t('time', 'Time')}</span>
            <div class="header-actions">
              <button class="action-button" onclick="this.getRootNode().host.toggleSettings()">
                ⚙️ ${this.t('settings', 'Settings')}
              </button>
            </div>
          </div>
          
          <div class="settings-panel">
            <div class="settings-section">
              <div class="settings-label">🌍 ${this.t('timezone', 'Timezone')}</div>
              <select class="settings-input" onchange="this.getRootNode().host.updateTimezone(this.value)">
                <option value="UTC" ${this.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                <option value="America/New_York" ${this.timezone === 'America/New_York' ? 'selected' : ''}>New York</option>
                <option value="America/Los_Angeles" ${this.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Los Angeles</option>
                <option value="Europe/London" ${this.timezone === 'Europe/London' ? 'selected' : ''}>London</option>
                <option value="Europe/Paris" ${this.timezone === 'Europe/Paris' ? 'selected' : ''}>Paris</option>
                <option value="Europe/Berlin" ${this.timezone === 'Europe/Berlin' ? 'selected' : ''}>Berlin</option>
                <option value="Asia/Tokyo" ${this.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo</option>
                <option value="Asia/Shanghai" ${this.timezone === 'Asia/Shanghai' ? 'selected' : ''}>Shanghai</option>
                <option value="Australia/Sydney" ${this.timezone === 'Australia/Sydney' ? 'selected' : ''}>Sydney</option>
              </select>
            </div>
          </div>
          
          <div class="clock-container">
            <div class="clocks-row">
              <div class="analog-clock">
                <div class="clock-numbers">
                  <div class="clock-number" style="top: 8px; left: 50%;">12</div>
                  <div class="clock-number" style="top: 50%; right: 8px;">3</div>
                  <div class="clock-number" style="bottom: 8px; left: 50%;">6</div>
                  <div class="clock-number" style="top: 50%; left: 8px;">9</div>
                </div>
                <div class="clock-hand hour-hand"></div>
                <div class="clock-hand minute-hand"></div>
                <div class="clock-hand second-hand"></div>
                <div class="clock-center"></div>
              </div>
              
              <div class="digital-display">
                <div class="digital-time">--:--:--</div>
                <div class="digital-date">${this.t('loading', 'Loading...')}</div>
                
                <div class="timezone-info">
                  <span>🌍</span>
                  <span>${this.timezone}</span>
                  <button class="time-format-toggle" onclick="this.getRootNode().host.toggleTimeFormat()">
                    ${this.use24Hour ? '24H' : '12H'}
                  </button>
                </div>
                
                <div class="ntp-status not-synced">
                  <span>⚠️</span>
                  <span>NTP: ${this.t('connecting', 'Connecting...')}</span>
                </div>
                
                <button class="sync-button" onclick="this.getRootNode().host.syncNTP()">
                  🔄 ${this.t('sync', 'Sync')}
                </button>
              </div>
            </div>
            
            <div class="world-clocks">
              ${this.worldTimezones.map(tz => `
                <div class="world-clock">
                  <div class="world-clock-city">${tz.flag} ${tz.name}</div>
                  <div class="world-clock-time">--:--:--</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      disconnectedCallback() {
        if (this.clockInterval) {
          clearInterval(this.clockInterval);
        }
      }

      getCardSize() {
        return 5;
      }
    }

    if (!customElements.get('calendifier-clock-card')) {
      customElements.define('calendifier-clock-card', CalendifierClockCard);
    }

    // Register the card
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'calendifier-clock-card',
      name: '🕐 Calendifier Clock',
      description: 'Configurable analog and digital clocks with NTP synchronization and world times'
    });

  }

  // Start initialization
  initClockCard();
})();