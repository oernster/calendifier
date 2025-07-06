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
          { name: 'New York', flag: '🇺🇸', timezone: 'America/New_York', key: 'city_new_york' },
          { name: 'London', flag: '🇬🇧', timezone: 'Europe/London', key: 'city_london' },
          { name: 'Tokyo', flag: '🇯🇵', timezone: 'Asia/Tokyo', key: 'city_tokyo' },
          { name: 'Sydney', flag: '🇦🇺', timezone: 'Australia/Sydney', key: 'city_sydney' },
          { name: 'Paris', flag: '🇫🇷', timezone: 'Europe/Paris', key: 'city_paris' },
          { name: 'Dubai', flag: '🇦🇪', timezone: 'Asia/Dubai', key: 'city_dubai' }
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
          { name: 'New York', flag: '🇺🇸', timezone: 'America/New_York', key: 'city_new_york' },
          { name: 'Los Angeles', flag: '🇺🇸', timezone: 'America/Los_Angeles', key: 'city_los_angeles' },
          { name: 'London', flag: '🇬🇧', timezone: 'Europe/London', key: 'city_london' },
          { name: 'Paris', flag: '🇫🇷', timezone: 'Europe/Paris', key: 'city_paris' },
          { name: 'Berlin', flag: '🇩🇪', timezone: 'Europe/Berlin', key: 'city_berlin' },
          { name: 'Tokyo', flag: '🇯🇵', timezone: 'Asia/Tokyo', key: 'city_tokyo' },
          { name: 'Shanghai', flag: '🇨🇳', timezone: 'Asia/Shanghai', key: 'city_shanghai' },
          { name: 'Sydney', flag: '🇦🇺', timezone: 'Australia/Sydney', key: 'city_sydney' },
          { name: 'Mumbai', flag: '🇮🇳', timezone: 'Asia/Kolkata', key: 'city_mumbai' },
          { name: 'Dubai', flag: '🇦🇪', timezone: 'Asia/Dubai', key: 'city_dubai' }
        ];
        
        const selectedTimezone = timezoneOptions.find(tz => tz.timezone === timezone);
        if (selectedTimezone) {
          this.worldTimezones[index] = selectedTimezone;
          this.saveSettings();
          this.render();
        }
      }

      getTranslatedCityName(cityData) {
        // Get translated city name using translation key, fallback to original name
        if (cityData.key) {
          return this.t(cityData.key, cityData.name);
        }
        return cityData.name;
      }

      getTranslatedTimezone(timezone) {
        // Translate timezone names to current locale
        const timezoneMap = {
          'UTC': 'UTC',
          'America/New_York': this.t('city_new_york', 'New York'),
          'America/Los_Angeles': this.t('city_los_angeles', 'Los Angeles'),
          'Europe/London': this.t('city_london', 'London'),
          'Europe/Paris': this.t('city_paris', 'Paris'),
          'Europe/Berlin': this.t('city_berlin', 'Berlin'),
          'Asia/Tokyo': this.t('city_tokyo', 'Tokyo'),
          'Asia/Shanghai': this.t('city_shanghai', 'Shanghai'),
          'Australia/Sydney': this.t('city_sydney', 'Sydney'),
          'Asia/Kolkata': this.t('city_mumbai', 'Mumbai'),
          'Asia/Dubai': this.t('city_dubai', 'Dubai')
        };
        
        return timezoneMap[timezone] || timezone;
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
          const timeText = now.toLocaleTimeString(locale, {
            hour12: !this.use24Hour,
            timeZone: this.timezone
          });
          digitalTime.textContent = this.convertNumbers(timeText);
        }

        if (digitalDate) {
          const locale = (this.currentLocale || 'en-US').replace('_', '-');
          const dateText = now.toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: this.timezone
          });
          digitalDate.textContent = this.convertNumbers(dateText);
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

      convertNumbers(text) {
        if (!this.currentLocale) {
          return text.toString();
        }
        
        const textStr = text.toString();
        
        // Arabic-Indic numerals for Arabic locales
        if (this.currentLocale.startsWith('ar_')) {
          const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          return textStr.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
        }
        
        // Hebrew numerals for Hebrew (Israel)
        if (this.currentLocale === 'he_IL') {
          // Hebrew uses Hebrew letters for traditional numbering, but Western numerals are standard in digital contexts
          // Keep Western numerals for better readability and compatibility
          return textStr;
        }
        
        // Devanagari numerals for Hindi (India)
        if (this.currentLocale === 'hi_IN') {
          const hindiNumerals = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
          return textStr.replace(/[0-9]/g, (digit) => hindiNumerals[parseInt(digit)]);
        }
        
        // Thai numerals for Thai (Thailand)
        if (this.currentLocale === 'th_TH') {
          const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
          return textStr.replace(/[0-9]/g, (digit) => thaiNumerals[parseInt(digit)]);
        }
        
        // Persian/Farsi numerals (if we had fa_IR, but we don't in our current locale list)
        // Chinese numerals - Western numerals are standard in digital contexts for zh_CN, zh_TW
        // Japanese numerals - Western numerals are standard in digital contexts for ja_JP
        // Korean numerals - Western numerals are standard in digital contexts for ko_KR
        
        // Myanmar/Burmese numerals (if we had my_MM, but we don't in our current locale list)
        // Khmer numerals (if we had km_KH, but we don't in our current locale list)
        // Lao numerals (if we had lo_LA, but we don't in our current locale list)
        // Tibetan numerals (if we had bo_CN, but we don't in our current locale list)
        
        // All European locales (bg_BG, ca_ES, cs_CZ, da_DK, de_DE, el_GR, en_GB, en_US,
        // es_ES, et_EE, fi_FI, fr_CA, fr_FR, hr_HR, hu_HU, it_IT, lt_LT, lv_LV,
        // nb_NO, nl_NL, pl_PL, pt_BR, pt_PT, ro_RO, ru_RU, sk_SK, sl_SI, sv_SE,
        // tr_TR, uk_UA) use Western numerals
        
        // Indonesian (id_ID) and Vietnamese (vi_VN) use Western numerals
        
        return textStr;
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
            clock.textContent = this.convertNumbers(time);
          }
        });
      }

      handleLocaleChangeSync(event) {
        // Auto-sync NTP when locale changes
        setTimeout(() => {
          this.syncNTP();
        }, 1000); // Small delay to ensure locale is fully loaded
      }

      updateClockNumbers() {
        // Update clock numbers when locale changes
        const clockNumbers = this.shadowRoot.querySelectorAll('.clock-number');
        clockNumbers.forEach((numberEl, index) => {
          const number = index + 1;
          numberEl.textContent = this.convertNumbers(number.toString());
        });
      }

      handleLocaleChange(event) {
        super.handleLocaleChange(event);
        // Update clock numbers and city names with new locale
        setTimeout(() => {
          this.updateClockNumbers();
          this.updateWorldClockCityNames();
          this.updateSettingsDropdown();
          this.updateTimezoneDisplay();
        }, 100);
      }

      updateTimezoneDisplay() {
        // Update the timezone display text when locale changes
        const timezoneSpan = this.shadowRoot.querySelector('.timezone-info span:nth-child(2)');
        if (timezoneSpan) {
          timezoneSpan.textContent = this.getTranslatedTimezone(this.timezone);
        }
      }

      updateSettingsDropdown() {
        // Update settings dropdown options when locale changes
        const settingsSelect = this.shadowRoot.querySelector('.settings-input');
        if (settingsSelect) {
          // Update option text content
          const options = settingsSelect.querySelectorAll('option');
          options.forEach(option => {
            const value = option.value;
            switch(value) {
              case 'UTC':
                option.textContent = 'UTC';
                break;
              case 'America/New_York':
                option.textContent = this.t('city_new_york', 'New York');
                break;
              case 'America/Los_Angeles':
                option.textContent = this.t('city_los_angeles', 'Los Angeles');
                break;
              case 'Europe/London':
                option.textContent = this.t('city_london', 'London');
                break;
              case 'Europe/Paris':
                option.textContent = this.t('city_paris', 'Paris');
                break;
              case 'Europe/Berlin':
                option.textContent = this.t('city_berlin', 'Berlin');
                break;
              case 'Asia/Tokyo':
                option.textContent = this.t('city_tokyo', 'Tokyo');
                break;
              case 'Asia/Shanghai':
                option.textContent = this.t('city_shanghai', 'Shanghai');
                break;
              case 'Australia/Sydney':
                option.textContent = this.t('city_sydney', 'Sydney');
                break;
            }
          });
        }
      }

      updateWorldClockCityNames() {
        // Update world clock city names when locale changes
        const worldClockCities = this.shadowRoot.querySelectorAll('.world-clock-city');
        worldClockCities.forEach((cityEl, index) => {
          if (this.worldTimezones[index]) {
            const tz = this.worldTimezones[index];
            cityEl.textContent = `${tz.flag} ${this.getTranslatedCityName(tz)}`;
          }
        });
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
              font-size: 14px;
              font-weight: bold;
              color: var(--primary-text-color);
              transform: translate(-50%, -50%);
              z-index: 5;
              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
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
              gap: 6px;
              margin-bottom: 8px;
              font-size: 0.85em;
              color: var(--secondary-text-color);
              flex-wrap: wrap;
              padding: 4px 8px;
              background: rgba(var(--rgb-primary-color), 0.1);
              border-radius: 6px;
              min-height: 28px;
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
              padding: 6px 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
              max-width: 200px;
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
                <option value="America/New_York" ${this.timezone === 'America/New_York' ? 'selected' : ''}>${this.t('city_new_york', 'New York')}</option>
                <option value="America/Los_Angeles" ${this.timezone === 'America/Los_Angeles' ? 'selected' : ''}>${this.t('city_los_angeles', 'Los Angeles')}</option>
                <option value="Europe/London" ${this.timezone === 'Europe/London' ? 'selected' : ''}>${this.t('city_london', 'London')}</option>
                <option value="Europe/Paris" ${this.timezone === 'Europe/Paris' ? 'selected' : ''}>${this.t('city_paris', 'Paris')}</option>
                <option value="Europe/Berlin" ${this.timezone === 'Europe/Berlin' ? 'selected' : ''}>${this.t('city_berlin', 'Berlin')}</option>
                <option value="Asia/Tokyo" ${this.timezone === 'Asia/Tokyo' ? 'selected' : ''}>${this.t('city_tokyo', 'Tokyo')}</option>
                <option value="Asia/Shanghai" ${this.timezone === 'Asia/Shanghai' ? 'selected' : ''}>${this.t('city_shanghai', 'Shanghai')}</option>
                <option value="Australia/Sydney" ${this.timezone === 'Australia/Sydney' ? 'selected' : ''}>${this.t('city_sydney', 'Sydney')}</option>
              </select>
            </div>
          </div>
          
          <div class="clock-container">
            <div class="clocks-row">
              <div class="analog-clock">
                <div class="clock-numbers">
                  ${Array.from({length: 12}, (_, i) => {
                    const number = i + 1;
                    const angle = (number * 30) - 90; // -90 to start at 12 o'clock
                    const radius = 65; // Distance from center
                    const x = 80 + radius * Math.cos(angle * Math.PI / 180); // 80 is center x
                    const y = 80 + radius * Math.sin(angle * Math.PI / 180); // 80 is center y
                    const displayNumber = this.convertNumbers(number.toString());
                    return `<div class="clock-number" style="left: ${x}px; top: ${y}px;">${displayNumber}</div>`;
                  }).join('')}
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
                  <span>${this.getTranslatedTimezone(this.timezone)}</span>
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
                  <div class="world-clock-city">${tz.flag} ${this.getTranslatedCityName(tz)}</div>
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