/**
 * Event management functionality for Calendifier
 */

class CalendifierEvents {
    constructor() {
        this.currentEvent = null;
        this.eventModal = null;
        this.eventForm = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.eventModal = document.getElementById('event-modal');
        this.eventForm = document.getElementById('event-form');
        this.eventModalTitle = document.getElementById('event-modal-title');
        
        // Form elements
        this.titleInput = document.getElementById('event-title');
        this.descriptionInput = document.getElementById('event-description');
        this.startDateInput = document.getElementById('event-start-date');
        this.startTimeInput = document.getElementById('event-start-time');
        this.endDateInput = document.getElementById('event-end-date');
        this.endTimeInput = document.getElementById('event-end-time');
        this.allDayCheckbox = document.getElementById('event-all-day');
        this.categorySelect = document.getElementById('event-category');
        this.colorInput = document.getElementById('event-color');
        
        // Buttons
        this.saveButton = document.getElementById('save-event');
        this.cancelButton = document.getElementById('cancel-event');
        this.closeButtons = this.eventModal.querySelectorAll('.modal-close');
    }

    bindEvents() {
        // Form submission
        this.eventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Cancel button
        this.cancelButton.addEventListener('click', () => {
            this.hideEventDialog();
        });

        // Close buttons
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideEventDialog();
            });
        });

        // Modal backdrop click
        this.eventModal.addEventListener('click', (e) => {
            if (e.target === this.eventModal) {
                this.hideEventDialog();
            }
        });

        // All-day checkbox
        this.allDayCheckbox.addEventListener('change', () => {
            this.toggleTimeInputs();
        });

        // Start date change - auto-set end date
        this.startDateInput.addEventListener('change', () => {
            if (!this.endDateInput.value) {
                this.endDateInput.value = this.startDateInput.value;
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.eventModal.style.display === 'block') {
                this.hideEventDialog();
            }
        });
    }

    showEventDialog(event = null, selectedDate = null) {
        this.currentEvent = event;
        
        if (event) {
            // Edit mode
            this.eventModalTitle.textContent = 'Edit Event';
            this.saveButton.textContent = 'Update Event';
            this.populateForm(event);
        } else {
            // Create mode
            this.eventModalTitle.textContent = 'Add Event';
            this.saveButton.textContent = 'Save Event';
            this.resetForm();
            
            // Set default date if provided
            if (selectedDate) {
                const dateStr = calendifierAPI.formatDate(selectedDate);
                this.startDateInput.value = dateStr;
                this.endDateInput.value = dateStr;
            }
        }
        
        this.eventModal.style.display = 'block';
        this.titleInput.focus();
    }

    hideEventDialog() {
        this.eventModal.style.display = 'none';
        this.currentEvent = null;
        this.resetForm();
    }

    populateForm(event) {
        this.titleInput.value = event.title || '';
        this.descriptionInput.value = event.description || '';
        this.startDateInput.value = event.start_date || '';
        this.startTimeInput.value = event.start_time || '';
        this.endDateInput.value = event.end_date || event.start_date || '';
        this.endTimeInput.value = event.end_time || '';
        this.allDayCheckbox.checked = event.is_all_day || false;
        this.categorySelect.value = event.category || 'default';
        this.colorInput.value = event.color || '#0078d4';
        
        this.toggleTimeInputs();
    }

    resetForm() {
        this.eventForm.reset();
        this.colorInput.value = '#0078d4';
        this.categorySelect.value = 'default';
        this.allDayCheckbox.checked = false;
        this.toggleTimeInputs();
    }

    toggleTimeInputs() {
        const isAllDay = this.allDayCheckbox.checked;
        this.startTimeInput.disabled = isAllDay;
        this.endTimeInput.disabled = isAllDay;
        
        if (isAllDay) {
            this.startTimeInput.value = '';
            this.endTimeInput.value = '';
        }
    }

    validateForm() {
        const errors = [];
        
        // Title is required
        if (!this.titleInput.value.trim()) {
            errors.push('Title is required');
        }
        
        // Start date is required
        if (!this.startDateInput.value) {
            errors.push('Start date is required');
        }
        
        // End date validation
        if (this.endDateInput.value && this.startDateInput.value) {
            const startDate = new Date(this.startDateInput.value);
            const endDate = new Date(this.endDateInput.value);
            
            if (endDate < startDate) {
                errors.push('End date cannot be before start date');
            }
        }
        
        // Time validation for same-day events
        if (!this.allDayCheckbox.checked && 
            this.startTimeInput.value && 
            this.endTimeInput.value &&
            this.startDateInput.value === this.endDateInput.value) {
            
            const startTime = this.startTimeInput.value;
            const endTime = this.endTimeInput.value;
            
            if (endTime <= startTime) {
                errors.push('End time must be after start time for same-day events');
            }
        }
        
        return errors;
    }

    async saveEvent() {
        const errors = this.validateForm();
        
        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return;
        }
        
        const eventData = this.getFormData();
        
        try {
            this.saveButton.disabled = true;
            this.saveButton.textContent = 'Saving...';
            
            if (this.currentEvent) {
                // Update existing event
                await calendifierAPI.updateEvent(this.currentEvent.id, eventData);
            } else {
                // Create new event
                await calendifierAPI.createEvent(eventData);
            }
            
            this.hideEventDialog();
            this.showSuccess(this.currentEvent ? 'Event updated successfully' : 'Event created successfully');
            
        } catch (error) {
            console.error('Error saving event:', error);
            this.showError('Failed to save event: ' + error.message);
        } finally {
            this.saveButton.disabled = false;
            this.saveButton.textContent = this.currentEvent ? 'Update Event' : 'Save Event';
        }
    }

    getFormData() {
        const data = {
            title: this.titleInput.value.trim(),
            description: this.descriptionInput.value.trim(),
            start_date: this.startDateInput.value,
            end_date: this.endDateInput.value || this.startDateInput.value,
            is_all_day: this.allDayCheckbox.checked,
            category: this.categorySelect.value,
            color: this.colorInput.value
        };
        
        if (!data.is_all_day) {
            if (this.startTimeInput.value) {
                data.start_time = this.startTimeInput.value;
            }
            if (this.endTimeInput.value) {
                data.end_time = this.endTimeInput.value;
            }
        }
        
        return data;
    }

    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }
        
        try {
            await calendifierAPI.deleteEvent(eventId);
            this.showSuccess('Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showError('Failed to delete event: ' + error.message);
        }
    }

    showSuccess(message) {
        // Simple success notification - could be enhanced
        console.log('Success:', message);
        // You could implement a toast notification system here
    }

    showError(message) {
        // Simple error notification - could be enhanced
        console.error('Error:', message);
        alert(message);
    }
}

// Initialize events manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendifierEvents = new CalendifierEvents();
});