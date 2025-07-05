/**
 * Calendifier Events Card - Enhanced with New Translation System
 * Displays today's and upcoming events with management capabilities
 * Uses the new unified translation manager for reliable language support
 */

// Ensure base card is loaded first
(function() {
  function initEventsCard() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initEventsCard, 100);
      return;
    }

    class CalendifierEventsCard extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.events = [];
        this.loading = true;
        this.showCompleted = false;
        this.selectedDate = null;
        this.maxEvents = 5;
      }

      async setConfig(config) {
        super.setConfig(config);
        this.maxEvents = this.config.max_events || 5;
        this.showCompleted = this.config.show_completed || false;
        
        // Load events after translation system is ready
        await this.loadEvents();
        
        // Listen for locale changes
        document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
        
        // Listen for event updates from other cards (like calendar)
        document.addEventListener('calendifier-event-added', this.handleEventUpdate.bind(this));
      }

      async loadEvents() {
        try {
          this.loading = true;
          this.render();
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events`);
          if (response.ok) {
            const data = await response.json();
            this.events = data.events || [];
          } else {
            this.events = [];
          }
        } catch (error) {
          console.error('[EventsCard] Error loading events:', error);
          this.events = [];
        }
        
        this.loading = false;
        this.render();
      }

      async handleEventUpdate(event) {
        // Reload events when other cards add events
        await this.loadEvents();
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
            await this.loadEvents(); // Auto-refresh
            
            // Notify other cards (like calendar)
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

      async deleteEvent(eventId) {
        if (!confirm(this.t('are_you_sure_you_want_to_delete_this_event', 'Are you sure you want to delete this event?'))) {
          return;
        }

        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events/${eventId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            this.showNotification(this.t('success', 'Event deleted successfully'), 'success');
            await this.loadEvents(); // Auto-refresh
            
            // Notify other cards (like calendar)
            document.dispatchEvent(new CustomEvent('calendifier-event-deleted', {
              detail: { eventId: eventId }
            }));
          } else {
            this.showNotification(this.t('error', 'Failed to delete event'), 'error');
          }
        } catch (error) {
          console.error('Error deleting event:', error);
          this.showNotification(this.t('error', 'Network error deleting event'), 'error');
        }
      }

      async updateEvent(eventId, eventData) {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events/${eventId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(eventData)
          });
          
          if (response.ok) {
            this.showNotification(this.t('success', 'Event updated successfully'), 'success');
            await this.loadEvents(); // Auto-refresh
            
            // Notify other cards (like calendar)
            document.dispatchEvent(new CustomEvent('calendifier-event-updated', {
              detail: { eventId: eventId, event: eventData }
            }));
            
            return true;
          } else {
            this.showNotification(this.t('error', 'Failed to update event'), 'error');
            return false;
          }
        } catch (error) {
          console.error('Error updating event:', error);
          this.showNotification(this.t('error', 'Network error updating event'), 'error');
          return false;
        }
      }

      editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        // Hide quick add form if open
        const quickAddForm = this.shadowRoot.querySelector('#quickAddEventForm');
        if (quickAddForm) quickAddForm.classList.remove('show');
        
        // Show edit form
        const editForm = this.shadowRoot.querySelector('#editEventForm');
        if (editForm) {
          editForm.classList.add('show');
          
          // Populate form with event data
          this.shadowRoot.querySelector('#editEventId').value = event.id;
          this.shadowRoot.querySelector('#editEventTitle').value = event.title || '';
          this.shadowRoot.querySelector('#editEventCategory').value = event.category || 'general';
          this.shadowRoot.querySelector('#editEventDate').value = event.start_date || '';
          this.shadowRoot.querySelector('#editEventTime').value = event.start_time || '';
          this.shadowRoot.querySelector('#editEventDescription').value = event.description || '';
        }
      }

      async saveEdit() {
        const eventId = this.shadowRoot.querySelector('#editEventId').value;
        const title = this.shadowRoot.querySelector('#editEventTitle').value.trim();
        const category = this.shadowRoot.querySelector('#editEventCategory').value;
        const date = this.shadowRoot.querySelector('#editEventDate').value;
        const time = this.shadowRoot.querySelector('#editEventTime').value;
        const description = this.shadowRoot.querySelector('#editEventDescription').value.trim();

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

        const success = await this.updateEvent(eventId, eventData);
        if (success) {
          this.cancelEdit();
        }
      }

      cancelEdit() {
        const editForm = this.shadowRoot.querySelector('#editEventForm');
        if (editForm) {
          editForm.classList.remove('show');
          this.clearEditForm();
        }
      }

      clearEditForm() {
        this.shadowRoot.querySelector('#editEventId').value = '';
        this.shadowRoot.querySelector('#editEventTitle').value = '';
        this.shadowRoot.querySelector('#editEventCategory').value = 'general';
        this.shadowRoot.querySelector('#editEventDate').value = '';
        this.shadowRoot.querySelector('#editEventTime').value = '';
        this.shadowRoot.querySelector('#editEventDescription').value = '';
      }

      toggleQuickAdd() {
        const form = this.shadowRoot.querySelector('#quickAddEventForm');
        const isVisible = form.classList.contains('show');
        
        if (isVisible) {
          form.classList.remove('show');
          this.clearQuickAddForm();
        } else {
          form.classList.add('show');
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
          this.toggleQuickAdd();
        }
      }

      cancelQuickAdd() {
        this.toggleQuickAdd();
      }

      clearQuickAddForm() {
        this.shadowRoot.querySelector('#eventTitle').value = '';
        this.shadowRoot.querySelector('#eventCategory').value = 'general';
        this.shadowRoot.querySelector('#eventDate').value = '';
        this.shadowRoot.querySelector('#eventTime').value = '';
        this.shadowRoot.querySelector('#eventDescription').value = '';
      }

      convertNumbers(text) {
        // Convert Western Arabic numerals to Arabic-Indic numerals for Arabic locales
        if (this.currentLocale === 'ar_SA') {
          const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          return text.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
        }
        return text.toString();
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
            ${this.renderLoadingState(this.t('loading', 'Loading events...'))}
          `;
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        const todayEvents = this.events.filter(e => e.start_date === today);
        const upcomingEvents = this.events.filter(e => e.start_date > today);

        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            .events-container {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            
            .events-section {
              margin-bottom: 16px;
            }
            
            .section-header {
              font-size: 1em;
              font-weight: bold;
              color: var(--primary-color);
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .event-item {
              background: var(--secondary-background-color);
              border-radius: 8px;
              padding: 12px;
              border-left: 4px solid var(--primary-color);
              transition: transform 0.2s, box-shadow 0.2s;
              cursor: pointer;
            }
            
            .event-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .event-title {
              font-weight: bold;
              color: var(--primary-text-color);
              font-size: 1em;
              margin-bottom: 4px;
            }
            
            .event-time {
              color: var(--primary-color);
              font-size: 0.9em;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            
            .no-events {
              text-align: center;
              color: var(--secondary-text-color);
              padding: 24px;
              font-style: italic;
            }
            
            .no-events-emoji {
              font-size: 2.6em;
              margin-bottom: 8px;
            }
            
            /* Increase all emoji sizes by 130% */
            .card-header span,
            .section-header span,
            .event-title,
            .event-time,
            .add-event-button,
            .form-button,
            .event-action,
            input::placeholder,
            textarea::placeholder,
            select option {
              font-size: 1.3em;
            }
            
            /* Specific emoji sizing adjustments */
            .event-item .event-title {
              font-size: 1.3em;
            }
            
            .event-time {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
            
            .form-input::placeholder,
            .form-textarea::placeholder {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
            
            .event-actions {
              display: flex;
              gap: 4px;
              opacity: 0;
              transition: opacity 0.2s;
              position: absolute;
              top: 8px;
              right: 8px;
            }
            
            .event-item:hover .event-actions {
              opacity: 1;
            }
            
            .event-action {
              background: none;
              border: none;
              color: var(--secondary-text-color);
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              font-size: 0.9em;
              transition: all 0.2s;
            }
            
            .event-action:hover {
              background: var(--divider-color);
              color: var(--primary-text-color);
            }
            
            .add-event-section {
              background: var(--secondary-background-color);
              border-radius: 8px;
              padding: 16px;
              text-align: center;
              border: 2px dashed var(--divider-color);
              margin-top: 16px;
            }
            
            .add-event-button {
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 12px 24px;
              font-size: 1em;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin: 0 auto;
              width: 100%;
              max-width: 200px;
              transition: background 0.2s;
            }
            
            .add-event-button:hover {
              background: var(--primary-color-dark);
            }
            
            .quick-add-form {
              display: none;
              margin-top: 12px;
              text-align: left;
            }
            
            .quick-add-form.show {
              display: block;
            }
            
            .form-row {
              display: flex;
              gap: 8px;
              margin-bottom: 8px;
            }
            
            .form-input {
              flex: 1;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
            }
            
            .form-textarea {
              width: 100%;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
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
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
            }
            
            .form-actions {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
              margin-top: 12px;
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
            <span>📋 ${this.t('events', 'Events')} (${this.convertNumbers(this.events.length)})</span>
            <div class="header-actions">
              <button class="action-button" onclick="this.getRootNode().host.loadEvents()">
                🔄 ${this.t('save', 'Refresh')}
              </button>
            </div>
          </div>
          
          <div class="events-container">
            ${this.renderTodayEvents()}
            ${this.renderUpcomingEvents()}
          </div>
          
          ${this.renderAddEventSection()}
        `;
        
        // Setup input localization for Arabic numerals
        this.setupInputLocalization();
      }

      renderTodayEvents() {
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = this.events.filter(e => e.start_date === today);

        if (todayEvents.length === 0) {
          return `
            <div class="events-section">
              <div class="section-header">
                <span>🔵 ${this.t('today', 'Today')}</span>
              </div>
              <div class="no-events">
                <div class="no-events-emoji">📅</div>
                <div>${this.t('no_events_for_this_date', 'No events scheduled for today')}</div>
              </div>
            </div>
          `;
        }

        return `
          <div class="events-section">
            <div class="section-header">
              <span>🔵 ${this.t('today', 'Today')} (${this.convertNumbers(todayEvents.length)})</span>
            </div>
            ${todayEvents.map(event => this.renderEvent(event)).join('')}
          </div>
        `;
      }

      renderUpcomingEvents() {
        const today = new Date().toISOString().split('T')[0];
        const upcomingEvents = this.events.filter(e => e.start_date > today).slice(0, this.maxEvents);
        
        if (upcomingEvents.length === 0) {
          return `
            <div class="events-section">
              <div class="section-header">
                <span>🟡 ${this.t('next', 'Next')}</span>
              </div>
              <div class="no-events">
                <div class="no-events-emoji">📆</div>
                <div>${this.t('no_events_for_this_date', 'No events for this date')}</div>
              </div>
            </div>
          `;
        }

        return `
          <div class="events-section">
            <div class="section-header">
              <span>🟡 ${this.t('next', 'Next')} (${this.convertNumbers(upcomingEvents.length)})</span>
            </div>
            ${upcomingEvents.map(event => this.renderEvent(event)).join('')}
          </div>
        `;
      }

      renderEvent(event) {
        const timeDisplay = event.start_time ?
          `🕐 ${this.convertNumbers(event.start_time)}` :
          `📅 ${this.t('all_day', 'All day')}`;

        const categoryEmojis = {
          general: '📅',
          work: '💼',
          personal: '👤',
          meeting: '🤝',
          meal: '🍽️',
          travel: '✈️',
          health: '🏥',
          education: '📚',
          celebration: '🎉',
          reminder: '🔔',
          holiday: '🎊',
          default: '📅'
        };

        const categoryEmoji = categoryEmojis[event.category || 'default'] || '📅';

        return `
          <div class="event-item" style="position: relative;">
            <div class="event-actions">
              <button class="event-action" onclick="event.stopPropagation(); this.getRootNode().host.editEvent(${event.id || 0})" title="Edit Event">✏️</button>
              <button class="event-action" onclick="event.stopPropagation(); this.getRootNode().host.deleteEvent(${event.id || 0})" title="Delete Event">🗑️</button>
            </div>
            <div class="event-title">${categoryEmoji} ${event.title}</div>
            <div class="event-time">${timeDisplay}</div>
            ${event.description ? `<div style="color: var(--secondary-text-color); font-size: 0.9em; margin-top: 4px;">📄 ${event.description}</div>` : ''}
            ${event.category ? `<div style="color: var(--primary-color); font-size: 0.8em; margin-top: 4px;">${this.t(`category_${event.category}`, event.category.charAt(0).toUpperCase() + event.category.slice(1))}</div>` : ''}
          </div>
        `;
      }

      renderAddEventSection() {
        const today = new Date().toISOString().split('T')[0];
        
        return `
          <div class="add-event-section">
            <button class="add-event-button" onclick="this.getRootNode().host.toggleQuickAdd()">
              ➕ ${this.t('add', 'Add')} ${this.t('event', 'Event')}
            </button>
            
            <div class="quick-add-form" id="quickAddEventForm">
              <div class="form-row">
                <input type="text" class="form-input" id="eventTitle" placeholder="📅 ${this.t('title', 'Title')}..." />
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
                <input type="date" class="form-input" id="eventDate" value="${today}" />
                <input type="time" class="form-input" id="eventTime" placeholder="${this.t('time', 'Time')} (${this.t('optional', 'optional')})" />
              </div>
              <div class="form-row">
                <textarea class="form-textarea" id="eventDescription" placeholder="📄 ${this.t('description', 'Description')} (${this.t('optional', 'optional')})..."></textarea>
              </div>
              <div class="form-actions">
                <button class="form-button secondary" onclick="this.getRootNode().host.cancelQuickAdd()">❌ ${this.t('cancel', 'Cancel')}</button>
                <button class="form-button primary" onclick="this.getRootNode().host.saveQuickAdd()">💾 ${this.t('save', 'Save')}</button>
              </div>
            </div>
            
            <div class="quick-add-form" id="editEventForm">
              <div style="font-weight: bold; margin-bottom: 12px; color: var(--primary-color);">✏️ ${this.t('edit', 'Edit')} ${this.t('event', 'Event')}</div>
              <input type="hidden" id="editEventId" />
              <div class="form-row">
                <input type="text" class="form-input" id="editEventTitle" placeholder="📅 ${this.t('title', 'Title')}..." />
                <select class="form-select" id="editEventCategory">
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
                <input type="date" class="form-input" id="editEventDate" />
                <input type="time" class="form-input" id="editEventTime" placeholder="${this.t('time', 'Time')} (${this.t('optional', 'optional')})" />
              </div>
              <div class="form-row">
                <textarea class="form-textarea" id="editEventDescription" placeholder="📄 ${this.t('description', 'Description')} (${this.t('optional', 'optional')})..."></textarea>
              </div>
              <div class="form-actions">
                <button class="form-button secondary" onclick="this.getRootNode().host.cancelEdit()">❌ ${this.t('cancel', 'Cancel')}</button>
                <button class="form-button primary" onclick="this.getRootNode().host.saveEdit()">💾 ${this.t('save', 'Save')}</button>
              </div>
            </div>
          </div>
        `;
      }

      getCardSize() {
        return 6;
      }
    }

    if (!customElements.get('calendifier-events-card')) {
      customElements.define('calendifier-events-card', CalendifierEventsCard);
    }

    // Register the card
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'calendifier-events-card',
      name: '📋 Calendifier Events',
      description: 'Today\'s and upcoming events with management capabilities'
    });

  }

  // Start initialization
  initEventsCard();
})();