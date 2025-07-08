/**
 * 🔄 RRULE Builder for Home Assistant - Fully Translated
 * Advanced recurring event pattern builder with RFC 5545 RRULE support
 * Supports 40 locales with full translation and native number systems
 */

// Ensure base card is loaded first and prevent multiple initialization
(function() {
  // Prevent multiple initialization
  if (window.RRuleBuilderInitialized) {
    console.log('[RRuleBuilder] Already initialized, skipping');
    return;
  }
  
  function initRRuleBuilder() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initRRuleBuilder, 100);
      return;
    }
    
    // Mark as initialized
    window.RRuleBuilderInitialized = true;

    class RRuleBuilder extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.cardType = 'rrule-builder';
        
        // Initialize state
        this.rrule = '';
        this.startDate = new Date();
        
        // Bind methods
        this.updatePreview = this.updatePreview.bind(this);
        this.buildRRule = this.buildRRule.bind(this);
        this.onFrequencyChange = this.onFrequencyChange.bind(this);
        
        // Don't render immediately - let base class handle it when translations are ready
        // The base class will call render() when translations are loaded
      }
      
      static get observedAttributes() {
        return ['rrule', 'start-date'];
      }
      
      async connectedCallback() {
        // Prevent multiple initialization
        if (this._isConnected) {
          return;
        }
        this._isConnected = true;
        
        // If translations aren't ready yet, wait for them
        if (!this.isTranslationReady && this.translationManager) {
          try {
            await this.translationManager.ensureReady();
            this.isTranslationReady = true;
            this.currentLocale = this.translationManager.currentLocale;
          } catch (error) {
            console.error('[RRuleBuilder] Failed to ensure translations ready:', error);
          }
        }
        
        // Force a re-render if translations are ready but we haven't rendered yet
        if (this.isTranslationReady && (!this.shadowRoot || !this.shadowRoot.querySelector('.rrule-builder'))) {
          this.render();
        }
      }
      
      disconnectedCallback() {
        this._isConnected = false;
        // Call parent disconnectedCallback if it exists
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
      }
      
      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        console.log('[RRuleBuilder] attributeChangedCallback:', name, oldValue, '->', newValue);
        
        switch (name) {
          case 'rrule':
            this.rrule = newValue || '';
            setTimeout(() => {
              this.loadRRule();
            }, 10);
            break;
          case 'start-date':
            this.startDate = newValue ? new Date(newValue + 'T00:00:00Z') : new Date();
            setTimeout(() => {
              this.updatePreview();
            }, 10);
            break;
        }
      }
      
      get value() {
        return this.buildRRule();
      }
      
      set value(rrule) {
        this.setAttribute('rrule', rrule || '');
      }
      
      getRRule() {
        return this.buildRRule();
      }
      
      setRRule(rrule, startDate = null) {
        console.log('[RRuleBuilder] setRRule called with:', rrule, startDate);
        
        if (startDate) {
          this.startDate = new Date(startDate + 'T00:00:00Z');
          this.setAttribute('start-date', startDate);
        }
        
        this.rrule = rrule || '';
        this.setAttribute('rrule', this.rrule);
        
        setTimeout(() => {
          this.loadRRule();
          this.updatePreview();
        }, 10);
      }
      
      /**
       * Format number according to locale-specific number system
       */
      formatNumber(number) {
        if (!this.currentLocale) return String(number);
        
        const numberStr = String(number);
        
        // Native number systems for specific locales
        const numberSystems = {
          'th_TH': {'0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔', '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙'},
          'hi_IN': {'0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'},
          'ar_SA': {'0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'}
        };
        
        if (numberSystems[this.currentLocale]) {
          const numberMap = numberSystems[this.currentLocale];
          return numberStr.split('').map(digit => numberMap[digit] || digit).join('');
        }
        
        return numberStr;
      }
      
      /**
       * Convert native numerals back to Arabic numerals for form values
       */
      parseNumber(numberStr) {
        if (!this.currentLocale || !numberStr) return numberStr;
        
        const reverseMaps = {
          'th_TH': {'๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'},
          'hi_IN': {'०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'},
          'ar_SA': {'٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'}
        };
        
        if (reverseMaps[this.currentLocale]) {
          const reverseMap = reverseMaps[this.currentLocale];
          return String(numberStr).split('').map(digit => reverseMap[digit] || digit).join('');
        }
        
        return String(numberStr);
      }
      
      /**
       * Check if current locale uses Indic numerals
       */
      isIndicNumeralLocale() {
        return ['th_TH', 'hi_IN', 'ar_SA'].includes(this.currentLocale);
      }
      
      /**
       * Render a number input with custom spinners for Indic locales
       */
      renderNumberInput(id, defaultValue, min, max) {
        const value = this.formatNumber(defaultValue);
        
        if (this.isIndicNumeralLocale()) {
          return `
            <div class="number-input-wrapper">
              <input type="text" id="${id}"
                     data-min="${min}" data-max="${max}"
                     value="${value}"
                     style="width: 60px;">
              <span class="spinner-btn spinner-up" data-input="${id}" data-action="increment">▲</span>
              <span class="spinner-btn spinner-down" data-input="${id}" data-action="decrement">▼</span>
            </div>
          `;
        } else {
          return `<input type="number" id="${id}" min="${min}" max="${max}" value="${value}">`;
        }
      }
      
      /**
       * Render a date input with localized formatting
       */
      renderDateInput(id) {
        if (this.isIndicNumeralLocale()) {
          // For Indic locales, create a custom date picker with Indic numerals
          const defaultUntil = new Date();
          defaultUntil.setFullYear(defaultUntil.getFullYear() + 1);
          
          // Format date parts with proper padding and localized numerals
          const year = this.formatNumber(defaultUntil.getFullYear());
          const month = this.formatNumber(String(defaultUntil.getMonth() + 1).padStart(2, '0'));
          const day = this.formatNumber(String(defaultUntil.getDate()).padStart(2, '0'));
          
          // Get localized date format placeholder
          const dateFormatPlaceholder = this.t('rrule.date.format_hint', this.getDateFormat());
          
          return `
            <div class="custom-date-picker-wrapper">
              <input type="text" id="${id}" placeholder="${dateFormatPlaceholder}"
                     value="${day}/${month}/${year}"
                     readonly
                     class="custom-date-input">
              <button type="button" class="date-picker-btn" data-input="${id}">📅</button>
              <div class="date-picker-popup" id="${id}-popup" style="display: none;">
                <div class="date-picker-header">
                  <button type="button" class="nav-btn prev-month">‹</button>
                  <span class="month-year"></span>
                  <button type="button" class="nav-btn next-month">›</button>
                </div>
                <div class="date-picker-calendar">
                  <div class="weekdays"></div>
                  <div class="days"></div>
                </div>
              </div>
            </div>
          `;
        } else {
          // For standard locales, use the browser's native date picker
          // Set default date to one year from now
          const defaultUntil = new Date();
          defaultUntil.setFullYear(defaultUntil.getFullYear() + 1);
          const defaultDate = defaultUntil.toISOString().split('T')[0];
          
          return `<input type="date" id="${id}" value="${defaultDate}">`;
        }
      }
      
      /**
       * Get localized date format hint
       */
      getDateFormat() {
        // Try to get the date format from translations first
        const translatedFormat = this.t('rrule.date.format', '');
        
        if (translatedFormat && translatedFormat !== 'rrule.date.format') {
          return translatedFormat;
        }
        
        // Fallback to hardcoded formats for specific locales
        const formats = {
          'th_TH': 'วว/ดด/ปปปป',
          'hi_IN': 'दिन/महीना/वर्ष',
          'ar_SA': 'يوم/شهر/سنة'
        };
        
        return formats[this.currentLocale] || 'DD/MM/YYYY';
      }
      
      async render() {
        // If we have a translation manager but translations aren't ready, ensure they're ready
        if (this.translationManager && !this.isTranslationReady) {
          try {
            await this.translationManager.ensureReady();
            this.isTranslationReady = true;
            this.currentLocale = this.translationManager.currentLocale;
          } catch (error) {
            console.error('[RRuleBuilder] Failed to ensure translations in render:', error);
          }
        }
        
        if (!this.isTranslationReady) {
          this.shadowRoot.innerHTML = `
            <style>${this.getCommonStyles()}</style>
            ${this.renderLoadingState('Loading recurrence builder...')}
          `;
          return;
        }

        // Test translation system
        console.log('[RRuleBuilder] Testing translations:');
        console.log('- isTranslationReady:', this.isTranslationReady);
        console.log('- currentLocale:', this.currentLocale);
        console.log('- translationManager:', !!this.translationManager);
        console.log('- Test translation rrule_preset_daily:', this.t('rrule_preset_daily', 'Daily'));
        console.log('- Test translation rrule_frequency:', this.t('rrule_frequency', 'Frequency'));

        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            .rrule-builder {
              background: var(--card-background-color);
              border-radius: 8px;
              padding: 12px;
              border: 1px solid var(--divider-color);
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 12px;
              max-width: 100%;
              min-width: 600px;
            }
            
            .section {
              margin-bottom: 0;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
            }
            
            .preset-buttons {
              grid-column: 1 / -1;
              margin-bottom: 8px;
            }
            
            .frequency-section {
              grid-column: 1 / 3;
            }
            
            .interval-section {
              grid-column: 3 / 5;
            }
            
            .weekdays-section {
              grid-column: 1 / 3;
            }
            
            .monthly-section {
              grid-column: 1 / 3;
            }
            
            .end-section {
              grid-column: 3 / 5;
            }
            
            .preview-section {
              grid-column: 1 / -1;
              max-height: 120px;
            }
            
            @media (max-width: 768px) {
              .rrule-builder {
                grid-template-columns: 1fr 1fr;
                min-width: 400px;
              }
              
              .frequency-section,
              .interval-section,
              .weekdays-section,
              .monthly-section,
              .end-section {
                grid-column: span 1;
              }
            }
            
            @media (max-width: 480px) {
              .rrule-builder {
                grid-template-columns: 1fr;
                min-width: 300px;
              }
              
              .frequency-section,
              .interval-section,
              .weekdays-section,
              .monthly-section,
              .end-section {
                grid-column: 1;
              }
            }
            
            .section-title {
              font-weight: 500;
              margin-bottom: 8px;
              color: var(--primary-text-color);
              font-size: 14px;
            }
            
            .form-row {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              flex-wrap: wrap;
            }
            
            .form-group {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            
            .radio-group {
              display: flex;
              gap: 16px;
              flex-wrap: wrap;
            }
            
            .checkbox-group {
              display: flex;
              gap: 12px;
              flex-wrap: wrap;
            }
            
            input[type="radio"], input[type="checkbox"] {
              margin-right: 4px;
            }
            
            input[type="number"], input[type="date"], select {
              padding: 4px 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              font-size: 14px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
            }
            
            input[type="number"] {
              width: 60px;
            }
            
            input[type="date"] {
              width: 140px;
            }
            
            select {
              min-width: 100px;
            }
            
            .preview-section {
              background: var(--secondary-background-color, #f8f9fa);
              border-radius: 4px;
              padding: 12px;
              margin-top: 0;
              border: 1px solid var(--divider-color);
            }
            
            .preview-description {
              font-weight: 600;
              margin-bottom: 8px;
              color: var(--primary-color);
              font-size: 15px;
            }
            
            .preview-list {
              max-height: 150px;
              overflow-y: auto;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
            }
            
            .preview-item {
              padding: 6px 12px;
              border-bottom: 1px solid var(--divider-color);
              font-size: 14px;
              color: var(--primary-text-color);
              font-weight: 500;
            }
            
            .preview-item:last-child {
              border-bottom: none;
            }
            
            
            .preset-buttons {
              display: flex;
              gap: 8px;
              margin-bottom: 16px;
              flex-wrap: wrap;
            }
            
            .preset-btn {
              padding: 6px 12px;
              border: 1px solid var(--primary-color);
              background: transparent;
              color: var(--primary-color);
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            }
            
            .preset-btn:hover {
              background: var(--primary-color);
              color: white;
            }
            
            .hidden {
              display: none !important;
            }
            
            label {
              font-size: 14px;
              color: var(--primary-text-color);
              cursor: pointer;
            }
            
            .error {
              color: var(--error-color, #f44336);
              font-size: 12px;
              margin-top: 4px;
            }
            
            /* Hide native number input spinners and date pickers for Indic locales */
            .indic-numerals input[type="number"]::-webkit-outer-spin-button,
            .indic-numerals input[type="number"]::-webkit-inner-spin-button,
            .indic-numerals input[type="text"]::-webkit-outer-spin-button,
            .indic-numerals input[type="text"]::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
              display: none;
            }
            
            .indic-numerals input[type="number"],
            .indic-numerals input[type="text"] {
              -moz-appearance: textfield;
            }
            
            /* Hide native date picker controls */
            .indic-numerals input[type="date"]::-webkit-calendar-picker-indicator,
            .indic-numerals input[type="date"]::-webkit-inner-spin-button,
            .indic-numerals input[type="date"]::-webkit-clear-button {
              display: none;
              -webkit-appearance: none;
            }
            
            /* Custom spinner buttons for Indic locales */
            .indic-numerals .number-input-wrapper {
              position: relative;
              display: inline-block;
              vertical-align: middle;
            }
            
            .indic-numerals .number-input-wrapper input {
              box-sizing: border-box;
              padding-right: 50px; /* Make room for spinner buttons */
            }
            
            .indic-numerals .spinner-btn {
              position: absolute;
              top: 0;
              width: 20px;
              height: 100%;
              border: 1px solid var(--divider-color);
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 10px;
              cursor: pointer;
              user-select: none;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
            }
            
            .indic-numerals .spinner-up {
              right: 0;
              border-radius: 0 3px 3px 0;
            }
            
            .indic-numerals .spinner-down {
              right: 21px; /* Position next to the up button */
              border-radius: 3px 0 0 3px;
            }
            
            .indic-numerals .spinner-btn:hover {
              background: var(--primary-color);
              color: white;
            }
            
            .indic-numerals .spinner-btn:hover {
              background: var(--primary-color);
              color: white;
            }
            
            .indic-numerals .spinner-up {
              border-bottom: none;
              border-radius: 2px 2px 0 0;
            }
            
            .indic-numerals .spinner-down {
              border-radius: 0 0 2px 2px;
            }
            
            /* Custom date picker styles */
            .custom-date-picker-wrapper {
              position: relative;
              display: inline-block;
              width: 140px;
              cursor: pointer;
              user-select: none;
            }
            
            .custom-date-input {
              padding: 4px 30px 4px 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              font-size: 14px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
              width: 100%;
              box-sizing: border-box;
              cursor: pointer;
              pointer-events: none; /* Make the input non-interactive */
            }
            
            .date-picker-btn {
              position: absolute;
              right: 4px;
              top: 0;
              bottom: 0;
              height: 100%;
              width: 24px;
              border: none;
              background: transparent;
              cursor: pointer;
              font-size: 16px;
              padding: 0;
              color: var(--primary-color);
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .date-picker-btn:hover {
              background: var(--secondary-background-color);
              border-radius: 2px;
            }
            
            .date-picker-popup {
              position: absolute;
              top: 100%;
              left: 0;
              z-index: 1000;
              background: var(--card-background-color);
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2);
              padding: 8px;
              min-width: 250px;
              margin-top: 4px;
              user-select: none;
            }
            
            .date-picker-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              padding: 4px;
            }
            
            .nav-btn {
              border: none;
              background: var(--primary-color);
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              cursor: pointer;
              font-size: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .nav-btn:hover {
              background: var(--primary-color-dark, var(--primary-color));
              opacity: 0.8;
            }
            
            .month-year {
              font-weight: 500;
              color: var(--primary-text-color);
              font-size: 14px;
            }
            
            .weekdays {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 2px;
              margin-bottom: 4px;
            }
            
            .weekday {
              text-align: center;
              font-size: 12px;
              font-weight: 500;
              color: var(--secondary-text-color);
              padding: 4px;
            }
            
            .days {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 2px;
            }
            
            .day {
              text-align: center;
              padding: 6px 4px;
              cursor: pointer;
              border-radius: 2px;
              font-size: 13px;
              color: var(--primary-text-color);
              min-height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .day:hover {
              background: var(--secondary-background-color);
            }
            
            .day.selected {
              background: var(--primary-color);
              color: white;
            }
            
            .day.other-month {
              color: var(--disabled-text-color);
              opacity: 0.5;
            }
            
            .day.today {
              border: 1px solid var(--primary-color);
            }
          </style>
          
          <div class="notification"></div>
          
          <div class="rrule-builder ${this.isIndicNumeralLocale() ? 'indic-numerals' : ''}">
            <!-- Preset Buttons -->
            <div class="preset-buttons">
              <button class="preset-btn" data-preset="daily">${this.t('rrule_preset_daily', 'Daily')}</button>
              <button class="preset-btn" data-preset="weekdays">${this.t('rrule_preset_weekdays', 'Weekdays')}</button>
              <button class="preset-btn" data-preset="weekly">${this.t('rrule_preset_weekly', 'Weekly')}</button>
              <button class="preset-btn" data-preset="monthly">${this.t('rrule_preset_monthly', 'Monthly')}</button>
            </div>
            
            <!-- Frequency Section -->
            <div class="section frequency-section">
              <div class="section-title">${this.t('rrule_frequency', 'Frequency')}</div>
              <div class="radio-group">
                <label><input type="radio" name="frequency" value="DAILY"> ${this.t('rrule_freq_daily', 'Daily')}</label>
                <label><input type="radio" name="frequency" value="WEEKLY" checked> ${this.t('rrule_freq_weekly', 'Weekly')}</label>
                <label><input type="radio" name="frequency" value="MONTHLY"> ${this.t('rrule_freq_monthly', 'Monthly')}</label>
                <label><input type="radio" name="frequency" value="YEARLY"> ${this.t('rrule_freq_yearly', 'Yearly')}</label>
              </div>
            </div>
            
            <!-- Interval Section -->
            <div class="section interval-section">
              <div class="section-title">${this.t('rrule_interval', 'Interval')}</div>
              <div class="form-row">
                <span>${this.t('rrule_every', 'Every')}</span>
                ${this.renderNumberInput('interval', 1, 1, 999)}
                <span id="interval-label">${this.t('rrule_weeks', 'weeks')}</span>
              </div>
            </div>
            
            <!-- Weekdays Section -->
            <div class="section weekdays-section" id="weekdays-section">
              <div class="section-title">${this.t('rrule_days_of_week', 'Days of Week')}</div>
              <div class="checkbox-group">
                <label><input type="checkbox" name="weekday" value="MO"> ${this.t('rrule_day_mon', 'Mon')}</label>
                <label><input type="checkbox" name="weekday" value="TU"> ${this.t('rrule_day_tue', 'Tue')}</label>
                <label><input type="checkbox" name="weekday" value="WE"> ${this.t('rrule_day_wed', 'Wed')}</label>
                <label><input type="checkbox" name="weekday" value="TH"> ${this.t('rrule_day_thu', 'Thu')}</label>
                <label><input type="checkbox" name="weekday" value="FR"> ${this.t('rrule_day_fri', 'Fri')}</label>
                <label><input type="checkbox" name="weekday" value="SA"> ${this.t('rrule_day_sat', 'Sat')}</label>
                <label><input type="checkbox" name="weekday" value="SU"> ${this.t('rrule_day_sun', 'Sun')}</label>
              </div>
            </div>
            
            <!-- End Condition Section -->
            <div class="section end-section">
              <div class="section-title">${this.t('rrule_end_condition', 'End Condition')}</div>
              <div class="form-group">
                <label>
                  <input type="radio" name="end-type" value="never" checked>
                  ${this.t('rrule_never', 'Never')}
                </label>
                <label>
                  <input type="radio" name="end-type" value="count">
                  ${this.t('rrule_after', 'After')} ${this.renderNumberInput('count', 10, 1, 9999)} ${this.t('rrule_occurrences', 'occurrences')}
                </label>
                <label>
                  <input type="radio" name="end-type" value="until">
                  ${this.t('rrule_until', 'Until')} ${this.renderDateInput('until')}
                </label>
              </div>
            </div>
            
            <!-- Monthly Section -->
            <div class="section monthly-section hidden" id="monthly-section">
              <div class="section-title">${this.t('rrule_monthly_options', 'Monthly Options')}</div>
              <div class="form-group">
                <label>
                  <input type="radio" name="monthly-type" value="bymonthday" checked>
                  ${this.t('rrule_on_day', 'On day')} ${this.renderNumberInput('monthday', 1, 1, 31)} ${this.t('rrule_of_month', 'of the month')}
                </label>
                <label>
                  <input type="radio" name="monthly-type" value="bysetpos">
                  ${this.t('rrule_on_the', 'On the')}
                  <select id="setpos">
                    <option value="1">${this.t('rrule_first', 'First')}</option>
                    <option value="2">${this.t('rrule_second', 'Second')}</option>
                    <option value="3">${this.t('rrule_third', 'Third')}</option>
                    <option value="4">${this.t('rrule_fourth', 'Fourth')}</option>
                    <option value="-1">${this.t('rrule_last', 'Last')}</option>
                  </select>
                  <select id="setpos-weekday">
                    <option value="MO">${this.t('rrule_day_monday', 'Monday')}</option>
                    <option value="TU">${this.t('rrule_day_tuesday', 'Tuesday')}</option>
                    <option value="WE">${this.t('rrule_day_wednesday', 'Wednesday')}</option>
                    <option value="TH">${this.t('rrule_day_thursday', 'Thursday')}</option>
                    <option value="FR">${this.t('rrule_day_friday', 'Friday')}</option>
                    <option value="SA">${this.t('rrule_day_saturday', 'Saturday')}</option>
                    <option value="SU">${this.t('rrule_day_sunday', 'Sunday')}</option>
                  </select>
                </label>
              </div>
            </div>
            
            <!-- Preview Section -->
            <div class="preview-section">
              <div class="section-title">${this.t('rrule_preview', 'Preview')}</div>
              <div class="preview-description" id="preview-description">${this.t('rrule_every_week', 'Every week')}</div>
              <div class="preview-list" id="preview-list"></div>
            </div>
          </div>
        `;
        
        // Always setup event listeners after rendering
        this.setupEventListeners();
        
        // Setup custom spinners for Indic locales
        if (this.isIndicNumeralLocale()) {
          this.setupCustomSpinners();
        }
      }
      
      setupEventListeners() {
        const shadow = this.shadowRoot;
        if (!shadow) {
          console.warn('[RRuleBuilder] Shadow DOM not ready for setupEventListeners');
          return;
        }
        
        // Frequency change
        const frequencyInputs = shadow.querySelectorAll('input[name="frequency"]');
        frequencyInputs.forEach(radio => {
          radio.addEventListener('change', this.onFrequencyChange);
        });
        
        // Interval change
        const intervalInput = shadow.getElementById('interval');
        if (intervalInput) {
          intervalInput.addEventListener('input', this.updatePreview);
        }
        
        // Weekdays change
        const weekdayInputs = shadow.querySelectorAll('input[name="weekday"]');
        weekdayInputs.forEach(checkbox => {
          checkbox.addEventListener('change', this.updatePreview);
        });
        
        // Monthly options change
        const monthlyTypeInputs = shadow.querySelectorAll('input[name="monthly-type"]');
        monthlyTypeInputs.forEach(radio => {
          radio.addEventListener('change', this.updatePreview);
        });
        
        const monthdayInput = shadow.getElementById('monthday');
        if (monthdayInput) {
          monthdayInput.addEventListener('input', this.updatePreview);
        }
        
        const setposSelect = shadow.getElementById('setpos');
        if (setposSelect) {
          setposSelect.addEventListener('change', this.updatePreview);
        }
        
        const setposWeekdaySelect = shadow.getElementById('setpos-weekday');
        if (setposWeekdaySelect) {
          setposWeekdaySelect.addEventListener('change', this.updatePreview);
        }
        
        // End condition change
        const endTypeInputs = shadow.querySelectorAll('input[name="end-type"]');
        endTypeInputs.forEach(radio => {
          radio.addEventListener('change', this.updatePreview);
        });
        
        const countInput = shadow.getElementById('count');
        if (countInput) {
          countInput.addEventListener('input', this.updatePreview);
        }
        
        const untilInput = shadow.getElementById('until');
        if (untilInput) {
          untilInput.addEventListener('change', this.updatePreview);
        }
        
        // Preset buttons
        shadow.querySelectorAll('.preset-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.applyPreset(btn.dataset.preset);
          });
        });
        
        // Set default until date
        const defaultUntilInput = shadow.getElementById('until');
        if (defaultUntilInput) {
          const defaultUntil = new Date(this.startDate);
          defaultUntil.setFullYear(defaultUntil.getFullYear() + 1);
          
          // Format the date according to locale
          if (this.isIndicNumeralLocale()) {
            const day = this.formatNumber(String(defaultUntil.getDate()).padStart(2, '0'));
            const month = this.formatNumber(String(defaultUntil.getMonth() + 1).padStart(2, '0'));
            const year = this.formatNumber(defaultUntil.getFullYear());
            defaultUntilInput.value = `${day}/${month}/${year}`;
          } else {
            defaultUntilInput.value = defaultUntil.toISOString().split('T')[0];
          }
        }
      }
      
      /**
       * Setup custom spinner buttons for Indic locales
       */
      setupCustomSpinners() {
        const shadow = this.shadowRoot;
        if (!shadow) return;
        
        // Add event listeners for custom spinner buttons
        shadow.querySelectorAll('.spinner-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const inputId = btn.dataset.input;
            const action = btn.dataset.action;
            const input = shadow.getElementById(inputId);
            
            if (input) {
              const currentValue = parseInt(this.parseNumber(input.value)) || 0;
              const min = parseInt(input.dataset.min || input.getAttribute('min')) || 0;
              const max = parseInt(input.dataset.max || input.getAttribute('max')) || 999;
              
              let newValue = currentValue;
              if (action === 'increment' && currentValue < max) {
                newValue = currentValue + 1;
              } else if (action === 'decrement' && currentValue > min) {
                newValue = currentValue - 1;
              }
              
              input.value = this.formatNumber(newValue);
              
              // Trigger change event
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        });
        
        // Setup custom date pickers
        shadow.querySelectorAll('.custom-date-picker-wrapper').forEach(wrapper => {
          const btn = wrapper.querySelector('.date-picker-btn');
          const input = wrapper.querySelector('input');
          
          if (btn && input) {
            const inputId = btn.dataset.input;
            
            // Make both the button and the wrapper clickable
            const clickHandler = (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const popup = shadow.getElementById(`${inputId}-popup`);
              
              if (popup) {
                // Close other popups first
                shadow.querySelectorAll('.date-picker-popup').forEach(p => {
                  if (p !== popup) p.style.display = 'none';
                });
                
                // Toggle this popup
                if (popup.style.display === 'none') {
                  this.showDatePicker(inputId);
                } else {
                  popup.style.display = 'none';
                }
              }
            };
            
            // Add click handler to both button and wrapper
            btn.addEventListener('click', clickHandler);
            wrapper.addEventListener('click', clickHandler);
          }
        });
        
        // Close date picker when clicking outside
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.custom-date-picker-wrapper')) {
            shadow.querySelectorAll('.date-picker-popup').forEach(popup => {
              popup.style.display = 'none';
            });
          }
        });
        
        // Add input validation for number inputs
        const numberInputs = shadow.querySelectorAll('.number-input-wrapper input[type="text"]');
        numberInputs.forEach(input => {
          input.addEventListener('input', (e) => {
            // Only allow Indic numerals for the current locale
            let value = e.target.value;
            
            // Remove any characters that aren't valid for the current locale
            if (this.currentLocale === 'th_TH') {
              value = value.replace(/[^\u0E50-\u0E59]/g, ''); // Thai numerals only
            } else if (this.currentLocale === 'hi_IN') {
              value = value.replace(/[^\u0966-\u096F]/g, ''); // Devanagari numerals only
            } else if (this.currentLocale === 'ar_SA') {
              value = value.replace(/[^\u0660-\u0669]/g, ''); // Arabic-Indic numerals only
            }
            
            // Validate range
            const numValue = parseInt(this.parseNumber(value));
            const min = parseInt(e.target.dataset.min || e.target.getAttribute('min')) || 0;
            const max = parseInt(e.target.dataset.max || e.target.getAttribute('max')) || 999;
            
            if (!isNaN(numValue)) {
              if (numValue < min) {
                value = this.formatNumber(min);
              } else if (numValue > max) {
                value = this.formatNumber(max);
              }
            }
            
            e.target.value = value;
          });
          
          input.addEventListener('blur', (e) => {
            // Ensure we have a valid number on blur
            const value = this.parseNumber(e.target.value);
            const numValue = parseInt(value);
            const min = parseInt(e.target.dataset.min || e.target.getAttribute('min')) || 0;
            
            if (isNaN(numValue) || numValue < min) {
              e.target.value = this.formatNumber(min);
            } else {
              e.target.value = this.formatNumber(numValue);
            }
          });
        });
        
        // Add input validation for date inputs
        const dateInputs = shadow.querySelectorAll('.custom-date-input');
        dateInputs.forEach(input => {
          
          input.addEventListener('input', (e) => {
            // Auto-format date input as user types
            let value = e.target.value;
            
            // Only allow numerals for the current locale and forward slash
            if (this.currentLocale === 'th_TH') {
              value = value.replace(/[^\u0E50-\u0E59/]/g, ''); // Thai numerals and /
            } else if (this.currentLocale === 'hi_IN') {
              value = value.replace(/[^\u0966-\u096F/]/g, ''); // Devanagari numerals and /
            } else if (this.currentLocale === 'ar_SA') {
              value = value.replace(/[^\u0660-\u0669/]/g, ''); // Arabic-Indic numerals and /
            }
            
            // Auto-add slashes at positions 2 and 5
            if (value.length === 2 || value.length === 5) {
              if (!value.endsWith('/')) {
                value += '/';
              }
            }
            
            // Limit to 10 characters (DD/MM/YYYY)
            if (value.length > 10) {
              value = value.substring(0, 10);
            }
            
            e.target.value = value;
          });
          
          input.addEventListener('blur', (e) => {
            // Validate and format complete date
            this.validateDateInput(e.target);
          });
        });
      }
      
      /**
       * Validate and format date input for Indic locales
       */
      /**
       * Show date picker popup with calendar for the given input
       */
      showDatePicker(inputId) {
        const shadow = this.shadowRoot;
        if (!shadow) return;
        
        const input = shadow.getElementById(inputId);
        const popup = shadow.getElementById(`${inputId}-popup`);
        if (!input || !popup) return;
        
        // Parse current date from input
        let currentDate = new Date();
        try {
          if (input.value) {
            if (this.isIndicNumeralLocale()) {
              // Parse DD/MM/YYYY format with Indic numerals
              const parts = input.value.split('/');
              if (parts.length === 3) {
                const day = parseInt(this.parseNumber(parts[0]));
                const month = parseInt(this.parseNumber(parts[1])) - 1;
                const year = parseInt(this.parseNumber(parts[2]));
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                  currentDate = new Date(year, month, day);
                }
              }
            } else {
              // Standard date input format
              currentDate = new Date(input.value + 'T00:00:00Z');
            }
          }
          
          // If no value or parsing failed, set a default date
          if (!input.value || isNaN(currentDate.getTime())) {
            currentDate = new Date();
          }
          
          // Always update the input with properly formatted date
          // This ensures the date is always displayed with the correct numeral system
          if (this.isIndicNumeralLocale()) {
            const day = this.formatNumber(String(currentDate.getDate()).padStart(2, '0'));
            const month = this.formatNumber(String(currentDate.getMonth() + 1).padStart(2, '0'));
            const year = this.formatNumber(currentDate.getFullYear());
            input.value = `${day}/${month}/${year}`;
          } else {
            input.value = currentDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('[RRuleBuilder] Error parsing date:', e);
        }
        
        // If date is invalid, use today
        if (isNaN(currentDate.getTime())) {
          currentDate = new Date();
        }
        
        // Store current view month/year
        this._currentPickerDate = currentDate;
        this._currentPickerInput = inputId;
        
        // Show popup
        popup.style.display = 'block';
        
        // Position the popup properly
        const rect = input.getBoundingClientRect();
        if (rect.left + popup.offsetWidth > window.innerWidth) {
          popup.style.left = 'auto';
          popup.style.right = '0';
        } else {
          popup.style.left = '0';
          popup.style.right = 'auto';
        }
        
        // Generate calendar
        this.renderCalendar(popup, currentDate);
        
        // Setup navigation buttons
        const prevBtn = popup.querySelector('.prev-month');
        const nextBtn = popup.querySelector('.next-month');
        
        if (prevBtn) {
          prevBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const newDate = new Date(this._currentPickerDate);
            newDate.setMonth(newDate.getMonth() - 1);
            this._currentPickerDate = newDate;
            this.renderCalendar(popup, newDate);
          };
        }
        
        if (nextBtn) {
          nextBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const newDate = new Date(this._currentPickerDate);
            newDate.setMonth(newDate.getMonth() + 1);
            this._currentPickerDate = newDate;
            this.renderCalendar(popup, newDate);
          };
        }
      }
      
      /**
       * Render calendar in the date picker popup
       */
      renderCalendar(popup, date) {
        if (!popup) return;
        
        const monthYear = popup.querySelector('.month-year');
        const weekdaysContainer = popup.querySelector('.weekdays');
        const daysContainer = popup.querySelector('.days');
        
        if (!monthYear || !weekdaysContainer || !daysContainer) return;
        
        // Set month and year in header
        // Get translated month names
        const monthKeys = [
          'calendar.months.january', 'calendar.months.february', 'calendar.months.march', 'calendar.months.april',
          'calendar.months.may', 'calendar.months.june', 'calendar.months.july', 'calendar.months.august',
          'calendar.months.september', 'calendar.months.october', 'calendar.months.november', 'calendar.months.december'
        ];
        
        // Fallback month names if translations aren't available
        const fallbackMonths = [
          'January', 'February', 'March', 'April',
          'May', 'June', 'July', 'August',
          'September', 'October', 'November', 'December'
        ];
        
        // Try to get translated month name, fall back to English if not available
        const monthKey = monthKeys[date.getMonth()];
        const month = this.t(monthKey, fallbackMonths[date.getMonth()]);
        const year = this.formatNumber(date.getFullYear());
        monthYear.textContent = `${month} ${year}`;
        
        // Generate weekday headers
        weekdaysContainer.innerHTML = '';
        
        // Get translated weekday names
        const weekdayKeys = [
          'calendar.days_short.sun', 'calendar.days_short.mon', 'calendar.days_short.tue',
          'calendar.days_short.wed', 'calendar.days_short.thu', 'calendar.days_short.fri',
          'calendar.days_short.sat'
        ];
        
        // Fallback weekday names if translations aren't available
        const fallbackWeekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        
        weekdayKeys.forEach((key, index) => {
          const dayEl = document.createElement('div');
          dayEl.className = 'weekday';
          dayEl.textContent = this.t(key, fallbackWeekdays[index]);
          weekdaysContainer.appendChild(dayEl);
        });
        
        // Generate days grid
        daysContainer.innerHTML = '';
        
        // Get first day of month
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get last day of month
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const totalDays = lastDay.getDate();
        
        // Get days from previous month
        const prevMonthLastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
        
        // Get current date for highlighting today
        const today = new Date();
        const isCurrentMonth = today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear();
        
        // Get selected date
        const input = this.shadowRoot.getElementById(this._currentPickerInput);
        let selectedDate = null;
        
        if (input && input.value) {
          if (this.isIndicNumeralLocale()) {
            // Parse DD/MM/YYYY format with Indic numerals
            const parts = input.value.split('/');
            if (parts.length === 3) {
              const day = parseInt(this.parseNumber(parts[0]));
              const month = parseInt(this.parseNumber(parts[1])) - 1;
              const year = parseInt(this.parseNumber(parts[2]));
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                selectedDate = new Date(year, month, day);
              }
            }
          } else {
            // Standard date input format
            selectedDate = new Date(input.value + 'T00:00:00Z');
          }
        }
        
        // Previous month days
        for (let i = startingDay - 1; i >= 0; i--) {
          const dayNum = prevMonthLastDay - i;
          const dayEl = document.createElement('div');
          dayEl.className = 'day other-month';
          dayEl.textContent = this.formatNumber(dayNum);
          dayEl.dataset.day = dayNum;
          dayEl.dataset.month = date.getMonth() - 1;
          dayEl.dataset.year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
          
          dayEl.addEventListener('click', (e) => this.selectDate(e.target));
          daysContainer.appendChild(dayEl);
        }
        
        // Current month days
        for (let i = 1; i <= totalDays; i++) {
          const dayEl = document.createElement('div');
          dayEl.className = 'day';
          dayEl.textContent = this.formatNumber(i);
          dayEl.dataset.day = i;
          dayEl.dataset.month = date.getMonth();
          dayEl.dataset.year = date.getFullYear();
          
          // Highlight today
          if (isCurrentMonth && i === today.getDate()) {
            dayEl.classList.add('today');
          }
          
          // Highlight selected date
          if (selectedDate &&
              selectedDate.getDate() === i &&
              selectedDate.getMonth() === date.getMonth() &&
              selectedDate.getFullYear() === date.getFullYear()) {
            dayEl.classList.add('selected');
          }
          
          dayEl.addEventListener('click', (e) => this.selectDate(e.target));
          daysContainer.appendChild(dayEl);
        }
        
        // Next month days
        const daysFromNextMonth = 42 - (startingDay + totalDays);
        for (let i = 1; i <= daysFromNextMonth; i++) {
          const dayEl = document.createElement('div');
          dayEl.className = 'day other-month';
          dayEl.textContent = this.formatNumber(i);
          dayEl.dataset.day = i;
          dayEl.dataset.month = date.getMonth() + 1;
          dayEl.dataset.year = date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
          
          dayEl.addEventListener('click', (e) => this.selectDate(e.target));
          daysContainer.appendChild(dayEl);
        }
      }
      
      /**
       * Handle date selection in the calendar
       */
      selectDate(dayElement) {
        if (!dayElement || !dayElement.dataset) return;
        
        const day = parseInt(dayElement.dataset.day);
        const month = parseInt(dayElement.dataset.month);
        const year = parseInt(dayElement.dataset.year);
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) return;
        
        const input = this.shadowRoot.getElementById(this._currentPickerInput);
        const popup = this.shadowRoot.getElementById(`${this._currentPickerInput}-popup`);
        
        if (input) {
          // Format date according to locale
          if (this.isIndicNumeralLocale()) {
            // Format as DD/MM/YYYY with Indic numerals
            const formattedDay = this.formatNumber(String(day).padStart(2, '0'));
            const formattedMonth = this.formatNumber(String(month + 1).padStart(2, '0'));
            const formattedYear = this.formatNumber(year);
            input.value = `${formattedDay}/${formattedMonth}/${formattedYear}`;
          } else {
            // Standard date input format YYYY-MM-DD
            const formattedDay = String(day).padStart(2, '0');
            const formattedMonth = String(month + 1).padStart(2, '0');
            const formattedYear = String(year);
            input.value = `${formattedYear}-${formattedMonth}-${formattedDay}`;
          }
          
          // Update the selected date in memory
          this._selectedDate = new Date(year, month, day);
          
          // Trigger change event
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Force a validation to ensure proper formatting
          this.validateDateInput(input);
        }
        
        // Hide popup
        if (popup) {
          popup.style.display = 'none';
        }
      }
      
      /**
       * Validate and format date input for Indic locales
       */
      validateDateInput(input) {
        const value = input.value;
        if (!value) {
          // If empty, set to current date
          const now = new Date();
          if (this.isIndicNumeralLocale()) {
            const day = this.formatNumber(String(now.getDate()).padStart(2, '0'));
            const month = this.formatNumber(String(now.getMonth() + 1).padStart(2, '0'));
            const year = this.formatNumber(now.getFullYear());
            input.value = `${day}/${month}/${year}`;
          } else {
            input.value = now.toISOString().split('T')[0];
          }
          return;
        }
        
        const parts = value.split('/');
        if (parts.length === 3) {
          try {
            const day = parseInt(this.parseNumber(parts[0]));
            const month = parseInt(this.parseNumber(parts[1]));
            const year = parseInt(this.parseNumber(parts[2]));
            
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
              // Format with proper padding
              const formattedDay = this.formatNumber(String(day).padStart(2, '0'));
              const formattedMonth = this.formatNumber(String(month).padStart(2, '0'));
              const formattedYear = this.formatNumber(year);
              
              input.value = `${formattedDay}/${formattedMonth}/${formattedYear}`;
            } else {
              // Invalid date, set to current date
              const now = new Date();
              const currentDay = this.formatNumber(String(now.getDate()).padStart(2, '0'));
              const currentMonth = this.formatNumber(String(now.getMonth() + 1).padStart(2, '0'));
              const currentYear = this.formatNumber(now.getFullYear());
              input.value = `${currentDay}/${currentMonth}/${currentYear}`;
            }
          } catch (e) {
            // Error parsing, set to current date
            const now = new Date();
            const currentDay = this.formatNumber(String(now.getDate()).padStart(2, '0'));
            const currentMonth = this.formatNumber(String(now.getMonth() + 1).padStart(2, '0'));
            const currentYear = this.formatNumber(now.getFullYear());
            input.value = `${currentDay}/${currentMonth}/${currentYear}`;
          }
        } else {
          // Invalid format, set to current date
          const now = new Date();
          const currentDay = this.formatNumber(String(now.getDate()).padStart(2, '0'));
          const currentMonth = this.formatNumber(String(now.getMonth() + 1).padStart(2, '0'));
          const currentYear = this.formatNumber(now.getFullYear());
          input.value = `${currentDay}/${currentMonth}/${currentYear}`;
        }
      }
      
      onFrequencyChange() {
        const shadow = this.shadowRoot;
        if (!shadow) return;
        
        const frequencyInput = shadow.querySelector('input[name="frequency"]:checked');
        if (!frequencyInput) return;
        
        const frequency = frequencyInput.value;
        const intervalLabel = shadow.getElementById('interval-label');
        const weekdaysSection = shadow.getElementById('weekdays-section');
        const monthlySection = shadow.getElementById('monthly-section');
        
        // Update interval label with translations
        switch (frequency) {
          case 'DAILY':
            if (intervalLabel) intervalLabel.textContent = this.t('rrule_days', 'days');
            if (weekdaysSection) weekdaysSection.classList.add('hidden');
            if (monthlySection) monthlySection.classList.add('hidden');
            break;
          case 'WEEKLY':
            if (intervalLabel) intervalLabel.textContent = this.t('rrule_weeks', 'weeks');
            if (weekdaysSection) weekdaysSection.classList.remove('hidden');
            if (monthlySection) monthlySection.classList.add('hidden');
            break;
          case 'MONTHLY':
            if (intervalLabel) intervalLabel.textContent = this.t('rrule_months', 'months');
            if (weekdaysSection) weekdaysSection.classList.add('hidden');
            if (monthlySection) monthlySection.classList.remove('hidden');
            break;
          case 'YEARLY':
            if (intervalLabel) intervalLabel.textContent = this.t('rrule_years', 'years');
            if (weekdaysSection) weekdaysSection.classList.add('hidden');
            if (monthlySection) monthlySection.classList.add('hidden');
            break;
        }
        
        this.updatePreview();
      }
      
      /**
       * Override base class locale change to avoid full re-render
       * This prevents dialogs from closing when language changes
       */
      async handleLocaleChange(event) {
        const newLocale = event.detail.locale;
        
        // Prevent infinite loops by checking if locale actually changed
        if (this.currentLocale === newLocale) {
          console.log(`[RRuleBuilder] Locale change ignored - already ${newLocale}`);
          return;
        }
        
        // Prevent multiple simultaneous locale changes
        if (this._localeChangeInProgress) {
          console.log(`[RRuleBuilder] Locale change already in progress, ignoring`);
          return;
        }
        
        this._localeChangeInProgress = true;
        
        try {
          console.log(`[RRuleBuilder] Locale changing from ${this.currentLocale} to ${newLocale}`);
          this.currentLocale = newLocale;
          
          // Reload translations for new locale
          if (this.translationManager) {
            try {
              await this.translationManager.setLocale(newLocale);
            } catch (error) {
              console.error(`[RRuleBuilder] Failed to update translation manager:`, error);
            }
          }
          
          // Update text content without full re-render
          this.updateTranslatedText();
          
        } finally {
          // Always clear the flag, even if an error occurred
          this._localeChangeInProgress = false;
        }
      }
      
      /**
       * Update only the translated text content without re-rendering
       */
      updateTranslatedText() {
        const shadow = this.shadowRoot;
        if (!shadow) return;
        
        // Update preset buttons
        const presetButtons = shadow.querySelectorAll('.preset-btn');
        if (presetButtons.length >= 4) {
          presetButtons[0].textContent = this.t('rrule_preset_daily', 'Daily');
          presetButtons[1].textContent = this.t('rrule_preset_weekdays', 'Weekdays');
          presetButtons[2].textContent = this.t('rrule_preset_weekly', 'Weekly');
          presetButtons[3].textContent = this.t('rrule_preset_monthly', 'Monthly');
        }
        
        // Update section titles
        const sectionTitles = shadow.querySelectorAll('.section-title');
        sectionTitles.forEach(title => {
          const text = title.textContent.trim();
          if (text.includes('Frequency') || text === this.t('rrule_frequency', 'Frequency')) {
            title.textContent = this.t('rrule_frequency', 'Frequency');
          } else if (text.includes('Interval') || text === this.t('rrule_interval', 'Interval')) {
            title.textContent = this.t('rrule_interval', 'Interval');
          } else if (text.includes('Days of Week') || text === this.t('rrule_days_of_week', 'Days of Week')) {
            title.textContent = this.t('rrule_days_of_week', 'Days of Week');
          } else if (text.includes('End Condition') || text === this.t('rrule_end_condition', 'End Condition')) {
            title.textContent = this.t('rrule_end_condition', 'End Condition');
          } else if (text.includes('Monthly Options') || text === this.t('rrule_monthly_options', 'Monthly Options')) {
            title.textContent = this.t('rrule_monthly_options', 'Monthly Options');
          } else if (text.includes('Preview') || text === this.t('rrule_preview', 'Preview')) {
            title.textContent = this.t('rrule_preview', 'Preview');
          }
        });
        
        // Update frequency radio labels - find the actual label elements
        const frequencyRadios = shadow.querySelectorAll('input[name="frequency"]');
        frequencyRadios.forEach(radio => {
          const label = radio.parentElement;
          if (label && label.tagName === 'LABEL') {
            const value = radio.value;
            if (value === 'DAILY') {
              label.innerHTML = `<input type="radio" name="frequency" value="DAILY"${radio.checked ? ' checked' : ''}> ${this.t('rrule_freq_daily', 'Daily')}`;
            } else if (value === 'WEEKLY') {
              label.innerHTML = `<input type="radio" name="frequency" value="WEEKLY"${radio.checked ? ' checked' : ''}> ${this.t('rrule_freq_weekly', 'Weekly')}`;
            } else if (value === 'MONTHLY') {
              label.innerHTML = `<input type="radio" name="frequency" value="MONTHLY"${radio.checked ? ' checked' : ''}> ${this.t('rrule_freq_monthly', 'Monthly')}`;
            } else if (value === 'YEARLY') {
              label.innerHTML = `<input type="radio" name="frequency" value="YEARLY"${radio.checked ? ' checked' : ''}> ${this.t('rrule_freq_yearly', 'Yearly')}`;
            }
          }
        });
        
        // Update interval section
        const everySpan = shadow.querySelector('.form-row span');
        if (everySpan && everySpan.textContent.includes('Every')) {
          everySpan.textContent = this.t('rrule_every', 'Every');
        }
        
        // Update interval label based on current frequency
        this.onFrequencyChange();
        
        // Update weekday labels - find the actual label elements
        const weekdayRadios = shadow.querySelectorAll('input[name="weekday"]');
        weekdayRadios.forEach(radio => {
          const label = radio.parentElement;
          if (label && label.tagName === 'LABEL') {
            const value = radio.value;
            if (value === 'MO') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="MO"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_mon', 'Mon')}`;
            } else if (value === 'TU') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="TU"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_tue', 'Tue')}`;
            } else if (value === 'WE') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="WE"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_wed', 'Wed')}`;
            } else if (value === 'TH') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="TH"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_thu', 'Thu')}`;
            } else if (value === 'FR') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="FR"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_fri', 'Fri')}`;
            } else if (value === 'SA') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="SA"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_sat', 'Sat')}`;
            } else if (value === 'SU') {
              label.innerHTML = `<input type="checkbox" name="weekday" value="SU"${radio.checked ? ' checked' : ''}> ${this.t('rrule_day_sun', 'Sun')}`;
            }
          }
        });
        
        // Update end condition labels
        const endTypeRadios = shadow.querySelectorAll('input[name="end-type"]');
        endTypeRadios.forEach(radio => {
          const label = radio.parentElement;
          if (label && label.tagName === 'LABEL') {
            const value = radio.value;
            if (value === 'never') {
              label.innerHTML = `<input type="radio" name="end-type" value="never"${radio.checked ? ' checked' : ''}> ${this.t('rrule_never', 'Never')}`;
            } else if (value === 'count') {
              const countInput = shadow.getElementById('count');
              const countValue = countInput ? countInput.value : '10';
              label.innerHTML = `<input type="radio" name="end-type" value="count"${radio.checked ? ' checked' : ''}> ${this.t('rrule_after', 'After')} ${this.renderNumberInput('count', this.parseNumber(countValue), 1, 9999)} ${this.t('rrule_occurrences', 'occurrences')}`;
            } else if (value === 'until') {
              const untilInput = shadow.getElementById('until');
              const untilValue = untilInput ? untilInput.value : '';
              label.innerHTML = `<input type="radio" name="end-type" value="until"${radio.checked ? ' checked' : ''}> ${this.t('rrule_until', 'Until')} ${this.renderDateInput('until')}`;
              // Restore the date value after rendering, ensuring it's properly formatted
              setTimeout(() => {
                const newUntilInput = shadow.getElementById('until');
                if (newUntilInput && untilValue) {
                  // If we're switching to an Indic locale and the value is in YYYY-MM-DD format
                  if (this.isIndicNumeralLocale() && untilValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const parts = untilValue.split('-');
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const day = parseInt(parts[2]);
                    
                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                      const formattedDay = this.formatNumber(String(day).padStart(2, '0'));
                      const formattedMonth = this.formatNumber(String(month).padStart(2, '0'));
                      const formattedYear = this.formatNumber(year);
                      newUntilInput.value = `${formattedDay}/${formattedMonth}/${formattedYear}`;
                    } else {
                      newUntilInput.value = untilValue;
                    }
                  } else {
                    newUntilInput.value = untilValue;
                  }
                }
              }, 0);
            }
          }
        });
        
        // Update monthly options
        const setposOptions = shadow.querySelectorAll('#setpos option');
        if (setposOptions.length >= 5) {
          setposOptions[0].textContent = this.t('rrule_first', 'First');
          setposOptions[1].textContent = this.t('rrule_second', 'Second');
          setposOptions[2].textContent = this.t('rrule_third', 'Third');
          setposOptions[3].textContent = this.t('rrule_fourth', 'Fourth');
          setposOptions[4].textContent = this.t('rrule_last', 'Last');
        }
        
        const weekdayOptions = shadow.querySelectorAll('#setpos-weekday option');
        if (weekdayOptions.length >= 7) {
          weekdayOptions[0].textContent = this.t('rrule_day_monday', 'Monday');
          weekdayOptions[1].textContent = this.t('rrule_day_tuesday', 'Tuesday');
          weekdayOptions[2].textContent = this.t('rrule_day_wednesday', 'Wednesday');
          weekdayOptions[3].textContent = this.t('rrule_day_thursday', 'Thursday');
          weekdayOptions[4].textContent = this.t('rrule_day_friday', 'Friday');
          weekdayOptions[5].textContent = this.t('rrule_day_saturday', 'Saturday');
          weekdayOptions[6].textContent = this.t('rrule_day_sunday', 'Sunday');
        }
        
        // Update number formatting for input fields
        this.updateNumberFormatting();
        
        // Re-attach event listeners to updated elements
        this.reattachEventListeners();
        
        // Update preview
        this.updatePreview();
      }
      
      /**
       * Update number formatting in input fields according to current locale
       */
      updateNumberFormatting() {
        const shadow = this.shadowRoot;
        if (!shadow) return;
        
        // Update interval input
        const intervalInput = shadow.getElementById('interval');
        if (intervalInput) {
          const currentValue = this.parseNumber(intervalInput.value) || '1';
          intervalInput.value = this.formatNumber(currentValue);
        }
        
        // Update count input
        const countInput = shadow.getElementById('count');
        if (countInput) {
          const currentValue = this.parseNumber(countInput.value) || '10';
          countInput.value = this.formatNumber(currentValue);
        }
        
        // Update monthday input
        const monthdayInput = shadow.getElementById('monthday');
        if (monthdayInput) {
          const currentValue = this.parseNumber(monthdayInput.value) || '1';
          monthdayInput.value = this.formatNumber(currentValue);
        }
      }
      
      /**
       * Re-attach event listeners to elements that were updated with innerHTML
       */
      reattachEventListeners() {
        const shadow = this.shadowRoot;
        if (!shadow) return;
        
        // Re-attach frequency change listeners
        const frequencyInputs = shadow.querySelectorAll('input[name="frequency"]');
        frequencyInputs.forEach(radio => {
          radio.addEventListener('change', this.onFrequencyChange);
        });
        
        // Re-attach weekday change listeners
        const weekdayInputs = shadow.querySelectorAll('input[name="weekday"]');
        weekdayInputs.forEach(checkbox => {
          checkbox.addEventListener('change', this.updatePreview);
        });
        
        // Re-attach end condition change listeners
        const endTypeInputs = shadow.querySelectorAll('input[name="end-type"]');
        endTypeInputs.forEach(radio => {
          radio.addEventListener('change', this.updatePreview);
        });
        
        // Re-attach count input listener
        const countInput = shadow.getElementById('count');
        if (countInput) {
          countInput.addEventListener('input', this.updatePreview);
        }
        
        // Re-attach until input listener
        const untilInput = shadow.getElementById('until');
        if (untilInput) {
          untilInput.addEventListener('change', this.updatePreview);
        }
        
        // Re-setup custom spinners and date pickers for Indic locales after innerHTML updates
        if (this.isIndicNumeralLocale()) {
          this.setupCustomSpinners();
          
          // Initialize date picker for the "until" input if it's visible
          const untilRadio = shadow.querySelector('input[name="end-type"][value="until"]:checked');
          if (untilRadio && untilInput) {
            // If the input has a value in standard format (YYYY-MM-DD), convert it to localized format
            if (untilInput.value && untilInput.value.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const parts = untilInput.value.split('-');
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const day = parseInt(parts[2]);
              
              if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const formattedDay = this.formatNumber(String(day).padStart(2, '0'));
                const formattedMonth = this.formatNumber(String(month).padStart(2, '0'));
                const formattedYear = this.formatNumber(year);
                untilInput.value = `${formattedDay}/${formattedMonth}/${formattedYear}`;
              }
            } else {
              // Validate and format the date
              this.validateDateInput(untilInput);
            }
          }
        }
      }
      
      applyPreset(preset) {
        const shadow = this.shadowRoot;
        
        switch (preset) {
          case 'daily':
            const dailyFreq = shadow.querySelector('input[name="frequency"][value="DAILY"]');
            if (dailyFreq) dailyFreq.checked = true;
            const dailyInterval = shadow.getElementById('interval');
            if (dailyInterval) dailyInterval.value = this.formatNumber(1);
            break;
            
          case 'weekdays':
            const weekdaysFreq = shadow.querySelector('input[name="frequency"][value="WEEKLY"]');
            if (weekdaysFreq) weekdaysFreq.checked = true;
            const weekdaysInterval = shadow.getElementById('interval');
            if (weekdaysInterval) weekdaysInterval.value = this.formatNumber(1);
            // Set Monday to Friday
            shadow.querySelectorAll('input[name="weekday"]').forEach(cb => {
              cb.checked = ['MO', 'TU', 'WE', 'TH', 'FR'].includes(cb.value);
            });
            break;
            
          case 'weekly':
            const weeklyFreq = shadow.querySelector('input[name="frequency"][value="WEEKLY"]');
            if (weeklyFreq) weeklyFreq.checked = true;
            const weeklyInterval = shadow.getElementById('interval');
            if (weeklyInterval) weeklyInterval.value = this.formatNumber(1);
            // Set current weekday
            const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
            const currentWeekday = weekdays[this.startDate.getDay()];
            shadow.querySelectorAll('input[name="weekday"]').forEach(cb => {
              cb.checked = cb.value === currentWeekday;
            });
            break;
            
          case 'monthly':
            const monthlyFreq = shadow.querySelector('input[name="frequency"][value="MONTHLY"]');
            if (monthlyFreq) monthlyFreq.checked = true;
            const monthlyInterval = shadow.getElementById('interval');
            if (monthlyInterval) monthlyInterval.value = this.formatNumber(1);
            const monthlyType = shadow.querySelector('input[name="monthly-type"][value="bymonthday"]');
            if (monthlyType) monthlyType.checked = true;
            const dayOfMonth = this.startDate.getDate();
            const monthdayInput = shadow.getElementById('monthday');
            if (monthdayInput) monthdayInput.value = this.formatNumber(dayOfMonth);
            break;
        }
        
        this.onFrequencyChange();
      }
      
      buildRRule() {
        const shadow = this.shadowRoot;
        if (!shadow) {
          console.warn('[RRuleBuilder] Shadow DOM not ready for buildRRule');
          return '';
        }
        
        try {
          const parts = [];
          
          // Frequency
          const frequencyInput = shadow.querySelector('input[name="frequency"]:checked');
          if (!frequencyInput) {
            console.warn('[RRuleBuilder] No frequency selected');
            return '';
          }
          const frequency = frequencyInput.value;
          parts.push(`FREQ=${frequency}`);
          
          // Interval
          const intervalInput = shadow.getElementById('interval');
          if (intervalInput) {
            const interval = parseInt(this.parseNumber(intervalInput.value));
            if (interval > 1) {
              parts.push(`INTERVAL=${interval}`);
            }
          }
          
          // Weekdays for weekly frequency
          if (frequency === 'WEEKLY') {
            const selectedDays = Array.from(shadow.querySelectorAll('input[name="weekday"]:checked'))
              .map(cb => cb.value);
            if (selectedDays.length > 0) {
              parts.push(`BYDAY=${selectedDays.join(',')}`);
            }
          }
          
          // Monthly options
          if (frequency === 'MONTHLY') {
            const monthlyTypeInput = shadow.querySelector('input[name="monthly-type"]:checked');
            if (monthlyTypeInput) {
              const monthlyType = monthlyTypeInput.value;
              if (monthlyType === 'bymonthday') {
                const monthdayInput = shadow.getElementById('monthday');
                if (monthdayInput) {
                  const monthday = parseInt(this.parseNumber(monthdayInput.value));
                  parts.push(`BYMONTHDAY=${monthday}`);
                }
              } else if (monthlyType === 'bysetpos') {
                const setposSelect = shadow.getElementById('setpos');
                const setposWeekdaySelect = shadow.getElementById('setpos-weekday');
                if (setposSelect && setposWeekdaySelect) {
                  const setpos = setposSelect.value;
                  const weekday = setposWeekdaySelect.value;
                  parts.push(`BYDAY=${weekday}`);
                  parts.push(`BYSETPOS=${setpos}`);
                }
              }
            }
          }
          
          // End condition
          const endTypeInput = shadow.querySelector('input[name="end-type"]:checked');
          if (endTypeInput) {
            const endType = endTypeInput.value;
            if (endType === 'count') {
              const countInput = shadow.getElementById('count');
              if (countInput) {
                const count = parseInt(this.parseNumber(countInput.value));
                parts.push(`COUNT=${count}`);
              }
            } else if (endType === 'until') {
              const untilInput = shadow.getElementById('until');
              if (untilInput) {
                const until = untilInput.value;
                if (until) {
                  let untilDate;
                  
                  if (this.isIndicNumeralLocale()) {
                    // Parse custom date format DD/MM/YYYY
                    const dateParts = until.split('/');
                    if (dateParts.length === 3) {
                      const day = parseInt(this.parseNumber(dateParts[0]));
                      const month = parseInt(this.parseNumber(dateParts[1]));
                      const year = parseInt(this.parseNumber(dateParts[2]));
                      untilDate = new Date(year, month - 1, day);
                    }
                  } else {
                    // Standard date input format
                    untilDate = new Date(until + 'T00:00:00Z');
                  }
                  
                  if (untilDate && !isNaN(untilDate.getTime())) {
                    const untilStr = untilDate.toISOString().split('T')[0].replace(/-/g, '');
                    parts.push(`UNTIL=${untilStr}`);
                  }
                }
              }
            }
          }
          
          return parts.join(';');
          
        } catch (error) {
          console.error('Error building RRULE:', error);
          return '';
        }
      }
      
      loadRRule() {
        if (!this.rrule) {
          console.log('[RRuleBuilder] loadRRule: No RRULE to load');
          return;
        }
        
        console.log('[RRuleBuilder] Loading RRULE:', this.rrule);
        
        try {
          const shadow = this.shadowRoot;
          if (!shadow) {
            console.warn('[RRuleBuilder] Shadow DOM not ready for loadRRule');
            return;
          }
          
          const parts = this.rrule.split(';');
          const rules = {};
          
          // Parse RRULE parts
          parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
              rules[key] = value;
            }
          });
          
          console.log('[RRuleBuilder] Parsed RRULE rules:', rules);
          
          // Set frequency
          if (rules.FREQ) {
            const freqRadio = shadow.querySelector(`input[name="frequency"][value="${rules.FREQ}"]`);
            if (freqRadio) {
              freqRadio.checked = true;
              console.log('[RRuleBuilder] Set frequency:', rules.FREQ);
            }
          }
          
          // Set interval
          if (rules.INTERVAL) {
            const intervalInput = shadow.getElementById('interval');
            if (intervalInput) {
              intervalInput.value = this.formatNumber(rules.INTERVAL);
              console.log('[RRuleBuilder] Set interval:', rules.INTERVAL);
            }
          }
          
          // Set weekdays
          if (rules.BYDAY) {
            const weekdays = rules.BYDAY.split(',');
            console.log('[RRuleBuilder] Setting weekdays:', weekdays);
            
            // First, clear all weekday checkboxes
            shadow.querySelectorAll('input[name="weekday"]').forEach(cb => {
              cb.checked = false;
            });
            
            // Then set the ones specified in BYDAY
            weekdays.forEach(weekday => {
              const trimmedWeekday = weekday.trim();
              const checkbox = shadow.querySelector(`input[name="weekday"][value="${trimmedWeekday}"]`);
              if (checkbox) {
                checkbox.checked = true;
                console.log('[RRuleBuilder] ✅ Set weekday checkbox:', trimmedWeekday);
              }
            });
          }
          
          // Set monthly options
          if (rules.BYMONTHDAY) {
            const monthdayRadio = shadow.querySelector('input[name="monthly-type"][value="bymonthday"]');
            if (monthdayRadio) monthdayRadio.checked = true;
            const monthdayInput = shadow.getElementById('monthday');
            if (monthdayInput) monthdayInput.value = this.formatNumber(rules.BYMONTHDAY);
          } else if (rules.BYSETPOS && rules.BYDAY) {
            const setposRadio = shadow.querySelector('input[name="monthly-type"][value="bysetpos"]');
            if (setposRadio) setposRadio.checked = true;
            const setposSelect = shadow.getElementById('setpos');
            if (setposSelect) setposSelect.value = rules.BYSETPOS;
            const setposWeekdaySelect = shadow.getElementById('setpos-weekday');
            if (setposWeekdaySelect) setposWeekdaySelect.value = rules.BYDAY;
          }
          
          // Set end condition
          if (rules.COUNT) {
            const countRadio = shadow.querySelector('input[name="end-type"][value="count"]');
            if (countRadio) countRadio.checked = true;
            const countInput = shadow.getElementById('count');
            if (countInput) countInput.value = this.formatNumber(rules.COUNT);
          } else if (rules.UNTIL) {
            const untilRadio = shadow.querySelector('input[name="end-type"][value="until"]');
            if (untilRadio) untilRadio.checked = true;
            // Convert UNTIL format (YYYYMMDD) to date input format
            const untilStr = rules.UNTIL;
            if (untilStr.length === 8) {
              const year = untilStr.substr(0, 4);
              const month = untilStr.substr(4, 2);
              const day = untilStr.substr(6, 2);
              const untilInput = shadow.getElementById('until');
              if (untilInput) {
                if (this.isIndicNumeralLocale()) {
                  // Format as DD/MM/YYYY with Indic numerals
                  // Make sure to pad with zeros and format properly
                  const formattedDay = this.formatNumber(String(parseInt(day)).padStart(2, '0'));
                  const formattedMonth = this.formatNumber(String(parseInt(month)).padStart(2, '0'));
                  const formattedYear = this.formatNumber(year);
                  untilInput.value = `${formattedDay}/${formattedMonth}/${formattedYear}`;
                  
                  // Force a validation to ensure proper formatting
                  this.validateDateInput(untilInput);
                } else {
                  // Standard date input format YYYY-MM-DD
                  untilInput.value = `${year}-${month}-${day}`;
                }
              }
            }
          } else {
            // Default to "never" if no end condition specified
            const neverRadio = shadow.querySelector('input[name="end-type"][value="never"]');
            if (neverRadio) neverRadio.checked = true;
          }
          
          // Update the UI based on frequency
          this.onFrequencyChange();
          
          // Update preview after loading
          this.updatePreview();
          
          console.log('[RRuleBuilder] ✅ Successfully loaded RRULE');
          
        } catch (error) {
          console.error('[RRuleBuilder] ❌ Error loading RRULE:', error);
        }
      }
      
      updatePreview() {
        const shadow = this.shadowRoot;
        if (!shadow) {
          console.warn('[RRuleBuilder] Shadow DOM not ready for updatePreview');
          return;
        }
        
        const rrule = this.buildRRule();
        
        // Generate preview occurrences
        try {
          const occurrences = this.generatePreviewOccurrences(rrule);
          
          // Update description with localized text
          const description = this.getHumanReadableDescription(rrule);
          const previewDescription = shadow.getElementById('preview-description');
          if (previewDescription) {
            previewDescription.textContent = description;
          }
          
          // Update preview list with localized dates (backend will handle number localization)
          const previewList = shadow.getElementById('preview-list');
          if (!previewList) {
            console.warn('[RRuleBuilder] Preview list element not found');
            return;
          }
          previewList.innerHTML = '';
          
          occurrences.slice(0, 10).forEach(date => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            
            // Format date according to locale (browser handles this)
            let dateStr, weekdayStr;
            try {
              // Use a valid locale format for browser
              const browserLocale = this.currentLocale ? this.currentLocale.replace('_', '-') : 'en-GB';
              dateStr = date.toLocaleDateString(browserLocale);
              weekdayStr = date.toLocaleDateString(browserLocale, { weekday: 'long' });
            } catch (localeError) {
              // Fallback to default formatting
              dateStr = date.toLocaleDateString();
              weekdayStr = date.toLocaleDateString(undefined, { weekday: 'long' });
            }
            
            item.textContent = `${dateStr} (${weekdayStr})`;
            previewList.appendChild(item);
          });
          if (occurrences.length > 10) {
            const item = document.createElement('div');
            item.className = 'preview-item';
            const remainingCount = this.formatNumber(occurrences.length - 10);
            item.textContent = `... ${this.t('rrule_and_more', 'and more')} (${remainingCount})`;
            previewList.appendChild(item);
          }
          
        } catch (error) {
          console.error('Error updating preview:', error);
          const previewDescription = shadow.getElementById('preview-description');
          const previewList = shadow.getElementById('preview-list');
          
          if (previewDescription) {
            previewDescription.textContent = this.t('rrule_invalid_pattern', 'Invalid pattern');
          }
          if (previewList) {
            previewList.innerHTML = `<div class="preview-item error">${this.t('rrule_error_generating_preview', 'Error generating preview')}</div>`;
          }
        }
        
        // Dispatch change event
        this.dispatchEvent(new CustomEvent('change', {
          detail: { rrule: rrule },
          bubbles: true
        }));
      }
      
      generatePreviewOccurrences(rrule) {
        // Enhanced RRULE occurrence generation with proper BYDAY support
        
        const occurrences = [];
        const parts = rrule.split(';');
        const rules = {};
        
        parts.forEach(part => {
          const [key, value] = part.split('=');
          rules[key] = value;
        });
        
        const frequency = rules.FREQ;
        const interval = parseInt(rules.INTERVAL || '1');
        const count = parseInt(rules.COUNT || '20');
        const byDay = rules.BYDAY ? rules.BYDAY.split(',') : [];
        
        // For weekly events with BYDAY, generate occurrences for each specified day
        if (frequency === 'WEEKLY' && byDay.length > 0) {
          const weekdayMap = {'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6};
          const targetDays = byDay.map(day => weekdayMap[day]).filter(day => day !== undefined);
          
          if (targetDays.length > 0) {
            // Start from the beginning of the week containing start date
            let weekStart = new Date(this.startDate);
            weekStart.setDate(this.startDate.getDate() - this.startDate.getDay());
            
            let weekCount = 0;
            let generated = 0;
            
            while (generated < count && weekCount < 50) {
              // For each target day in this week
              for (let targetDay of targetDays.sort()) {
                if (generated >= count) break;
                
                let occurrenceDate = new Date(weekStart);
                occurrenceDate.setDate(weekStart.getDate() + targetDay);
                
                // Only include if on or after start date
                if (occurrenceDate >= this.startDate) {
                  occurrences.push(new Date(occurrenceDate));
                  generated++;
                }
              }
              
              // Move to next week
              weekStart.setDate(weekStart.getDate() + (7 * interval));
              weekCount++;
            }
            
            return occurrences;
          }
        }
        
        // Default behavior for other frequencies or weekly without BYDAY
        let current = new Date(this.startDate);
        let generated = 0;
        
        while (generated < count && generated < 50) {
          occurrences.push(new Date(current));
          generated++;
          
          // Advance to next occurrence
          switch (frequency) {
            case 'DAILY':
              current.setDate(current.getDate() + interval);
              break;
            case 'WEEKLY':
              current.setDate(current.getDate() + (7 * interval));
              break;
            case 'MONTHLY':
              current.setMonth(current.getMonth() + interval);
              break;
            case 'YEARLY':
              current.setFullYear(current.getFullYear() + interval);
              break;
          }
        }
        
        return occurrences;
      }
      
      getHumanReadableDescription(rrule) {
        const parts = rrule.split(';');
        const rules = {};
        
        parts.forEach(part => {
          const [key, value] = part.split('=');
          rules[key] = value;
        });
        
        const frequency = rules.FREQ;
        const interval = parseInt(rules.INTERVAL || '1');
        const byDay = rules.BYDAY ? rules.BYDAY.split(',') : [];
        
        let description = '';
        
        // Build frequency description with translations
        if (interval === 1) {
          switch (frequency) {
            case 'DAILY':
              description = this.t('rrule_every_day', 'Every day');
              break;
            case 'WEEKLY':
              if (byDay.length > 0) {
                const dayNames = {
                  'MO': this.t('rrule_day_monday', 'Monday'),
                  'TU': this.t('rrule_day_tuesday', 'Tuesday'),
                  'WE': this.t('rrule_day_wednesday', 'Wednesday'),
                  'TH': this.t('rrule_day_thursday', 'Thursday'),
                  'FR': this.t('rrule_day_friday', 'Friday'),
                  'SA': this.t('rrule_day_saturday', 'Saturday'),
                  'SU': this.t('rrule_day_sunday', 'Sunday')
                };
                const dayList = byDay.map(day => dayNames[day]).join(', ');
                description = `${this.t('rrule_every_week', 'Every week')} ${this.t('rrule_on', 'on')} ${dayList}`;
              } else {
                description = this.t('rrule_every_week', 'Every week');
              }
              break;
            case 'MONTHLY':
              if (rules.BYMONTHDAY) {
                description = `${this.t('rrule_every_month', 'Every month')} ${this.t('rrule_on_day', 'on day')} ${this.formatNumber(rules.BYMONTHDAY)}`;
              } else if (rules.BYSETPOS && rules.BYDAY) {
                const positions = {
                  '1': this.t('rrule_first', 'first'),
                  '2': this.t('rrule_second', 'second'),
                  '3': this.t('rrule_third', 'third'),
                  '4': this.t('rrule_fourth', 'fourth'),
                  '-1': this.t('rrule_last', 'last')
                };
                const dayNames = {
                  'MO': this.t('rrule_day_monday', 'Monday'),
                  'TU': this.t('rrule_day_tuesday', 'Tuesday'),
                  'WE': this.t('rrule_day_wednesday', 'Wednesday'),
                  'TH': this.t('rrule_day_thursday', 'Thursday'),
                  'FR': this.t('rrule_day_friday', 'Friday'),
                  'SA': this.t('rrule_day_saturday', 'Saturday'),
                  'SU': this.t('rrule_day_sunday', 'Sunday')
                };
                description = `${this.t('rrule_every_month', 'Every month')} ${this.t('rrule_on_the', 'on the')} ${positions[rules.BYSETPOS]} ${dayNames[rules.BYDAY]}`;
              } else {
                description = this.t('rrule_every_month', 'Every month');
              }
              break;
            case 'YEARLY':
              description = this.t('rrule_every_year', 'Every year');
              break;
          }
        } else {
          switch (frequency) {
            case 'DAILY':
              description = `${this.t('rrule_every', 'Every')} ${this.formatNumber(interval)} ${this.t('rrule_days', 'days')}`;
              break;
            case 'WEEKLY':
              if (byDay.length > 0) {
                const dayNames = {
                  'MO': this.t('rrule_day_monday', 'Monday'),
                  'TU': this.t('rrule_day_tuesday', 'Tuesday'),
                  'WE': this.t('rrule_day_wednesday', 'Wednesday'),
                  'TH': this.t('rrule_day_thursday', 'Thursday'),
                  'FR': this.t('rrule_day_friday', 'Friday'),
                  'SA': this.t('rrule_day_saturday', 'Saturday'),
                  'SU': this.t('rrule_day_sunday', 'Sunday')
                };
                const dayList = byDay.map(day => dayNames[day]).join(', ');
                description = `${this.t('rrule_every', 'Every')} ${this.formatNumber(interval)} ${this.t('rrule_weeks', 'weeks')} ${this.t('rrule_on', 'on')} ${dayList}`;
              } else {
                description = `${this.t('rrule_every', 'Every')} ${this.formatNumber(interval)} ${this.t('rrule_weeks', 'weeks')}`;
              }
              break;
            case 'MONTHLY':
              description = `${this.t('rrule_every', 'Every')} ${this.formatNumber(interval)} ${this.t('rrule_months', 'months')}`;
              break;
            case 'YEARLY':
              description = `${this.t('rrule_every', 'Every')} ${this.formatNumber(interval)} ${this.t('rrule_years', 'years')}`;
              break;
          }
        }
        
        // Add end condition
        if (rules.COUNT) {
          description += `, ${this.formatNumber(rules.COUNT)} ${this.t('rrule_times', 'times')}`;
        } else if (rules.UNTIL) {
          const untilStr = rules.UNTIL;
          if (untilStr.length === 8) {
            const year = this.formatNumber(untilStr.substr(0, 4));
            const month = this.formatNumber(untilStr.substr(4, 2));
            const day = this.formatNumber(untilStr.substr(6, 2));
            description += `, ${this.t('rrule_until', 'until')} ${day}/${month}/${year}`;
          }
        }
        
        return description;
      }
      
      getCardSize() {
        return 4;
      }
    }

    // Handle scoped custom element registry properly
    try {
      // Check if we're in a scoped registry environment (Home Assistant)
      const registry = customElements;
      
      // Try to get existing definition
      let existingDefinition = null;
      try {
        existingDefinition = registry.get('rrule-builder');
      } catch (e) {
        // Ignore errors from scoped registry
      }
      
      if (!existingDefinition) {
        try {
          registry.define('rrule-builder', RRuleBuilder);
          console.log('[RRuleBuilder] Custom element registered successfully');
        } catch (defineError) {
          if (defineError.message.includes('already defined')) {
            console.log('[RRuleBuilder] Custom element already defined (scoped registry)');
          } else {
            console.warn('[RRuleBuilder] Registration failed:', defineError.message);
          }
        }
      } else {
        console.log('[RRuleBuilder] Custom element already registered');
      }
    } catch (error) {
      console.warn('[RRuleBuilder] Registration error:', error.message);
    }

    // Register the card (avoid duplicates)
    window.customCards = window.customCards || [];
    const existingCard = window.customCards.find(card => card.type === 'rrule-builder');
    if (!existingCard) {
      window.customCards.push({
        type: 'rrule-builder',
        name: '🔄 RRule Builder',
        description: 'Advanced recurring event pattern builder with full translation support'
      });
      console.log('[RRuleBuilder] Card registered in customCards');
    } else {
      console.log('[RRuleBuilder] Card already registered in customCards');
    }

  }

  // Start initialization
  initRRuleBuilder();
})();
            