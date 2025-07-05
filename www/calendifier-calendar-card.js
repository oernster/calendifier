/**
 * Calendifier Calendar Card - Enhanced with New Translation System
 * Displays a full calendar view with event integration
 * Uses the new unified translation manager for reliable language support
 */

// Ensure base card is loaded first
(function() {
  function initCalendarCard() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initCalendarCard, 100);
      return;
    }

    class CalendifierCalendarCard extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.currentDate = new Date();
        this.events = [];
        this.holidays = [];
        this.selectedDate = null;
        this.loading = true;
      }

      async setConfig(config) {
        try {
          super.setConfig(config);
          
          // Load initial data
          await this.loadInitialData();
          
          // Listen for locale changes
          document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
          
          // Listen for settings changes (including country changes)
          document.addEventListener('calendifier-settings-changed', this.handleSettingsChange.bind(this));
          
          // Listen for event updates from other cards
          document.addEventListener('calendifier-event-added', this.handleEventUpdate.bind(this));
          document.addEventListener('calendifier-event-deleted', this.handleEventUpdate.bind(this));
          document.addEventListener('calendifier-event-updated', this.handleEventUpdate.bind(this));
          
          this.render();
        } catch (error) {
          console.error('[CalendarCard] Error in setConfig():', error);
          throw error;
        }
      }

      async loadInitialData() {
        try {
          this.loading = true;
          this.render();
          
          // Load data in parallel
          await Promise.all([
            this.loadEvents(),
            this.loadHolidays()
          ]);
          this.loading = false;
          this.render();
        } catch (error) {
          console.error('[CalendarCard] Failed to load initial data:', error);
          this.loading = false;
          this.render();
        }
      }

      async loadEvents() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events`);
          if (response.ok) {
            const data = await response.json();
            this.events = data.events || [];
          }
        } catch (error) {
          console.error('[CalendarCard] Error loading events:', error);
          this.events = [];
        }
      }

      async loadHolidays() {
        try {
          const year = this.currentDate.getFullYear();
          
          // Let the backend determine the country based on current locale
          // No frontend country mapping needed - backend handles locale-to-country logic
          const cacheBuster = Date.now() + Math.random();
          const holidayUrl = `${this.getApiBaseUrl()}/api/v1/holidays/auto/${year}?_cb=${cacheBuster}&_force=${Date.now()}`;
          
          const response = await fetch(holidayUrl, {
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // The API returns holidays in data.holidays property
            this.holidays = data.holidays || [];
          } else {
            const errorText = await response.text();
            console.error(`[CalendarCard] Holiday API returned ${response.status}: ${response.statusText}`, errorText);
            this.holidays = [];
          }
        } catch (error) {
          console.error('[CalendarCard] Error loading holidays:', error);
          this.holidays = [];
        }
      }

      async handleEventUpdate(event) {
        // Reload events when other cards add/delete events
        await this.loadEvents();
        this.render();
      }

      async handleLocaleChange(event) {
        // Reload holidays when locale changes (different country holidays)
        await this.loadHolidays();
        this.render();
      }

      async handleSettingsChange(event) {
        // Reload holidays when settings change (including country changes)
        await this.loadHolidays();
        this.render();
      }

      async forceRefreshHolidays() {
        // Public method to force refresh holidays
        await this.loadHolidays();
        this.render();
      }

      async createEvent(eventData) {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(eventData)
          });
          
          if (response.ok) {
            this.showNotification(this.t('success', 'Event created successfully'), 'success');
            await this.loadEvents(); // Refresh calendar
            this.render();
            
            // Notify other cards
            document.dispatchEvent(new CustomEvent('calendifier-event-added', {
              detail: { event: eventData }
            }));
            
            return true;
          } else {
            this.showNotification(this.t('error', 'Failed to create event'), 'error');
            return false;
          }
        } catch (error) {
          console.error('Error creating event:', error);
          this.showNotification(this.t('error', 'Network error creating event'), 'error');
          return false;
        }
      }

      handleDayDoubleClick(day) {
        if (!day) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const selectedDate = new Date(year, month, day).toISOString().split('T')[0];
        
        this.showQuickAddDialog(selectedDate);
      }

      showQuickAddDialog(date) {
        const dialog = this.shadowRoot.querySelector('#quickAddDialog');
        const dateInput = this.shadowRoot.querySelector('#eventDate');
        
        if (dateInput) {
          dateInput.value = date;
        }
        
        if (dialog) {
          dialog.classList.add('show');
        }
      }

      hideQuickAddDialog() {
        const dialog = this.shadowRoot.querySelector('#quickAddDialog');
        if (dialog) {
          dialog.classList.remove('show');
          this.clearQuickAddForm();
        }
      }

      async saveQuickAdd() {
        const title = this.shadowRoot.querySelector('#eventTitle').value.trim();
        const category = this.shadowRoot.querySelector('#eventCategory').value;
        const date = this.shadowRoot.querySelector('#eventDate').value;
        const time = this.shadowRoot.querySelector('#eventTime').value;
        const description = this.shadowRoot.querySelector('#eventDescription').value.trim();

        if (!title || !date) {
          this.showNotification(this.t('error', 'Please enter title and date'), 'error');
          return;
        }

        const eventData = {
          title: title,
          description: description,
          category: category,
          start_date: date,
          start_time: time || null,
          end_date: date,
          end_time: null,
          all_day: !time
        };

        const success = await this.createEvent(eventData);
        if (success) {
          this.hideQuickAddDialog();
        }
      }

      clearQuickAddForm() {
        this.shadowRoot.querySelector('#eventTitle').value = '';
        this.shadowRoot.querySelector('#eventCategory').value = 'general';
        this.shadowRoot.querySelector('#eventDate').value = '';
        this.shadowRoot.querySelector('#eventTime').value = '';
        this.shadowRoot.querySelector('#eventDescription').value = '';
      }

      getEventEmoji(event) {
        const categoryEmojis = {
          'work': '💼',
          'personal': '👤',
          'meeting': '🤝',
          'meal': '🍽️',
          'travel': '✈️',
          'health': '🏥',
          'education': '📚',
          'celebration': '🎉',
          'reminder': '🔔',
          'holiday': '🎊',
          'general': '📅'
        };
        
        const emoji = categoryEmojis[event.category] || categoryEmojis['general'];
        const title = event.title || this.t('untitled_event', 'Untitled Event');
        
        return `<span class="event-emoji" title="${title}">${emoji}</span>`;
      }

      previousMonth() {
        const oldYear = this.currentDate.getFullYear();
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        const newYear = this.currentDate.getFullYear();
        
        // Only reload holidays if year changed
        if (oldYear !== newYear) {
          this.loadHolidays();
        } else {
          this.render();
        }
      }

      nextMonth() {
        const oldYear = this.currentDate.getFullYear();
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        const newYear = this.currentDate.getFullYear();
        
        // Only reload holidays if year changed
        if (oldYear !== newYear) {
          this.loadHolidays();
        } else {
          this.render();
        }
      }

      goToToday() {
        const oldYear = this.currentDate.getFullYear();
        this.currentDate = new Date();
        const newYear = this.currentDate.getFullYear();
        
        // Only reload holidays if year changed
        if (oldYear !== newYear) {
          this.loadHolidays();
        } else {
          this.render();
        }
      }

      getMonthName(monthIndex) {
        // Use translation keys for month names
        const monthKeys = [
          'january', 'february', 'march',
          'april', 'may', 'june',
          'july', 'august', 'september',
          'october', 'november', 'december'
        ];
        
        return this.t(monthKeys[monthIndex], new Date(2000, monthIndex, 1).toLocaleDateString('en', { month: 'long' }));
      }

      getShortDayName(dayIndex) {
        const shortDayKeys = [
          'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
        ];
        
        return this.t(shortDayKeys[dayIndex], new Date(2000, 0, dayIndex).toLocaleDateString('en', { weekday: 'short' }));
      }

      convertNumbers(text) {
        // Convert Western Arabic numerals to Arabic-Indic numerals for Arabic locales
        if (this.currentLocale === 'ar_SA') {
          const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          return text.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
        }
        return text.toString();
      }

      // Removed getCountryFromLocale - backend now handles all locale-to-country mapping

      setupInputLocalization() {
        // Replace native inputs with custom localized ones for non-US/UK locales
        setTimeout(() => {
          this.replaceInputsWithLocalizedVersions();
        }, 100);
      }

      replaceInputsWithLocalizedVersions() {
        // Always replace time inputs with custom dropdowns for better UX
        const timeInputs = this.shadowRoot.querySelectorAll('input[type="time"]');
        timeInputs.forEach(input => {
          this.replaceTimeInput(input);
        });

        // Replace date inputs with custom date picker for non-US/UK locales
        // Keep native date picker for en_US and en_GB
        if (this.currentLocale !== 'en_US' && this.currentLocale !== 'en_GB') {
          const dateInputs = this.shadowRoot.querySelectorAll('input[type="date"]');
          dateInputs.forEach(input => {
            this.replaceDateInput(input);
          });
        }
      }

      replaceTimeInput(originalInput) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '4px';
        wrapper.style.width = '100%';

        // Create hour dropdown
        const hourSelect = document.createElement('select');
        hourSelect.className = originalInput.className;
        hourSelect.style.cssText = originalInput.style.cssText;
        hourSelect.style.flex = '1';
        
        // Add hour options
        for (let i = 0; i < 24; i++) {
          const option = document.createElement('option');
          const hourStr = String(i).padStart(2, '0');
          option.value = hourStr;
          // Use convertNumbers for Arabic locales, regular numbers for others
          option.textContent = this.convertNumbers(hourStr);
          hourSelect.appendChild(option);
        }

        // Create minute dropdown
        const minuteSelect = document.createElement('select');
        minuteSelect.className = originalInput.className;
        minuteSelect.style.cssText = originalInput.style.cssText;
        minuteSelect.style.flex = '1';
        
        // Add minute options (every 15 minutes)
        for (let i = 0; i < 60; i += 15) {
          const option = document.createElement('option');
          const minuteStr = String(i).padStart(2, '0');
          option.value = minuteStr;
          // Use convertNumbers for Arabic locales, regular numbers for others
          option.textContent = this.convertNumbers(minuteStr);
          minuteSelect.appendChild(option);
        }

        // Update original input when dropdowns change
        const updateOriginalInput = () => {
          const timeValue = `${hourSelect.value}:${minuteSelect.value}`;
          originalInput.value = timeValue;
        };

        hourSelect.addEventListener('change', updateOriginalInput);
        minuteSelect.addEventListener('change', updateOriginalInput);

        // Set initial values if exists
        if (originalInput.value) {
          const [hour, minute] = originalInput.value.split(':');
          if (hour) hourSelect.value = hour;
          if (minute) minuteSelect.value = minute;
        }

        // Replace in DOM
        originalInput.style.display = 'none';
        originalInput.parentNode.insertBefore(wrapper, originalInput);
        wrapper.appendChild(hourSelect);
        wrapper.appendChild(minuteSelect);
        wrapper.appendChild(originalInput);
      }

      replaceDateInput(originalInput) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.width = '100%';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = originalInput.className;
        textInput.placeholder = 'YYYY-MM-DD';
        textInput.style.cssText = originalInput.style.cssText;
        textInput.style.cursor = 'pointer';
        textInput.style.backgroundColor = originalInput.style.backgroundColor || 'var(--card-background-color)';
        textInput.readOnly = true;

        // Preserve the original ID for form functionality
        const originalId = originalInput.id;
        originalInput.id = originalId + '_hidden';
        textInput.id = originalId;

        // Create simple date picker
        textInput.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showArabicDatePicker(originalInput, textInput);
        });

        // Set initial value if exists
        if (originalInput.value) {
          textInput.value = this.convertNumbers(originalInput.value);
        }

        // Replace in DOM
        originalInput.style.display = 'none';
        originalInput.parentNode.insertBefore(wrapper, originalInput);
        wrapper.appendChild(textInput);
        wrapper.appendChild(originalInput);
      }

      showArabicDatePicker(hiddenInput, displayInput) {
        // Create a smart date picker overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        const picker = document.createElement('div');
        picker.style.cssText = `
          background: var(--card-background-color);
          border-radius: 8px;
          padding: 20px;
          max-width: 300px;
          width: 90%;
        `;

        const currentDate = hiddenInput.value || new Date().toISOString().split('T')[0];
        const [year, month, day] = currentDate.split('-');

        // Helper function to get days in month
        const getDaysInMonth = (year, month) => {
          return new Date(year, month, 0).getDate();
        };

        // Helper function to check if year is leap year
        const isLeapYear = (year) => {
          return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        };

        // Helper function to update day options based on selected year/month
        const updateDayOptions = () => {
          const yearSelect = picker.querySelector('#yearSelect');
          const monthSelect = picker.querySelector('#monthSelect');
          const daySelect = picker.querySelector('#daySelect');
          
          const selectedYear = parseInt(yearSelect.value);
          const selectedMonth = parseInt(monthSelect.value);
          const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
          const currentDay = parseInt(daySelect.value);
          
          // Clear existing options
          daySelect.innerHTML = '';
          
          // Add valid day options
          for (let i = 1; i <= daysInMonth; i++) {
            const option = document.createElement('option');
            const dayStr = String(i).padStart(2, '0');
            option.value = dayStr;
            option.textContent = this.convertNumbers(dayStr);
            if (i === currentDay && i <= daysInMonth) {
              option.selected = true;
            }
            daySelect.appendChild(option);
          }
          
          // If current day is invalid for the new month, select the last valid day
          if (currentDay > daysInMonth) {
            daySelect.value = String(daysInMonth).padStart(2, '0');
          }
        };

        picker.innerHTML = `
          <div style="text-align: center; margin-bottom: 16px; font-weight: bold; color: var(--primary-color);">
            📅 ${this.t('select_date', 'Select Date')}
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <select id="yearSelect" style="flex: 1; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--secondary-background-color); color: var(--primary-text-color); max-height: 200px; overflow-y: auto;">
              ${Array.from({length: 31}, (_, i) => {
                const y = 2020 + i; // Years 2020-2050
                return `<option value="${y}" ${y == year ? 'selected' : ''}>${this.convertNumbers(y)}</option>`;
              }).join('')}
            </select>
            <select id="monthSelect" style="flex: 1; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--secondary-background-color); color: var(--primary-text-color);">
              ${Array.from({length: 12}, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                const monthName = this.getMonthName(i);
                return `<option value="${m}" ${m == month ? 'selected' : ''}>${monthName}</option>`;
              }).join('')}
            </select>
            <select id="daySelect" style="flex: 1; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--secondary-background-color); color: var(--primary-text-color);">
              <!-- Days will be populated by updateDayOptions -->
            </select>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="cancelBtn" style="padding: 8px 16px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--secondary-background-color); color: var(--primary-text-color); cursor: pointer;">
              ❌ ${this.t('cancel', 'Cancel')}
            </button>
            <button id="okBtn" style="padding: 8px 16px; border: none; border-radius: 4px; background: var(--primary-color); color: white; cursor: pointer;">
              ✅ ${this.t('ok', 'OK')}
            </button>
          </div>
        `;

        overlay.appendChild(picker);
        document.body.appendChild(overlay);

        // Initialize day options
        updateDayOptions();

        // Add event listeners for year/month changes
        const yearSelect = picker.querySelector('#yearSelect');
        const monthSelect = picker.querySelector('#monthSelect');
        
        yearSelect.addEventListener('change', updateDayOptions);
        monthSelect.addEventListener('change', updateDayOptions);

        // Event handlers
        picker.querySelector('#cancelBtn').addEventListener('click', () => {
          document.body.removeChild(overlay);
        });

        picker.querySelector('#okBtn').addEventListener('click', () => {
          const selectedYear = picker.querySelector('#yearSelect').value;
          const selectedMonth = picker.querySelector('#monthSelect').value;
          const selectedDay = picker.querySelector('#daySelect').value;
          
          // Validate the date
          const dateObj = new Date(selectedYear, selectedMonth - 1, selectedDay);
          if (dateObj.getFullYear() == selectedYear &&
              dateObj.getMonth() == selectedMonth - 1 &&
              dateObj.getDate() == selectedDay) {
            
            const dateValue = `${selectedYear}-${selectedMonth}-${selectedDay}`;
            hiddenInput.value = dateValue;
            displayInput.value = this.convertNumbers(dateValue);
            document.body.removeChild(overlay);
          } else {
            alert(this.t('invalid_date', 'Invalid date selected'));
          }
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            document.body.removeChild(overlay);
          }
        });
      }

      render() {
        if (this.loading) {
          this.shadowRoot.innerHTML = `
            <style>${this.getCommonStyles()}</style>
            ${this.renderLoadingState(this.t('loading', 'Loading calendar...'))}
          `;
          return;
        }

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const todayDate = today.getDate();

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Generate calendar days
        const calendarDays = [];
        
        // Add days from previous month
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
          calendarDays.push({
            day: daysInPrevMonth - i,
            isCurrentMonth: false,
            isPrevMonth: true
          });
        }
        
        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
          calendarDays.push({
            day: day,
            isCurrentMonth: true,
            isPrevMonth: false
          });
        }
        
        // Add days from next month to fill the grid
        const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
          calendarDays.push({
            day: day,
            isCurrentMonth: false,
            isPrevMonth: false
          });
        }

        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            .calendar-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
              padding: 12px;
              background: var(--secondary-background-color);
              border-radius: 8px;
              gap: 8px;
            }
            
            .month-year {
              font-size: 1.2em;
              font-weight: bold;
              color: var(--primary-color);
              flex: 1;
              text-align: center;
            }
            
            .nav-button {
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 4px;
              padding: 6px 12px;
              font-size: 0.9em;
              cursor: pointer;
              transition: background 0.2s;
            }
            
            .nav-button:hover {
              background: var(--primary-color-dark);
            }
            
            .today-button {
              font-size: 0.8em;
              padding: 4px 8px;
            }
            
            .calendar-grid {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 1px;
              background: var(--divider-color);
              border-radius: 8px;
              overflow: hidden;
            }
            
            .day-header {
              background: var(--secondary-background-color);
              padding: 8px 4px;
              text-align: center;
              font-weight: bold;
              font-size: 0.8em;
              color: var(--primary-color);
            }
            
            .day-cell {
              background: var(--card-background-color);
              min-height: 40px;
              padding: 4px;
              cursor: pointer;
              transition: background 0.2s;
              position: relative;
              display: flex;
              flex-direction: column;
            }
            
            .day-cell:hover {
              background: var(--secondary-background-color);
            }
            
            .day-cell.today {
              background: var(--primary-color);
              color: white;
            }
            
            .day-cell.holiday {
              background: linear-gradient(135deg, var(--card-background-color) 0%, #fff3cd 100%);
              border-left: 3px solid #ffc107;
            }
            
            .day-cell.today.holiday {
              background: linear-gradient(135deg, var(--primary-color) 0%, #ff6b35 100%);
              border-left: 3px solid #ffc107;
            }
            
            .day-cell.other-month {
              background: var(--card-background-color);
              color: var(--secondary-text-color);
              opacity: 0.5;
              cursor: default;
            }
            
            .day-cell.other-month .day-number {
              color: var(--secondary-text-color);
              opacity: 0.7;
            }
            
            .day-cell.other-month .event-indicators {
              opacity: 0.6;
            }
            
            .day-number {
              font-weight: bold;
              margin-bottom: 2px;
              font-size: 0.9em;
            }
            
            .event-indicators {
              display: flex;
              flex-wrap: wrap;
              gap: 1px;
              justify-content: flex-start;
              align-items: flex-start;
              min-height: 16px;
            }
            
            .event-emoji {
              font-size: 13px;
              line-height: 1;
              cursor: help;
              opacity: 0.8;
              transition: opacity 0.2s;
            }
            
            .event-emoji:hover {
              opacity: 1;
              transform: scale(1.1);
            }
            
            .holiday-indicator {
              font-size: 13px;
              line-height: 1;
              cursor: help;
              opacity: 0.9;
              transition: all 0.2s;
              filter: drop-shadow(0 1px 2px rgba(255, 193, 7, 0.3));
            }
            
            .holiday-indicator:hover {
              opacity: 1;
              transform: scale(1.2);
              filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.5));
            }
            
            .quick-add-dialog {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.5);
              display: none;
              align-items: center;
              justify-content: center;
              z-index: 1000;
            }
            
            .quick-add-dialog.show {
              display: flex;
            }
            
            .dialog-content {
              background: var(--card-background-color);
              border-radius: 8px;
              padding: 24px;
              max-width: 400px;
              width: 90%;
              max-height: 80vh;
              overflow-y: auto;
            }
            
            .dialog-header {
              font-size: 1.2em;
              font-weight: bold;
              color: var(--primary-color);
              margin-bottom: 16px;
              text-align: center;
            }
            
            .form-row {
              display: flex;
              gap: 8px;
              margin-bottom: 12px;
            }
            
            .form-input {
              flex: 1;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
            }
            
            .form-textarea {
              width: 100%;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
              resize: vertical;
              min-height: 60px;
              font-family: inherit;
            }
            
            .form-select {
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
            }
            
            .form-actions {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
              margin-top: 16px;
            }
            
            .form-button {
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.9em;
              transition: background 0.2s;
            }
            
            .form-button.primary {
              background: var(--primary-color);
              color: white;
            }
            
            .form-button.primary:hover {
              background: var(--primary-color-dark);
            }
            
            .form-button.secondary {
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              border: 1px solid var(--divider-color);
            }
            
          </style>
          
          <div class="notification"></div>
          
          <div class="card-header">
            📅 ${this.t('calendar_view', 'Calendar')}
          </div>
          
          <div class="calendar-header">
            <button class="nav-button" onclick="this.getRootNode().host.previousMonth()">◀️</button>
            <div class="month-year">
              ${this.getMonthName(month)} ${this.convertNumbers(year)}
            </div>
            <button class="nav-button" onclick="this.getRootNode().host.nextMonth()">▶️</button>
            <button class="nav-button today-button" onclick="this.getRootNode().host.goToToday()">📅 ${this.t('today', 'Today')}</button>
          </div>
          
          <div class="calendar-grid">
            ${[0, 1, 2, 3, 4, 5, 6].map(dayIndex => `
              <div class="day-header">${this.getShortDayName(dayIndex)}</div>
            `).join('')}
            
            ${calendarDays.map((dayObj, index) => {
              const classes = ['day-cell'];
              let dayDate, dayEvents = [], dayHolidays = [];
              
              if (!dayObj.isCurrentMonth) {
                classes.push('other-month');
                // Calculate the correct date for prev/next month days
                if (dayObj.isPrevMonth) {
                  dayDate = new Date(year, month - 1, dayObj.day).toISOString().split('T')[0];
                } else {
                  dayDate = new Date(year, month + 1, dayObj.day).toISOString().split('T')[0];
                }
              } else {
                const isToday = isCurrentMonth && dayObj.day === todayDate;
                if (isToday) classes.push('today');
                dayDate = new Date(year, month, dayObj.day).toISOString().split('T')[0];
              }
              
              // Check for events on this day
              dayEvents = this.events.filter(event => event.start_date === dayDate);
              
              // Check for holidays on this day
              dayHolidays = this.holidays.filter(holiday => holiday.date === dayDate);
              
              if (dayHolidays.length > 0) {
                classes.push('holiday');
              }
              
              const clickHandler = dayObj.isCurrentMonth ? `ondblclick="this.getRootNode().host.handleDayDoubleClick(${dayObj.day})"` : '';
              
              return `
                <div class="${classes.join(' ')}" ${clickHandler}>
                  <div class="day-number">${this.convertNumbers(dayObj.day)}</div>
                  <div class="event-indicators">
                    ${dayHolidays.map(holiday => `<span class="holiday-indicator" title="${holiday.name}">🎊</span>`).join('')}
                    ${dayEvents.map(event => this.getEventEmoji(event)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="quick-add-dialog" id="quickAddDialog">
            <div class="dialog-content">
              <div class="dialog-header">
                ➕ ${this.t('add', 'Add')} ${this.t('event', 'Event')}
              </div>
              
              <div class="form-row">
                <input type="text" class="form-input" id="eventTitle" placeholder="📅 ${this.t('title', 'Title')}..." />
              </div>
              
              <div class="form-row">
                <select class="form-select" id="eventCategory">
                  <option value="general">📅 ${this.t('general', 'General')}</option>
                  <option value="work">💼 ${this.t('category_work', 'Work')}</option>
                  <option value="personal">👤 ${this.t('category_personal', 'Personal')}</option>
                  <option value="meeting">🤝 ${this.t('category_meeting', 'Meeting')}</option>
                  <option value="meal">🍽️ ${this.t('category_meal', 'Meal')}</option>
                  <option value="travel">✈️ ${this.t('category_travel', 'Travel')}</option>
                  <option value="health">🏥 ${this.t('category_health', 'Health')}</option>
                  <option value="education">📚 ${this.t('category_education', 'Education')}</option>
                  <option value="celebration">🎉 ${this.t('category_celebration', 'Celebration')}</option>
                  <option value="reminder">🔔 ${this.t('category_reminder', 'Reminder')}</option>
                  <option value="holiday">🎊 ${this.t('category_holiday', 'Holiday')}</option>
                </select>
              </div>
              
              <div class="form-row">
                <input type="date" class="form-input" id="eventDate" />
                <input type="time" class="form-input" id="eventTime" placeholder="${this.t('time', 'Time')} (${this.t('optional', 'optional')})" />
              </div>
              
              <div class="form-row">
                <textarea class="form-textarea" id="eventDescription" placeholder="📄 ${this.t('description', 'Description')} (${this.t('optional', 'optional')})..."></textarea>
              </div>
              
              <div class="form-actions">
                <button class="form-button secondary" onclick="this.getRootNode().host.hideQuickAddDialog()">❌ ${this.t('cancel', 'Cancel')}</button>
                <button class="form-button primary" onclick="this.getRootNode().host.saveQuickAdd()">💾 ${this.t('save', 'Save')}</button>
              </div>
            </div>
          </div>
        `;
        
        // Setup input localization for Arabic numerals
        this.setupInputLocalization();
      }

      getCardSize() {
        return 6;
      }
    }

    if (!customElements.get('calendifier-calendar-card')) {
      customElements.define('calendifier-calendar-card', CalendifierCalendarCard);
    }

    // Register the card
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'calendifier-calendar-card',
      name: '📅 Calendifier Calendar',
      description: 'Full calendar view with events and holidays'
    });

  }

  // Start initialization
  initCalendarCard();
})();