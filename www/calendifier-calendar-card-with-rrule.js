/**
 * Calendifier Calendar Card - Enhanced with RRule Support
 * Displays a full calendar view with recurring event integration
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
        this.cardType = 'calendar-card'; // Set card type for registry
        this.currentDate = new Date();
        this.events = [];
        this.holidays = [];
        this.selectedDate = null;
        this.loading = true;
      }

      async setConfig(config) {
        try {
          super.setConfig(config);
          
          // Wait for event service to be ready
          await this.initEventService();
          
          // Register this card and set up event subscriptions
          this.registerCard();
          this.setupEventSubscriptions();
          
          // Load initial data
          await this.loadInitialData();
          
          // Publish that this card is ready
          this.publish(this.eventService.EventTypes.CARD_READY, {
            cardType: this.cardType,
            capabilities: ['displayEvents', 'createEvent', 'requestEventEdit']
          });
          
          // Listen for locale changes (legacy support)
          document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
          
          // Listen for settings changes (legacy support)
          document.addEventListener('calendifier-settings-changed', this.handleSettingsChange.bind(this));
          
          this.render();
        } catch (error) {
          console.error('[CalendarCard] Error in setConfig():', error);
          throw error;
        }
      }

      /**
       * Set up event subscriptions for this card
       */
      setupEventSubscriptions() {
        if (!this.eventService) return;
        
        // Subscribe to event data changes
        this.subscribe(this.eventService.EventTypes.EVENT_CREATED, this.handleEventUpdate.bind(this));
        this.subscribe(this.eventService.EventTypes.EVENT_UPDATED, this.handleEventUpdate.bind(this));
        this.subscribe(this.eventService.EventTypes.EVENT_DELETED, this.handleEventUpdate.bind(this));
        
        // Subscribe to locale changes
        this.subscribe(this.eventService.EventTypes.LOCALE_CHANGED, this.handleLocaleChange.bind(this));
        this.subscribe(this.eventService.EventTypes.SETTINGS_CHANGED, this.handleSettingsChange.bind(this));
        
        console.log(`[${this.constructor.name}] Event subscriptions set up`);
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
          // Get expanded date range to cover previous and next months for recurring events
          const year = this.currentDate.getFullYear();
          const month = this.currentDate.getMonth();
          
          // Load 3 months before and 3 months after current month to ensure recurring events show properly
          // Use UTC to avoid timezone issues
          const startDate = new Date(Date.UTC(year, month - 3, 1)).toISOString().split('T')[0];
          const endDate = new Date(Date.UTC(year, month + 4, 0)).toISOString().split('T')[0];
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events/expanded?start_date=${startDate}&end_date=${endDate}`);
          if (response.ok) {
            const data = await response.json();
            this.events = data.events || [];
            console.log(`[CalendarCard] Loaded ${this.events.length} expanded events for range ${startDate} to ${endDate}`);
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
        console.log(`[CalendarCard] Handling event update:`, event);
        
        // Handle both new event service format and legacy format
        const eventData = event.data || event.detail || {};
        
        if (eventData.source === 'events-card' && eventData.eventId) {
          // Event was deleted from events card - remove from calendar
          this.events = this.events.filter(e => e.id !== eventData.eventId);
        }
        
        // Always reload events to ensure consistency
        await this.loadEvents();
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
            
            // Publish event creation via event service
            this.publish(this.eventService.EventTypes.EVENT_CREATED, {
              event: eventData,
              source: this.cardType
            });
            
            // Legacy notification for backward compatibility
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
        const selectedDate = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
        
        this.showQuickAddDialog(selectedDate);
      }

      handleEventClick(event, eventElement) {
        if (!event || !eventElement) return;
        
        // Prevent event bubbling
        if (eventElement.stopPropagation) {
          eventElement.stopPropagation();
        }
        
        // Instead of opening calendar's edit dialog, delegate to events card
        this.delegateToEventsCard(event);
      }
      
      async delegateToEventsCard(event) {
        console.log('[CalendarCard] delegateToEventsCard called with event:', event);
        
        try {
          // For expanded/child events, we need to find the master event
          let masterEventId = event.id;
          
          // If this is an expanded event (has parent_id), use the parent_id as the master
          if (event.parent_id) {
            masterEventId = event.parent_id;
            console.log(`[CalendarCard] Child event clicked, using master event ID: ${masterEventId}`);
          }
          
          console.log(`[CalendarCard] Requesting edit for event ID: ${masterEventId}`);
          
          // Use the event service to request the events card to edit this event
          await this.requestCardAction('events-card', 'edit-event', {
            eventId: masterEventId,
            sourceEvent: event
          });
          
          console.log(`[CalendarCard] Edit request completed successfully`);
          
        } catch (error) {
          console.error('[CalendarCard] Error in delegateToEventsCard:', error);
          this.showNotification(error.message || 'Error opening event for editing. Please try again.', 'error');
        }
      }

      // Removed showEditDialog, hideEditDialog, toggleEditRecurring, saveEditEvent, updateEvent, deleteEditEvent
      // These are no longer needed as we delegate to the events card

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

      toggleRecurring() {
        const checkbox = this.shadowRoot.querySelector('#makeRecurring');
        const rruleBuilder = this.shadowRoot.querySelector('#rruleBuilder');
        
        if (!checkbox || !rruleBuilder) {
          console.warn('[CalendarCard] toggleRecurring: Missing elements', { checkbox: !!checkbox, rruleBuilder: !!rruleBuilder });
          return;
        }
        
        if (checkbox.checked) {
          rruleBuilder.style.display = 'block';
          // Set default start date
          const dateInput = this.shadowRoot.querySelector('#eventDate');
          if (dateInput && dateInput.value) {
            rruleBuilder.setAttribute('start-date', dateInput.value);
          }
        } else {
          rruleBuilder.style.display = 'none';
        }
      }

      async saveQuickAdd() {
        const title = this.shadowRoot.querySelector('#eventTitle').value.trim();
        const category = this.shadowRoot.querySelector('#eventCategory').value;
        const date = this.shadowRoot.querySelector('#eventDate').value;
        const time = this.shadowRoot.querySelector('#eventTime').value;
        const description = this.shadowRoot.querySelector('#eventDescription').value.trim();
        const makeRecurring = this.shadowRoot.querySelector('#makeRecurring').checked;

        // Validation with proper error messages
        if (!title) {
          this.showNotification(this.t('validation_title_required', 'Title is required'), 'error');
          return;
        }
        
        if (!date) {
          this.showNotification(this.t('validation_date_required', 'Date is required'), 'error');
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

        // Add RRule if recurring
        if (makeRecurring) {
          const rruleBuilder = this.shadowRoot.querySelector('#rruleBuilder');
          eventData.rrule = rruleBuilder.value || '';
        }

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
        this.shadowRoot.querySelector('#makeRecurring').checked = false;
        this.shadowRoot.querySelector('#rruleBuilder').style.display = 'none';
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
        const isRecurring = event.rrule && event.rrule.trim() !== '';
        
        return `<span class="event-emoji ${isRecurring ? 'recurring' : ''}" title="${title}${isRecurring ? ' (' + this.t('recurring', 'Recurring') + ')' : ''}">${emoji}</span>`;
      }

      previousMonth() {
        const oldYear = this.currentDate.getFullYear();
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        const newYear = this.currentDate.getFullYear();
        
        // Reload events to get proper recurring events for new month range
        this.loadEvents();
        
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
        
        // Reload events to get proper recurring events for new month range
        this.loadEvents();
        
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
        
        // Reload events to get proper recurring events for current month range
        this.loadEvents();
        
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
        if (!this.currentLocale) {
          return text.toString();
        }
        
        const textStr = text.toString();
        
        // Arabic-Indic numerals for Arabic locales
        if (this.currentLocale.startsWith('ar_')) {
          const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          return textStr.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
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
        
        return textStr;
      }

      formatDateForLocale(dateStr) {
        if (!dateStr) return '';
        
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          
          // Use locale-specific formatting
          const locale = this.currentLocale || 'en_GB';
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          
          // US, Canada (English), and Philippines use MM/DD/YYYY
          if (locale.startsWith('en_US') || locale.startsWith('en_CA') || locale.startsWith('en_PH')) {
            return `${month}/${day}/${year}`;
          }
          
          // Most European, UK, and Commonwealth countries use DD/MM/YYYY
          if (locale.startsWith('en_GB') || locale.startsWith('en_AU') || locale.startsWith('en_NZ') ||
              locale.startsWith('en_ZA') || locale.startsWith('en_IE') || locale.startsWith('en_IN') ||
              locale.startsWith('fr_') || locale.startsWith('de_') || locale.startsWith('es_') ||
              locale.startsWith('it_') || locale.startsWith('pt_') || locale.startsWith('nl_') ||
              locale.startsWith('da_') || locale.startsWith('sv_') || locale.startsWith('nb_') ||
              locale.startsWith('fi_') || locale.startsWith('pl_') || locale.startsWith('cs_') ||
              locale.startsWith('sk_') || locale.startsWith('hu_') || locale.startsWith('ro_') ||
              locale.startsWith('bg_') || locale.startsWith('hr_') || locale.startsWith('sl_') ||
              locale.startsWith('et_') || locale.startsWith('lv_') || locale.startsWith('lt_') ||
              locale.startsWith('el_') || locale.startsWith('tr_') || locale.startsWith('ru_') ||
              locale.startsWith('uk_') || locale.startsWith('ca_') || locale.startsWith('eu_') ||
              locale.startsWith('gl_') || locale.startsWith('id_') || locale.startsWith('ms_') ||
              locale.startsWith('vi_') || locale.startsWith('th_') || locale.startsWith('hi_')) {
            return `${day}/${month}/${year}`;
          }
          
          // East Asian countries typically use YYYY/MM/DD or YYYY-MM-DD
          if (locale.startsWith('ja_') || locale.startsWith('ko_') ||
              locale.startsWith('zh_') || locale.startsWith('zh-')) {
            return `${year}/${month}/${day}`;
          }
          
          // Arabic countries use DD/MM/YYYY but with Arabic numerals
          if (locale.startsWith('ar_') || locale.startsWith('he_') || locale.startsWith('fa_')) {
            const formattedDate = `${day}/${month}/${year}`;
            // Convert to Arabic-Indic numerals for Arabic locales
            if (locale.startsWith('ar_')) {
              const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
              return formattedDate.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
            }
            return formattedDate;
          }
          
          // Default to DD/MM/YYYY for most other locales
          return `${day}/${month}/${year}`;
        } catch (error) {
          console.error('[CalendarCard] Date formatting error:', error);
          return dateStr;
        }
      }

      getDateInputFormat(dateStr) {
        // Always return YYYY-MM-DD for HTML date inputs regardless of locale
        if (!dateStr) return '';
        
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('[CalendarCard] Date input formatting error:', error);
          return dateStr;
        }
      }

      handleLocaleChange(event) {
        super.handleLocaleChange(event);
        // Reload holidays when locale changes (different country holidays)
        this.loadHolidays().then(() => {
          this.render();
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
            
            .event-emoji.clickable {
              cursor: pointer;
            }
            
            .event-emoji.clickable:hover {
              opacity: 1;
              transform: scale(1.2);
              filter: brightness(1.2);
            }
            
            .event-emoji.recurring {
              position: relative;
            }
            
            .event-emoji.recurring::after {
              content: '🔄';
              position: absolute;
              top: -2px;
              right: -2px;
              font-size: 8px;
              opacity: 0.7;
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
              max-width: 900px;
              width: 95%;
              max-height: 85vh;
              overflow-y: auto;
              display: flex;
              gap: 24px;
            }
            
            .dialog-left-column {
              flex: 1;
              min-width: 400px;
            }
            
            .dialog-right-column {
              flex: 0 0 280px;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            
            .dialog-right-column .form-textarea {
              height: 120px;
              resize: vertical;
            }
            
            .dialog-right-column .form-actions {
              margin-top: auto;
              justify-content: center;
              flex-direction: column;
              gap: 8px;
            }
            
            .dialog-right-column .delete-button {
              background: #dc3545;
              color: white;
              width: 100%;
              margin-bottom: 8px;
            }
            
            .dialog-right-column .action-buttons {
              display: flex;
              gap: 8px;
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
            
            .form-checkbox {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
            }
            
            .form-checkbox input[type="checkbox"] {
              width: 16px;
              height: 16px;
            }
            
            .form-checkbox label {
              color: var(--primary-text-color);
              font-size: 0.9em;
              cursor: pointer;
            }
            
            .rrule-section {
              display: none;
              margin-top: 8px;
              padding: 12px;
              background: var(--secondary-background-color);
              border-radius: 4px;
              border: 1px solid var(--divider-color);
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
            
            /* Remove separate right panels - now integrated into dialog */
            
          </style>
          
          <div class="notification"></div>
          
          <div class="card-header">
            📅 ${this.t('calendar_view', 'Calendar')}
          </div>
          
          <div class="calendar-header">
            <button class="nav-button" onclick="this.getRootNode().host.previousMonth()">◀️</button>
            <div class="month-year">
              ${this.getMonthName(month)} ${this.convertNumbers(year.toString())}
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
                // Calculate the correct date for prev/next month days using UTC to avoid timezone issues
                if (dayObj.isPrevMonth) {
                  const date = new Date(Date.UTC(year, month - 1, dayObj.day));
                  dayDate = date.toISOString().split('T')[0];
                } else {
                  const date = new Date(Date.UTC(year, month + 1, dayObj.day));
                  dayDate = date.toISOString().split('T')[0];
                }
              } else {
                const isToday = isCurrentMonth && dayObj.day === todayDate;
                if (isToday) classes.push('today');
                const date = new Date(Date.UTC(year, month, dayObj.day));
                dayDate = date.toISOString().split('T')[0];
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
                  <div class="day-number">${this.convertNumbers(dayObj.day.toString())}</div>
                  <div class="event-indicators">
                    ${dayHolidays.map(holiday => `<span class="holiday-indicator" title="${holiday.name}">🎊</span>`).join('')}
                    ${dayEvents.map(event => `<span ondblclick="this.getRootNode().host.handleEventClick(${JSON.stringify(event).replace(/"/g, '&quot;')}, event)" style="cursor: pointer;">${this.getEventEmoji(event).replace('<span class="event-emoji', '<span class="event-emoji clickable')}</span>`).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="quick-add-dialog" id="quickAddDialog">
            <div class="dialog-content">
              <div class="dialog-left-column">
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
                
                <div class="form-checkbox">
                  <input type="checkbox" id="makeRecurring" onchange="this.getRootNode().host.toggleRecurring()" />
                  <label for="makeRecurring">🔄 ${this.t('make_recurring', 'Make Recurring')}</label>
                </div>
                
                <div class="rrule-section" id="rruleBuilder">
                  <rrule-builder locale="${this.currentLocale || 'en_US'}"></rrule-builder>
                </div>
              </div>
              
              <div class="dialog-right-column">
                <div style="font-weight: bold; color: var(--primary-color);">📄 ${this.t('description', 'Description')}</div>
                <textarea class="form-textarea" id="eventDescription" placeholder="${this.t('description', 'Description')} (${this.t('optional', 'optional')})..."></textarea>
                
                <div class="form-actions">
                  <div class="action-buttons">
                    <button class="form-button secondary" onclick="this.getRootNode().host.hideQuickAddDialog()">❌ ${this.t('cancel', 'Cancel')}</button>
                    <button class="form-button primary" onclick="this.getRootNode().host.saveQuickAdd()">💾 ${this.t('save', 'Save')}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Edit dialog removed - now delegates to events card -->
        `;
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
      description: 'Full calendar view with recurring events and holidays'
    });

  }

  // Start initialization
  initCalendarCard();
})();