/**
 * Calendar functionality for Calendifier
 */

class CalendifierCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.calendarData = null;
        this.events = [];
        this.holidays = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadCalendar();
    }

    initializeElements() {
        this.calendarGrid = document.getElementById('calendar-grid');
        this.currentMonthElement = document.getElementById('current-month');
        this.prevMonthBtn = document.getElementById('prev-month');
        this.nextMonthBtn = document.getElementById('next-month');
        this.todayBtn = document.getElementById('today-btn');
        this.addEventBtn = document.getElementById('add-event-btn');
        this.selectedDateTitle = document.getElementById('selected-date-title');
        this.eventsList = document.getElementById('events-list');
    }

    bindEvents() {
        this.prevMonthBtn.addEventListener('click', () => this.previousMonth());
        this.nextMonthBtn.addEventListener('click', () => this.nextMonth());
        this.todayBtn.addEventListener('click', () => this.goToToday());
        this.addEventBtn.addEventListener('click', () => this.showAddEventDialog());

        // Listen for WebSocket updates
        calendifierAPI.on('websocket:event_created', () => this.loadCalendar());
        calendifierAPI.on('websocket:event_updated', () => this.loadCalendar());
        calendifierAPI.on('websocket:event_deleted', () => this.loadCalendar());
        calendifierAPI.on('websocket:settings_updated', () => this.loadCalendar());
    }

    async loadCalendar() {
        try {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth() + 1;

            // Load calendar data
            this.calendarData = await calendifierAPI.getCalendar(year, month);
            
            // Update month title
            this.updateMonthTitle();
            
            // Render calendar
            this.renderCalendar();
            
            // Load events for selected date
            this.loadEventsForDate(this.selectedDate);

        } catch (error) {
            console.error('Error loading calendar:', error);
            this.showError('Failed to load calendar data');
        }
    }

    updateMonthTitle() {
        if (this.calendarData) {
            this.currentMonthElement.textContent = `${this.calendarData.month_name} ${this.calendarData.year}`;
        }
    }

    renderCalendar() {
        if (!this.calendarData) return;

        // Clear existing calendar
        this.calendarGrid.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('div');
        headerRow.className = 'calendar-header-row';
        
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = dayName;
            headerRow.appendChild(dayHeader);
        });
        
        this.calendarGrid.appendChild(headerRow);

        // Create calendar weeks
        this.calendarData.weeks.forEach(week => {
            const weekRow = document.createElement('div');
            weekRow.className = 'calendar-week';

            week.forEach(day => {
                const dayElement = this.createDayElement(day);
                weekRow.appendChild(dayElement);
            });

            this.calendarGrid.appendChild(weekRow);
        });
    }

    createDayElement(day) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Add CSS classes based on day properties
        if (day.is_today) dayElement.classList.add('today');
        if (day.is_weekend) dayElement.classList.add('weekend');
        if (day.is_other_month) dayElement.classList.add('other-month');
        if (day.is_holiday) dayElement.classList.add('holiday');
        if (day.events && day.events.length > 0) dayElement.classList.add('has-events');

        // Check if this day is selected
        const dayDate = new Date(day.date);
        if (this.isSameDate(dayDate, this.selectedDate)) {
            dayElement.classList.add('selected');
        }

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day.day;
        dayElement.appendChild(dayNumber);

        // Holiday indicator
        if (day.holiday) {
            const holidayIndicator = document.createElement('div');
            holidayIndicator.className = 'holiday-indicator';
            holidayIndicator.textContent = '🎉';
            holidayIndicator.title = day.holiday.name;
            dayElement.appendChild(holidayIndicator);
        }

        // Event indicators
        if (day.event_indicators && day.event_indicators.length > 0) {
            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'event-indicators';
            
            day.event_indicators.forEach(indicator => {
                const indicatorElement = document.createElement('span');
                indicatorElement.className = 'event-indicator';
                indicatorElement.textContent = indicator;
                indicatorsContainer.appendChild(indicatorElement);
            });
            
            dayElement.appendChild(indicatorsContainer);
        }

        // Click handler
        dayElement.addEventListener('click', () => {
            this.selectDate(dayDate);
        });

        // Double-click to add event
        dayElement.addEventListener('dblclick', () => {
            this.selectDate(dayDate);
            this.showAddEventDialog(dayDate);
        });

        return dayElement;
    }

    selectDate(date) {
        // Remove previous selection
        const previousSelected = this.calendarGrid.querySelector('.calendar-day.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Update selected date
        this.selectedDate = new Date(date);
        
        // Add selection to new date
        const dayElements = this.calendarGrid.querySelectorAll('.calendar-day');
        dayElements.forEach(dayElement => {
            const dayNumber = dayElement.querySelector('.day-number');
            if (dayNumber && parseInt(dayNumber.textContent) === date.getDate()) {
                // Check if this is the right month
                const isCurrentMonth = date.getMonth() === this.currentDate.getMonth() && 
                                     date.getFullYear() === this.currentDate.getFullYear();
                if (isCurrentMonth && !dayElement.classList.contains('other-month')) {
                    dayElement.classList.add('selected');
                }
            }
        });

        // Load events for selected date
        this.loadEventsForDate(date);
    }

    async loadEventsForDate(date) {
        try {
            const dateStr = calendifierAPI.formatDate(date);
            const events = await calendifierAPI.getEvents(dateStr, dateStr);
            
            // Update selected date title
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            this.selectedDateTitle.textContent = date.toLocaleDateString(undefined, options);
            
            // Render events
            this.renderEvents(events);

        } catch (error) {
            console.error('Error loading events for date:', error);
            this.showError('Failed to load events');
        }
    }

    renderEvents(events) {
        this.eventsList.innerHTML = '';

        if (events.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.className = 'no-events-message';
            noEventsMessage.textContent = 'No events for this date';
            this.eventsList.appendChild(noEventsMessage);
            return;
        }

        // Sort events by time
        events.sort((a, b) => {
            if (a.is_all_day && !b.is_all_day) return -1;
            if (!a.is_all_day && b.is_all_day) return 1;
            if (a.start_time && b.start_time) {
                return a.start_time.localeCompare(b.start_time);
            }
            return 0;
        });

        events.forEach(event => {
            const eventElement = this.createEventElement(event);
            this.eventsList.appendChild(eventElement);
        });
    }

    createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.style.borderLeftColor = event.color || '#0078d4';

        // Event time
        const timeElement = document.createElement('div');
        timeElement.className = 'event-time';
        if (event.is_all_day) {
            timeElement.textContent = 'All Day';
        } else if (event.start_time) {
            timeElement.textContent = this.formatTime(event.start_time);
            if (event.end_time) {
                timeElement.textContent += ` - ${this.formatTime(event.end_time)}`;
            }
        }
        eventElement.appendChild(timeElement);

        // Event title
        const titleElement = document.createElement('div');
        titleElement.className = 'event-title';
        titleElement.textContent = event.title;
        eventElement.appendChild(titleElement);

        // Event description
        if (event.description) {
            const descElement = document.createElement('div');
            descElement.className = 'event-description';
            descElement.textContent = event.description;
            eventElement.appendChild(descElement);
        }

        // Event category
        const categoryElement = document.createElement('div');
        categoryElement.className = 'event-category';
        categoryElement.textContent = this.getCategoryEmoji(event.category);
        eventElement.appendChild(categoryElement);

        // Click handler for editing
        eventElement.addEventListener('click', () => {
            this.showEditEventDialog(event);
        });

        return eventElement;
    }

    getCategoryEmoji(category) {
        const categoryEmojis = {
            'default': '📅',
            'work': '💼',
            'personal': '👤',
            'holiday': '🎉',
            'meeting': '🤝',
            'meal': '🍽️',
            'travel': '✈️',
            'health': '🏥',
            'education': '📚',
            'celebration': '🎊',
            'reminder': '⏰'
        };
        return categoryEmojis[category] || '📅';
    }

    formatTime(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.loadCalendar();
    }

    showAddEventDialog(date = null) {
        const targetDate = date || this.selectedDate;
        window.calendifierEvents.showEventDialog(null, targetDate);
    }

    showEditEventDialog(event) {
        window.calendifierEvents.showEventDialog(event);
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        console.error(message);
        alert(message);
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendifierCalendar = new CalendifierCalendar();
});