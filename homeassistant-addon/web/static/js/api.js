/**
 * API client for Calendifier
 */

class CalendifierAPI {
    constructor() {
        this.baseURL = '/api/v1';
        this.websocket = null;
        this.eventListeners = new Map();
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Calendar API methods
    async getCalendar(year, month) {
        return this.get(`/calendar/${year}/${month}`);
    }

    async getEvents(startDate = null, endDate = null) {
        let endpoint = '/events';
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return this.get(endpoint);
    }

    async createEvent(eventData) {
        return this.post('/events', eventData);
    }

    async updateEvent(eventId, eventData) {
        return this.put(`/events/${eventId}`, eventData);
    }

    async deleteEvent(eventId) {
        return this.delete(`/events/${eventId}`);
    }

    async getHolidays(year) {
        return this.get(`/holidays/${year}`);
    }

    async getSettings() {
        return this.get('/settings');
    }

    async updateSettings(settings) {
        return this.put('/settings', settings);
    }

    async getNTPStatus() {
        return this.get('/ntp/status');
    }

    async syncNTP() {
        return this.post('/ntp/sync');
    }

    async getInfo() {
        return this.get('/info');
    }

    async getHealth() {
        return this.get('/health');
    }

    /**
     * WebSocket connection
     */
    connectWebSocket() {
        if (this.websocket) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsURL = `${protocol}//${window.location.host}/api/v1/ws`;

        this.websocket = new WebSocket(wsURL);

        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.emit('websocket:connected');
        };

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit('websocket:message', data);
                
                // Emit specific event types
                if (data.type) {
                    this.emit(`websocket:${data.type}`, data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.websocket = null;
            this.emit('websocket:disconnected');
            
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connectWebSocket();
            }, 5000);
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('websocket:error', error);
        };
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Utility methods
     */
    formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toISOString().split('T')[0];
    }

    formatTime(time) {
        if (typeof time === 'string') {
            return time;
        }
        if (time instanceof Date) {
            return time.toTimeString().split(' ')[0].substring(0, 5);
        }
        return null;
    }

    formatDateTime(dateTime) {
        if (typeof dateTime === 'string') {
            dateTime = new Date(dateTime);
        }
        return dateTime.toISOString();
    }
}

// Create global API instance
window.calendifierAPI = new CalendifierAPI();