/**
 * Calendifier Events Card - Enhanced with RRule Support
 * Displays today's and upcoming events with recurring event management capabilities
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
        this.cardType = 'events-card'; // Set card type for registry
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
        
        // Wait for event service to be ready
        await this.initEventService();
        
        // Register this card and set up event subscriptions
        this.registerCard();
        this.setupEventSubscriptions();
        
        // Load events after translation system is ready
        await this.loadEvents();
        
        // Publish that this card is ready
        this.publish(this.eventService.EventTypes.CARD_READY, {
          cardType: this.cardType,
          capabilities: ['editEvent', 'createEvent', 'deleteEvent', 'loadEvents']
        });
        
        // Listen for locale changes (legacy support)
        document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
      }

      /**
       * Set up event subscriptions for this card
       */
      setupEventSubscriptions() {
        if (!this.eventService) return;
        
        // Subscribe to edit requests from other cards
        this.subscribe('edit-event-request', this.handleEditEventRequest.bind(this));
        
        // Subscribe to event data changes
        this.subscribe(this.eventService.EventTypes.EVENT_CREATED, this.handleEventUpdate.bind(this));
        this.subscribe(this.eventService.EventTypes.EVENT_UPDATED, this.handleEventUpdate.bind(this));
        this.subscribe(this.eventService.EventTypes.EVENT_DELETED, this.handleEventUpdate.bind(this));
        
        // Subscribe to locale changes
        this.subscribe(this.eventService.EventTypes.LOCALE_CHANGED, this.handleLocaleChange.bind(this));
        
        console.log(`[${this.constructor.name}] Event subscriptions set up`);
      }

      /**
       * Handle edit event requests from other cards
       */
      async handleEditEventRequest(event) {
        const { requestId, data } = event.data;
        
        try {
          console.log(`[EventsCard] Received edit request for event ID: ${data.eventId}`);
          
          // Ensure events are loaded
          await this.loadEvents();
          
          // Find the event
          const targetEvent = this.events.find(e => e.id == data.eventId);
          if (!targetEvent) {
            throw new Error(`Event ${data.eventId} not found`);
          }
          
          // Edit the event
          this.editEvent(data.eventId);
          
          // Scroll into view
          this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          // Send success response
          this.publish(`edit-event-response-${requestId}`, {
            success: true,
            result: { eventId: data.eventId, action: 'edit-started' }
          });
          
        } catch (error) {
          console.error(`[EventsCard] Edit request failed:`, error);
          
          // Send error response
          this.publish(`edit-event-response-${requestId}`, {
            success: false,
            error: error.message
          });
        }
      }

      async loadEvents() {
        try {
          this.loading = true;
          this.render();
          
          // Load only master events (not expanded occurrences) for the events card
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/events`);
          if (response.ok) {
            const data = await response.json();
            this.events = data.events || [];
            console.log(`[EventsCard] Loaded ${this.events.length} master events`);
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
        console.log(`[EventsCard] Handling event update:`, event);
        
        // Handle both new event service format and legacy format
        const eventData = event.data || event.detail || {};
        
        if (eventData.source === 'calendar-card' && eventData.eventId) {
          // Event was deleted from calendar card - remove from events list
          this.events = this.events.filter(e => e.id !== eventData.eventId);
        }
        
        // Always reload events to ensure consistency
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
            
            // Remove from local events array immediately
            const deletedEvent = this.events.find(e => e.id === eventId);
            this.events = this.events.filter(e => e.id !== eventId);
            
            // Reload events to ensure consistency
            await this.loadEvents();
            
            // Publish event deletion via event service
            this.publish(this.eventService.EventTypes.EVENT_DELETED, {
              eventId: eventId,
              event: deletedEvent,
              source: this.cardType
            });
            
            // Legacy notification for backward compatibility
            document.dispatchEvent(new CustomEvent('calendifier-event-deleted', {
              detail: {
                eventId: eventId,
                event: deletedEvent,
                source: 'events-card'
              }
            }));
          } else {
            const errorText = await response.text();
            console.error(`[EventsCard] Delete failed: ${response.status} - ${errorText}`);
            
            if (response.status === 404) {
              this.showNotification(this.t('event_not_found', 'Event not found - it may have already been deleted'), 'warning');
              // Remove from local array anyway and refresh
              this.events = this.events.filter(e => e.id !== eventId);
              await this.loadEvents();
            } else {
              this.showNotification(this.t('error', 'Failed to delete event'), 'error');
            }
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
            
            // Publish event update via event service
            this.publish(this.eventService.EventTypes.EVENT_UPDATED, {
              eventId: eventId,
              event: eventData,
              source: this.cardType
            });
            
            // Legacy notification for backward compatibility
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
        console.log(`[EventsCard] editEvent called with ID: ${eventId} (type: ${typeof eventId})`);
        console.log(`[EventsCard] Available events:`, this.events.map(e => ({ id: e.id, title: e.title, type: typeof e.id })));
        
        const event = this.events.find(e => e.id == eventId); // Use == to handle string/number comparison
        if (!event) {
          console.warn(`[EventsCard] Event with ID ${eventId} not found in local events array`);
          console.warn(`[EventsCard] Available IDs:`, this.events.map(e => e.id));
          this.showNotification('Event not found. Please refresh and try again.', 'error');
          return;
        }
        
        console.log(`[EventsCard] Found event for editing:`, event);
        
        // Hide quick add form if open
        const quickAddForm = this.shadowRoot.querySelector('#quickAddEventForm');
        if (quickAddForm && quickAddForm.classList.contains('show')) {
          quickAddForm.classList.remove('show');
          console.log(`[EventsCard] Hidden quick add form`);
        }
        
        // Show edit form
        const editForm = this.shadowRoot.querySelector('#editEventForm');
        if (!editForm) {
          console.error(`[EventsCard] Edit form not found in shadow DOM`);
          this.showNotification('Edit form not available. Please refresh the page.', 'error');
          return;
        }
        
        editForm.classList.add('show');
        console.log(`[EventsCard] Edit form shown successfully`);
        
        if (editForm) {
          
          // Populate form with event data
          const formElements = {
            '#editEventId': event.id,
            '#editEventTitle': event.title || '',
            '#editEventCategory': event.category || 'general',
            '#editEventDate': event.start_date || '',
            '#editEventTime': event.start_time || '',
            '#editEventDescription': event.description || ''
          };
          
          Object.entries(formElements).forEach(([selector, value]) => {
            const element = this.shadowRoot.querySelector(selector);
            if (element) {
              element.value = value;
            } else {
              console.warn(`[EventsCard] editEvent: Element ${selector} not found`);
            }
          });
          
          // Handle recurring event data
          const makeRecurringCheckbox = this.shadowRoot.querySelector('#editMakeRecurring');
          const rruleBuilderContainer = this.shadowRoot.querySelector('#editRruleBuilder');
          const rruleBuilderComponent = this.shadowRoot.querySelector('#editRruleBuilderComponent');
          
          if (event.rrule && event.rrule.trim() !== '') {
            if (makeRecurringCheckbox) makeRecurringCheckbox.checked = true;
            if (rruleBuilderContainer) rruleBuilderContainer.style.display = 'block';
            
            // Set RRule in the component with proper timing
            if (rruleBuilderComponent) {
              // Use a timeout to ensure the component is fully initialized
              setTimeout(() => {
                console.log('[EventsCard] Loading RRULE for edit:', event.rrule);
                
                // Set attributes first
                rruleBuilderComponent.setAttribute('rrule', event.rrule);
                rruleBuilderComponent.setAttribute('start-date', event.start_date);
                
                // Then use the setRRule method if available
                if (typeof rruleBuilderComponent.setRRule === 'function') {
                  rruleBuilderComponent.setRRule(event.rrule, event.start_date);
                } else {
                  // Fallback: trigger loadRRule directly if available
                  if (typeof rruleBuilderComponent.loadRRule === 'function') {
                    rruleBuilderComponent.rrule = event.rrule;
                    rruleBuilderComponent.loadRRule();
                  }
                }
                
                console.log('[EventsCard] RRULE loaded for edit');
              }, 100);
            }
          } else {
            if (makeRecurringCheckbox) makeRecurringCheckbox.checked = false;
            if (rruleBuilderContainer) rruleBuilderContainer.style.display = 'none';
          }
        }
      }

      async saveEdit() {
        const eventIdEl = this.shadowRoot.querySelector('#editEventId');
        const titleEl = this.shadowRoot.querySelector('#editEventTitle');
        const categoryEl = this.shadowRoot.querySelector('#editEventCategory');
        const dateEl = this.shadowRoot.querySelector('#editEventDate');
        const timeEl = this.shadowRoot.querySelector('#editEventTime');
        const descriptionEl = this.shadowRoot.querySelector('#editEventDescription');
        const makeRecurringEl = this.shadowRoot.querySelector('#editMakeRecurring');
        
        if (!eventIdEl || !titleEl || !categoryEl || !dateEl || !timeEl || !descriptionEl || !makeRecurringEl) {
          console.warn('[EventsCard] saveEdit: Missing form elements');
          return;
        }
        
        const eventId = eventIdEl.value;
        const title = titleEl.value.trim();
        const category = categoryEl.value;
        const date = dateEl.value;
        const time = timeEl.value;
        const description = descriptionEl.value.trim();
        const makeRecurring = makeRecurringEl.checked;

        if (!title) {
          this.showNotification(this.t('validation_title_required', 'Event title is required'), 'error');
          return;
        }
        
        if (!date) {
          this.showNotification(this.t('validation_date_required', 'Event date is required'), 'error');
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
          const rruleBuilder = this.shadowRoot.querySelector('#editRruleBuilderComponent');
          if (rruleBuilder && typeof rruleBuilder.getRRule === 'function') {
            eventData.rrule = rruleBuilder.getRRule() || '';
          } else {
            console.warn('[EventsCard] Edit RRule builder not found or getRRule method missing');
            eventData.rrule = '';
          }
        }

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
        const elements = [
          '#editEventId', '#editEventTitle', '#editEventCategory',
          '#editEventDate', '#editEventTime', '#editEventDescription'
        ];
        
        elements.forEach(selector => {
          const element = this.shadowRoot.querySelector(selector);
          if (element) {
            element.value = selector === '#editEventCategory' ? 'general' : '';
          }
        });
        
        const makeRecurringCheckbox = this.shadowRoot.querySelector('#editMakeRecurring');
        if (makeRecurringCheckbox) makeRecurringCheckbox.checked = false;
        
        const rruleBuilder = this.shadowRoot.querySelector('#editRruleBuilder');
        if (rruleBuilder) rruleBuilder.style.display = 'none';
      }

      toggleQuickAdd() {
        const form = this.shadowRoot.querySelector('#quickAddEventForm');
        if (!form) {
          console.warn('[EventsCard] toggleQuickAdd: Form element not found');
          return;
        }
        
        const isVisible = form.classList.contains('show');
        
        if (isVisible) {
          form.classList.remove('show');
          this.clearQuickAddForm();
        } else {
          form.classList.add('show');
        }
      }

      toggleRecurring(formType = 'quick') {
        const prefix = formType === 'edit' ? 'edit' : '';
        const checkboxId = formType === 'edit' ? 'editMakeRecurring' : 'makeRecurring';
        const builderId = formType === 'edit' ? 'editRruleBuilder' : 'rruleBuilder';
        
        const checkbox = this.shadowRoot.querySelector(`#${checkboxId}`);
        const rruleBuilder = this.shadowRoot.querySelector(`#${builderId}`);
        
        if (!checkbox || !rruleBuilder) {
          console.warn('[EventsCard] toggleRecurring: Missing elements', {
            formType,
            checkboxId,
            builderId,
            checkbox: !!checkbox,
            rruleBuilder: !!rruleBuilder
          });
          return;
        }
        
        if (checkbox.checked) {
          rruleBuilder.style.display = 'block';
          // Set default start date
          const dateInput = this.shadowRoot.querySelector(`#${prefix === 'edit' ? 'editEventDate' : 'eventDate'}`);
          if (dateInput && dateInput.value) {
            rruleBuilder.setAttribute('start-date', dateInput.value);
          }
        } else {
          rruleBuilder.style.display = 'none';
        }
      }

      async saveQuickAdd() {
        const titleEl = this.shadowRoot.querySelector('#eventTitle');
        const categoryEl = this.shadowRoot.querySelector('#eventCategory');
        const dateEl = this.shadowRoot.querySelector('#eventDate');
        const timeEl = this.shadowRoot.querySelector('#eventTime');
        const descriptionEl = this.shadowRoot.querySelector('#eventDescription');
        const makeRecurringEl = this.shadowRoot.querySelector('#makeRecurring');
        
        if (!titleEl || !categoryEl || !dateEl || !timeEl || !descriptionEl || !makeRecurringEl) {
          console.warn('[EventsCard] saveQuickAdd: Missing form elements');
          return;
        }
        
        const title = titleEl.value.trim();
        const category = categoryEl.value;
        const date = dateEl.value;
        const time = timeEl.value;
        const description = descriptionEl.value.trim();
        const makeRecurring = makeRecurringEl.checked;

        if (!title) {
          this.showNotification(this.t('validation_title_required', 'Event title is required'), 'error');
          return;
        }
        
        if (!date) {
          this.showNotification(this.t('validation_date_required', 'Event date is required'), 'error');
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
          const rruleBuilder = this.shadowRoot.querySelector('#rruleBuilderComponent');
          if (rruleBuilder && typeof rruleBuilder.getRRule === 'function') {
            eventData.rrule = rruleBuilder.getRRule() || '';
          } else {
            console.warn('[EventsCard] RRule builder not found or getRRule method missing');
            eventData.rrule = '';
          }
        }

        const success = await this.createEvent(eventData);
        if (success) {
          this.toggleQuickAdd();
        }
      }

      cancelQuickAdd() {
        this.toggleQuickAdd();
      }

      clearQuickAddForm() {
        const elements = [
          '#eventTitle', '#eventCategory', '#eventDate',
          '#eventTime', '#eventDescription'
        ];
        
        elements.forEach(selector => {
          const element = this.shadowRoot.querySelector(selector);
          if (element) {
            element.value = selector === '#eventCategory' ? 'general' : '';
          }
        });
        
        const makeRecurringCheckbox = this.shadowRoot.querySelector('#makeRecurring');
        if (makeRecurringCheckbox) makeRecurringCheckbox.checked = false;
        
        const rruleBuilder = this.shadowRoot.querySelector('#rruleBuilder');
        if (rruleBuilder) rruleBuilder.style.display = 'none';
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
          console.error('[EventsCard] Date formatting error:', error);
          return dateStr;
        }
      }

      getDateInputFormat(dateStr) {
        // Always return YYYY-MM-DD for HTML date inputs regardless of locale
        if (!dateStr) return '';
        
        try {
          // If the dateStr is already in YYYY-MM-DD format, return as-is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
          }
          
          // Parse the date carefully to avoid timezone issues
          // Use UTC to prevent timezone conversion problems
          const date = new Date(dateStr + 'T00:00:00Z'); // Force UTC to avoid timezone issues
          if (isNaN(date.getTime())) {
            console.warn('[EventsCard] Invalid date string:', dateStr);
            return dateStr;
          }
          
          // Format as YYYY-MM-DD using UTC methods to avoid timezone shifts
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('[EventsCard] Date input formatting error:', error);
          return dateStr;
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

      render() {
        if (this.loading) {
          this.shadowRoot.innerHTML = `
            <style>${this.getCommonStyles()}</style>
            ${this.renderLoadingState(this.t('loading', 'Loading events...'))}
          `;
          return;
        }

        // Use local date to avoid timezone issues
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayEvents = this.events.filter(e => e.start_date === todayStr);
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
              position: relative;
            }
            
            .event-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .event-item.recurring {
              border-left-color: #ff6b35;
              background: linear-gradient(135deg, var(--secondary-background-color) 0%, rgba(255, 107, 53, 0.1) 100%);
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
            
            .recurring-indicator {
              color: #ff6b35;
              font-size: 0.8em;
              margin-top: 4px;
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
              background: var(--card-background-color);
              border: 1px solid var(--divider-color);
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              position: relative;
              z-index: 100;
            }
            
            .quick-add-form.show {
              display: block;
            }
            
            .form-row {
              display: flex;
              gap: 8px;
              margin-bottom: 8px;
              align-items: stretch;
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
              box-sizing: border-box;
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
            
            .form-content {
              display: flex;
              gap: 16px;
              align-items: flex-start;
            }
            
            .form-left-column {
              flex: 1;
              min-width: 300px;
            }
            
            .form-right-column {
              flex: 0 0 200px;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
            .form-right-column .form-textarea {
              height: 100px;
              resize: vertical;
            }
            
            .form-right-column .form-actions {
              margin-top: auto;
              justify-content: center;
            }
            
            .action-buttons {
              display: flex;
              gap: 8px;
              width: 100%;
            }
            
            .action-buttons .form-button {
              flex: 1;
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
      }

      renderTodayEvents() {
        // Use local date to avoid timezone issues
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayEvents = this.events.filter(e => e.start_date === todayStr);

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
        // Use local date to avoid timezone issues
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const upcomingEvents = this.events.filter(e => e.start_date > todayStr).slice(0, this.maxEvents);
        
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
        const isRecurring = event.rrule && event.rrule.trim() !== '';
        const recurringClass = isRecurring ? 'recurring' : '';

        return `
          <div class="event-item ${recurringClass}" style="position: relative;">
            <div class="event-actions">
              <button class="event-action" onclick="event.stopPropagation(); this.getRootNode().host.editEvent(${event.id || 0})" title="Edit Event">✏️</button>
              <button class="event-action" onclick="event.stopPropagation(); this.getRootNode().host.deleteEvent(${event.id || 0})" title="Delete Event">🗑️</button>
            </div>
            <div class="event-title">${categoryEmoji} ${event.title}</div>
            <div class="event-time">${timeDisplay}</div>
            ${isRecurring ? `<div class="recurring-indicator">🔄 ${this.t('recurring_event', 'Recurring Event')}</div>` : ''}
            ${event.description ? `<div style="color: var(--secondary-text-color); font-size: 0.9em; margin-top: 4px;">📄 ${event.description}</div>` : ''}
            ${event.category ? `<div style="color: var(--primary-color); font-size: 0.8em; margin-top: 4px;">${this.t(`category_${event.category}`, event.category.charAt(0).toUpperCase() + event.category.slice(1))}</div>` : ''}
          </div>
        `;
      }

      renderAddEventSection() {
        // Use local date to avoid timezone issues
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        return `
          <div class="add-event-section">
            <button class="add-event-button" onclick="this.getRootNode().host.toggleQuickAdd()">
              ➕ ${this.t('add', 'Add')} ${this.t('event', 'Event')}
            </button>
            
            <div class="quick-add-form" id="quickAddEventForm">
              <div class="form-content">
                <div class="form-left-column">
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
                    <input type="date" class="form-input" id="eventDate" value="${todayStr}" />
                  </div>
                  <div class="form-row">
                    <input type="time" class="form-input" id="eventTime" placeholder="${this.t('time', 'Time')} (${this.t('optional', 'optional')})" />
                  </div>
                  <div class="form-checkbox">
                    <input type="checkbox" id="makeRecurring" onchange="this.getRootNode().host.toggleRecurring('quick')" />
                    <label for="makeRecurring">🔄 ${this.t('make_recurring', 'Make Recurring')}</label>
                  </div>
                  <div class="rrule-section" id="rruleBuilder">
                    <rrule-builder id="rruleBuilderComponent" locale="${this.currentLocale || 'en_US'}"></rrule-builder>
                  </div>
                </div>
                
                <div class="form-right-column">
                  <div style="font-weight: bold; color: var(--primary-color); margin-bottom: 8px;">📄 ${this.t('description', 'Description')}</div>
                  <textarea class="form-textarea" id="eventDescription" placeholder="${this.t('description', 'Description')} (${this.t('optional', 'optional')})..."></textarea>
                  
                  <div class="form-actions">
                    <div class="action-buttons">
                      <button class="form-button secondary" onclick="this.getRootNode().host.cancelQuickAdd()">❌ ${this.t('cancel', 'Cancel')}</button>
                      <button class="form-button primary" onclick="this.getRootNode().host.saveQuickAdd()">💾 ${this.t('save', 'Save')}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="quick-add-form" id="editEventForm" style="margin-top: 20px;">
              <div style="font-weight: bold; margin-bottom: 16px; color: var(--primary-color); font-size: 1.1em; border-bottom: 1px solid var(--divider-color); padding-bottom: 8px;">✏️ ${this.t('edit', 'Edit')} ${this.t('event', 'Event')}</div>
              <div class="form-content">
                <div class="form-left-column">
                  <input type="hidden" id="editEventId" />
                  <div class="form-row">
                    <input type="text" class="form-input" id="editEventTitle" placeholder="📅 ${this.t('title', 'Title')}..." />
                  </div>
                  <div class="form-row">
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
                  </div>
                  <div class="form-row">
                    <input type="time" class="form-input" id="editEventTime" placeholder="${this.t('time', 'Time')} (${this.t('optional', 'optional')})" />
                  </div>
                  <div class="form-checkbox">
                    <input type="checkbox" id="editMakeRecurring" onchange="this.getRootNode().host.toggleRecurring('edit')" />
                    <label for="editMakeRecurring">🔄 ${this.t('make_recurring', 'Make Recurring')}</label>
                  </div>
                  <div class="rrule-section" id="editRruleBuilder">
                    <rrule-builder id="editRruleBuilderComponent" locale="${this.currentLocale || 'en_US'}"></rrule-builder>
                  </div>
                </div>
                
                <div class="form-right-column">
                  <div style="font-weight: bold; color: var(--primary-color); margin-bottom: 8px;">📄 ${this.t('description', 'Description')}</div>
                  <textarea class="form-textarea" id="editEventDescription" placeholder="${this.t('description', 'Description')} (${this.t('optional', 'optional')})..."></textarea>
                  
                  <div class="form-actions">
                    <div class="action-buttons">
                      <button class="form-button secondary" onclick="this.getRootNode().host.cancelEdit()">❌ ${this.t('cancel', 'Cancel')}</button>
                      <button class="form-button primary" onclick="this.getRootNode().host.saveEdit()">💾 ${this.t('save', 'Save')}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      /**
       * Override base class locale change to avoid full re-render
       * This prevents dialogs from closing when language changes
       */
      async handleLocaleChange(event) {
        const newLocale = event.detail.locale;
        
        // Prevent infinite loops by checking if locale actually changed
        if (this.currentLocale === newLocale) {
          console.log(`[EventsCard] Locale change ignored - already ${newLocale}`);
          return;
        }
        
        // Prevent multiple simultaneous locale changes
        if (this._localeChangeInProgress) {
          console.log(`[EventsCard] Locale change already in progress, ignoring`);
          return;
        }
        
        this._localeChangeInProgress = true;
        
        try {
          console.log(`[EventsCard] Locale changing from ${this.currentLocale} to ${newLocale}`);
          this.currentLocale = newLocale;
          
          // Reload translations for new locale
          if (this.translationManager) {
            try {
              await this.translationManager.setLocale(newLocale);
            } catch (error) {
              console.error(`[EventsCard] Failed to update translation manager:`, error);
            }
          }
          
          // Update text content without full re-render to preserve dialogs
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
        
        // Update card header
        const cardHeader = shadow.querySelector('.card-header span');
        if (cardHeader) {
          const eventCount = this.events.length;
          cardHeader.textContent = `📋 ${this.t('events', 'Events')} (${this.convertNumbers(eventCount)})`;
        }
        
        // Update refresh button
        const refreshButton = shadow.querySelector('.action-button');
        if (refreshButton) {
          refreshButton.innerHTML = `🔄 ${this.t('save', 'Refresh')}`;
        }
        
        // Update section headers
        const sectionHeaders = shadow.querySelectorAll('.section-header span');
        sectionHeaders.forEach(header => {
          const text = header.textContent;
          if (text.includes('Today') || text.includes('🔵')) {
            const todayEvents = this.events.filter(e => {
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              return e.start_date === todayStr;
            });
            header.textContent = `🔵 ${this.t('today', 'Today')} (${this.convertNumbers(todayEvents.length)})`;
          } else if (text.includes('Next') || text.includes('🟡')) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const upcomingEvents = this.events.filter(e => e.start_date > todayStr).slice(0, this.maxEvents);
            header.textContent = `🟡 ${this.t('next', 'Next')} (${this.convertNumbers(upcomingEvents.length)})`;
          }
        });
        
        // Update "no events" messages
        const noEventsMessages = shadow.querySelectorAll('.no-events div:last-child');
        noEventsMessages.forEach(msg => {
          if (msg.textContent.includes('today') || msg.textContent.includes('scheduled')) {
            msg.textContent = this.t('no_events_for_this_date', 'No events scheduled for today');
          } else if (msg.textContent.includes('date')) {
            msg.textContent = this.t('no_events_for_this_date', 'No events for this date');
          }
        });
        
        // Update add event button
        const addEventButton = shadow.querySelector('.add-event-button');
        if (addEventButton) {
          addEventButton.innerHTML = `➕ ${this.t('add', 'Add')} ${this.t('event', 'Event')}`;
        }
        
        // Update form labels and placeholders in quick add form
        const quickAddForm = shadow.querySelector('#quickAddEventForm');
        if (quickAddForm) {
          this.updateFormTranslations(quickAddForm, 'quick');
        }
        
        // Update form labels and placeholders in edit form
        const editForm = shadow.querySelector('#editEventForm');
        if (editForm) {
          this.updateFormTranslations(editForm, 'edit');
        }
        
        // Update recurring event indicators
        const recurringIndicators = shadow.querySelectorAll('.recurring-indicator');
        recurringIndicators.forEach(indicator => {
          indicator.innerHTML = `🔄 ${this.t('recurring_event', 'Recurring Event')}`;
        });
        
        // Update RRuleBuilder components locale
        const rruleBuilders = shadow.querySelectorAll('rrule-builder');
        rruleBuilders.forEach(builder => {
          builder.setAttribute('locale', this.currentLocale || 'en_US');
        });
      }
      
      /**
       * Update form translations for a specific form
       */
      updateFormTranslations(form, formType) {
        if (!form) return;
        
        // Update form header for edit form
        if (formType === 'edit') {
          const header = form.querySelector('div[style*="font-weight: bold"]');
          if (header) {
            header.innerHTML = `✏️ ${this.t('edit', 'Edit')} ${this.t('event', 'Event')}`;
          }
        }
        
        // Update input placeholders
        const titleInput = form.querySelector(`#${formType === 'edit' ? 'edit' : ''}eventTitle`);
        if (titleInput) {
          titleInput.placeholder = `📅 ${this.t('title', 'Title')}...`;
        }
        
        const timeInput = form.querySelector(`#${formType === 'edit' ? 'edit' : ''}eventTime`);
        if (timeInput) {
          timeInput.placeholder = `${this.t('time', 'Time')} (${this.t('optional', 'optional')})`;
        }
        
        const descInput = form.querySelector(`#${formType === 'edit' ? 'edit' : ''}eventDescription`);
        if (descInput) {
          descInput.placeholder = `${this.t('description', 'Description')} (${this.t('optional', 'optional')})...`;
        }
        
        // Update category options
        const categorySelect = form.querySelector(`#${formType === 'edit' ? 'edit' : ''}eventCategory`);
        if (categorySelect) {
          const options = categorySelect.querySelectorAll('option');
          if (options.length >= 11) {
            options[0].textContent = `📅 ${this.t('general', 'General')}`;
            options[1].textContent = `💼 ${this.t('category_work', 'Work')}`;
            options[2].textContent = `👤 ${this.t('category_personal', 'Personal')}`;
            options[3].textContent = `🤝 ${this.t('category_meeting', 'Meeting')}`;
            options[4].textContent = `🍽️ ${this.t('category_meal', 'Meal')}`;
            options[5].textContent = `✈️ ${this.t('category_travel', 'Travel')}`;
            options[6].textContent = `🏥 ${this.t('category_health', 'Health')}`;
            options[7].textContent = `📚 ${this.t('category_education', 'Education')}`;
            options[8].textContent = `🎉 ${this.t('category_celebration', 'Celebration')}`;
            options[9].textContent = `🔔 ${this.t('category_reminder', 'Reminder')}`;
            options[10].textContent = `🎊 ${this.t('category_holiday', 'Holiday')}`;
          }
        }
        
        // Update recurring checkbox label
        const recurringLabel = form.querySelector(`label[for="${formType === 'edit' ? 'edit' : ''}makeRecurring"]`);
        if (recurringLabel) {
          recurringLabel.innerHTML = `🔄 ${this.t('make_recurring', 'Make Recurring')}`;
        }
        
        // Update description header
        const descHeader = form.querySelector('.form-right-column div[style*="font-weight: bold"]');
        if (descHeader) {
          descHeader.innerHTML = `📄 ${this.t('description', 'Description')}`;
        }
        
        // Update action buttons
        const cancelButton = form.querySelector('.form-button.secondary');
        if (cancelButton) {
          cancelButton.innerHTML = `❌ ${this.t('cancel', 'Cancel')}`;
        }
        
        const saveButton = form.querySelector('.form-button.primary');
        if (saveButton) {
          saveButton.innerHTML = `💾 ${this.t('save', 'Save')}`;
        }
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
      description: 'Today\'s and upcoming events with recurring event management capabilities'
    });

  }

  // Start initialization
  initEventsCard();
})();