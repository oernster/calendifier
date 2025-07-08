# 🧩 Web Components

This document provides a detailed explanation of the web components used in Calendifier's Home Assistant integration, including their architecture, implementation, and interaction with the API server.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Base Component](#base-component)
- [Calendar Card](#calendar-card)
- [Event List Card](#event-list-card)
- [Event Details Card](#event-details-card)
- [Event Form Card](#event-form-card)
- [RRule Builder](#rrule-builder)
- [Translation System](#translation-system)
- [Theme Integration](#theme-integration)
- [Performance Optimization](#performance-optimization)
- [Accessibility](#accessibility)

## Overview

Calendifier's Home Assistant integration uses custom web components to provide a rich calendar interface within the Home Assistant Lovelace dashboard. These components are built using LitElement, a lightweight base class for creating web components.

The web components are designed to be:
- **Modular**: Each component has a specific responsibility
- **Reusable**: Components can be used in different contexts
- **Customizable**: Components can be configured through attributes
- **Responsive**: Components adapt to different screen sizes
- **Accessible**: Components follow accessibility best practices

## Architecture

The web components follow a hierarchical architecture:

```
┌─────────────────────────┐
│  calendifier-base-card  │
└─────────────────────────┘
              ▲
              │
              │
┌─────────────┼─────────────┐
│             │             │
│             │             │
▼             ▼             ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ calendifier-    │ │ calendifier-    │ │ calendifier-    │
│ calendar-card   │ │ event-list-card │ │ event-form-card │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────┐
                                      │ calendifier-        │
                                      │ rrule-builder       │
                                      └─────────────────────┘
```

### Component Communication

Components communicate with each other using custom events:

```
┌─────────────────┐                      ┌─────────────────┐
│ calendifier-    │  event-selected      │ calendifier-    │
│ calendar-card   │ ─────────────────►   │ event-list-card │
└─────────────────┘                      └─────────────────┘
                                                 │
                                                 │ event-selected
                                                 ▼
┌─────────────────┐                      ┌─────────────────┐
│ calendifier-    │  event-created       │ calendifier-    │
│ event-form-card │ ◄───────────────────┐│ event-list-card │
└─────────────────┘                      └─────────────────┘
        │
        │ rrule-changed
        ▼
┌─────────────────┐
│ calendifier-    │
│ rrule-builder   │
└─────────────────┘
```

### API Communication

All components communicate with the API server through the base component:

```
┌─────────────────┐                      ┌─────────────────┐
│ Web Component   │                      │   API Server    │
└─────────────────┘                      └─────────────────┘
        │                                        ▲
        │                                        │
        │ getApiBaseUrl()                        │
        ▼                                        │
┌─────────────────┐                              │
│ Base Component  │ ─────────────────────────────┘
└─────────────────┘           fetch()
```

## Base Component

The `calendifier-base-card` is the foundation for all Calendifier web components. It provides common functionality such as API communication, translation, and theme integration.

## Calendar Card

The `calendifier-calendar-card` displays a calendar view with events. It supports month, week, and day views.

## Event List Card

The `calendifier-event-list-card` displays a list of events for a selected date range. It allows users to view, create, edit, and delete events.

```javascript
import { html, css } from 'lit';
import { CalendifierBaseCard } from './calendifier-base-card.js';

export class CalendifierEventListCard extends CalendifierBaseCard {
  static get properties() {
    return {
      ...super.properties,
      events: { type: Array },
      selectedDate: { type: Object },
      loading: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.events = [];
    this.selectedDate = new Date();
    this.loading = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.loadEvents();
    
    // Listen for date-selected events
    window.addEventListener('calendifier-date-selected', this._handleDateSelected.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('calendifier-date-selected', this._handleDateSelected.bind(this));
  }

  async _handleDateSelected(event) {
    this.selectedDate = new Date(event.detail.date);
    await this.loadEvents();
  }

  async loadEvents() {
    this.loading = true;
    
    try {
      const date = this.selectedDate.toISOString().split('T')[0];
      const response = await this.makeApiRequest(`/api/v1/events?start_date=${date}&end_date=${date}`);
      
      this.events = response.events;
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      this.loading = false;
    }
  }

  handleEventClick(event) {
    // Dispatch event-selected event
    this.dispatchEvent(new CustomEvent('event-selected', {
      detail: { eventId: event.id },
      bubbles: true,
      composed: true
    }));
  }

  handleCreateEvent() {
    // Dispatch create-event event
    this.dispatchEvent(new CustomEvent('create-event', {
      detail: { date: this.selectedDate },
      bubbles: true,
      composed: true
    }));
  }

  getEventTimeString(event) {
    if (event.is_all_day) {
      return this.t('events.all_day', 'All day');
    }
    
    const startTime = this.formatTime(event.start_date);
    const endTime = this.formatTime(event.end_date);
    
    return `${startTime} - ${endTime}`;
  }

  getEventColor(event) {
    // Default colors for categories
    const categoryColors = {
      work: '#4285F4',
      personal: '#EA4335',
      family: '#FBBC05',
      holiday: '#34A853',
      default: '#9E9E9E'
    };
    
    return categoryColors[event.category] || categoryColors.default;
  }

  render() {
    return html`
      <ha-card>
        <div class="card-header">
          <div class="title">${this.t('events.title', 'Events')}</div>
          <div class="controls">
            <ha-icon-button @click="${this.handleCreateEvent}">
              <ha-icon icon="mdi:plus"></ha-icon>
            </ha-icon-button>
          </div>
        </div>
        
        <div class="card-content">
          <div class="date-header">
            ${this.formatDate(this.selectedDate, 'full')}
          </div>
          
          ${this.loading ? html`
            <div class="loading">
              <ha-circular-progress active></ha-circular-progress>
            </div>
          ` : html`
            ${this.events.length === 0 ? html`
              <div class="no-events">
                ${this.t('events.no_events', 'No events for this day')}
              </div>
            ` : html`
              <div class="event-list">
                ${this.events.map(event => html`
                  <div class="event-item" @click="${() => this.handleEventClick(event)}">
                    <div class="event-color" style="background-color: ${this.getEventColor(event)}"></div>
                    <div class="event-details">
                      <div class="event-title">${event.title}</div>
                      <div class="event-time">${this.getEventTimeString(event)}</div>
                    </div>
                  </div>
                `)}
              </div>
            `}
          `}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      
      ha-card {
        padding: 0;
        overflow: hidden;
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
      }
      
      .title {
        font-size: 18px;
        font-weight: 500;
      }
      
      .controls {
        display: flex;
      }
      
      .card-content {
        padding: 0 16px 16px;
      }
      
      .date-header {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 16px;
      }
      
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
      }
      
      .no-events {
        text-align: center;
        padding: 24px;
        color: var(--secondary-text-color);
      }
      
      .event-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .event-item {
        display: flex;
        align-items: center;
        padding: 8px;
        border-radius: 4px;
        background-color: var(--card-background-color, #ffffff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        cursor: pointer;
      }
      
      .event-item:hover {
        background-color: var(--secondary-background-color);
      }
      
      .event-color {
        width: 12px;
        height: 100%;
        border-radius: 2px;
        margin-right: 8px;
      }
      
      .event-details {
        flex: 1;
      }
      
      .event-title {
        font-weight: 500;
      }
      
      .event-time {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

customElements.define('calendifier-event-list-card', CalendifierEventListCard);
```

## Event Details Card

The `calendifier-event-details-card` displays detailed information about a selected event. It allows users to edit or delete the event.

```javascript
import { html, css } from 'lit';
import { CalendifierBaseCard } from './calendifier-base-card.js';

export class CalendifierEventDetailsCard extends CalendifierBaseCard {
  static get properties() {
    return {
      ...super.properties,
      eventId: { type: String },
      event: { type: Object },
      loading: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.eventId = null;
    this.event = null;
    this.loading = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Listen for event-selected events
    window.addEventListener('event-selected', this._handleEventSelected.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('event-selected', this._handleEventSelected.bind(this));
  }

  async _handleEventSelected(event) {
    this.eventId = event.detail.eventId;
    await this.loadEvent();
  }

  async loadEvent() {
    if (!this.eventId) {
      this.event = null;
      return;
    }
    
    this.loading = true;
    
    try {
      const response = await this.makeApiRequest(`/api/v1/events/${this.eventId}`);
      this.event = response;
    } catch (error) {
      console.error('Error loading event:', error);
      this.event = null;
    } finally {
      this.loading = false;
    }
  }

  handleEditEvent() {
    // Dispatch edit-event event
    this.dispatchEvent(new CustomEvent('edit-event', {
      detail: { eventId: this.eventId },
      bubbles: true,
      composed: true
    }));
  }

  async handleDeleteEvent() {
    if (!confirm(this.t('events.confirm_delete', 'Are you sure you want to delete this event?'))) {
      return;
    }
    
    try {
      await this.makeApiRequest(`/api/v1/events/${this.eventId}`, {
        method: 'DELETE'
      });
      
      this.showSuccess(this.t('events.delete_success', 'Event deleted successfully'));
      
      // Clear event and notify others
      this.eventId = null;
      this.event = null;
      
      this.dispatchEvent(new CustomEvent('event-deleted', {
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Error deleting event:', error);
      this.showError(this.t('events.delete_error', 'Error deleting event'));
    }
  }

  getEventTimeString(event) {
    if (!event) return '';
    
    if (event.is_all_day) {
      return this.t('events.all_day', 'All day');
    }
    
    const startDate = this.formatDate(event.start_date, 'full');
    const endDate = this.formatDate(event.end_date, 'full');
    const startTime = this.formatTime(event.start_date);
    const endTime = this.formatTime(event.end_date);
    
    if (startDate === endDate) {
      return `${startDate}, ${startTime} - ${endTime}`;
    } else {
      return `${startDate}, ${startTime} - ${endDate}, ${endTime}`;
    }
  }

  getRecurrenceString(event) {
    if (!event || !event.is_recurring || !event.rrule) {
      return '';
    }
    
    // This would use a proper RRULE parser to generate a human-readable string
    // For simplicity, we'll just return a placeholder
    return this.t('events.recurring', 'Recurring event');
  }

  getCategoryName(category) {
    if (!category) return '';
    
    const categoryNames = {
      work: this.t('events.categories.work', 'Work'),
      personal: this.t('events.categories.personal', 'Personal'),
      family: this.t('events.categories.family', 'Family'),
      holiday: this.t('events.categories.holiday', 'Holiday')
    };
    
    return categoryNames[category] || category;
  }

  getCategoryColor(category) {
    const categoryColors = {
      work: '#4285F4',
      personal: '#EA4335',
      family: '#FBBC05',
      holiday: '#34A853',
      default: '#9E9E9E'
    };
    
    return categoryColors[category] || categoryColors.default;
  }

  render() {
    if (this.loading) {
      return html`
        <ha-card>
          <div class="card-content loading">
            <ha-circular-progress active></ha-circular-progress>
          </div>
        </ha-card>
      `;
    }
    
    if (!this.event) {
      return html`
        <ha-card>
          <div class="card-content no-event">
            ${this.t('events.no_event_selected', 'No event selected')}
          </div>
        </ha-card>
      `;
    }
    
    return html`
      <ha-card>
        <div class="card-header">
          <div class="title">${this.event.title}</div>
          <div class="controls">
            <ha-icon-button @click="${this.handleEditEvent}">
              <ha-icon icon="mdi:pencil"></ha-icon>
            </ha-icon-button>
            <ha-icon-button @click="${this.handleDeleteEvent}">
              <ha-icon icon="mdi:delete"></ha-icon>
            </ha-icon-button>
          </div>
        </div>
        
        <div class="card-content">
          <div class="event-details">
            <div class="detail-row">
              <ha-icon icon="mdi:clock-outline"></ha-icon>
              <span>${this.getEventTimeString(this.event)}</span>
            </div>
            
            ${this.event.is_recurring ? html`
              <div class="detail-row">
                <ha-icon icon="mdi:refresh"></ha-icon>
                <span>${this.getRecurrenceString(this.event)}</span>
              </div>
            ` : ''}
            
            ${this.event.category ? html`
              <div class="detail-row">
                <div class="category-color" style="background-color: ${this.getCategoryColor(this.event.category)}"></div>
                <span>${this.getCategoryName(this.event.category)}</span>
              </div>
            ` : ''}
            
            ${this.event.description ? html`
              <div class="description">
                ${this.event.description}
              </div>
            ` : ''}
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      
      ha-card {
        padding: 0;
        overflow: hidden;
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
      }
      
      .title {
        font-size: 18px;
        font-weight: 500;
      }
      
      .controls {
        display: flex;
      }
      
      .card-content {
        padding: 0 16px 16px;
      }
      
      .loading, .no-event {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
      }
      
      .no-event {
        color: var(--secondary-text-color);
      }
      
      .event-details {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .detail-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .category-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      
      .description {
        margin-top: 8px;
        white-space: pre-line;
      }
    `;
  }
}

customElements.define('calendifier-event-details-card', CalendifierEventDetailsCard);
```

## Event Form Card

The `calendifier-event-form-card` provides a form for creating and editing events. It includes fields for title, description, date, time, category, and recurrence.

## RRule Builder

The `calendifier-rrule-builder` is a component for creating and editing recurrence rules (RRULEs). It provides a user-friendly interface for defining complex recurrence patterns.

## Translation System

The translation system allows the web components to be localized into multiple languages. It uses the same translation files as the desktop application.

### Translation Manager

The `TranslationManager` class handles loading and using translations:

```javascript
export class TranslationManager {
  constructor() {
    this.translations = {};
    this.currentLocale = 'en';
    this.fallbackLocale = 'en';
  }

  async init(locale, apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    await this.setLocale(locale);
  }

  async setLocale(locale) {
    if (locale === this.currentLocale) {
      return;
    }

    try {
      const translations = await this.loadTranslations(locale);
      this.translations = translations;
      this.currentLocale = locale;
    } catch (error) {
      console.error(`Error loading translations for ${locale}:`, error);
      
      // Try fallback locale if different from requested locale
      if (locale !== this.fallbackLocale) {
        await this.setLocale(this.fallbackLocale);
      }
    }
  }

  async loadTranslations(locale) {
    const response = await fetch(`${this.apiBaseUrl}/api/v1/translations?locale=${locale}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load translations: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  translate(key, defaultValue = '', variables = {}) {
    // Split key by dots to support nested translations
    const keys = key.split('.');
    let value = this.translations;
    
    // Traverse the translations object
    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        value = undefined;
        break;
      }
      value = value[k];
    }
    
    // Use default value if translation not found
    if (value === undefined || value === null || typeof value !== 'string') {
      value = defaultValue;
    }
    
    // Replace variables in the translation
    if (variables && Object.keys(variables).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
      });
    }
    
    return value;
  }
}
```

## Theme Integration

The web components integrate with Home Assistant's theme system to ensure a consistent look and feel.

### Theme Variables

The components use CSS variables from Home Assistant's theme:

```css
:host {
  --primary-color: var(--primary-color, #03a9f4);
  --secondary-color: var(--secondary-color, #4caf50);
  --primary-text-color: var(--primary-text-color, #212121);
  --secondary-text-color: var(--secondary-text-color, #727272);
  --paper-card-background-color: var(--paper-card-background-color, #ffffff);
  --divider-color: var(--divider-color, #e0e0e0);
}
```

### Dark Mode Support

The components support both light and dark themes:

```javascript
getThemeVariables() {
  if (!this.hass) {
    return {};
  }
  
  const theme = this.hass.themes.darkMode ? 'dark' : 'light';
  return this.hass.themes.themes[theme] || {};
}
```

## Performance Optimization

The web components are optimized for performance to ensure a smooth user experience.

### Lazy Loading

Components are loaded only when needed:

```javascript
// In the main entry point
import('./calendifier-calendar-card.js');

// Lazy load other components
const loadEventDetails = () => import('./calendifier-event-details-card.js');
const loadEventForm = () => import('./calendifier-event-form-card.js');

// Load components when needed
document.addEventListener('event-selected', () => {
  loadEventDetails();
});

document.addEventListener('create-event', () => {
  loadEventForm();
});
```

### Efficient Rendering

LitElement's efficient rendering system is used to minimize DOM updates:

```javascript
// Only update the parts that changed
render() {
  return html`
    <div class="calendar">
      ${this.loading ? 
        html`<div class="loading">Loading...</div>` : 
        this.renderCalendar()
      }
    </div>
  `;
}
```

### Memoization

Expensive calculations are memoized to avoid redundant work:

```javascript
// Memoize event calculations
getEventsForDay(date) {
  const dateString = date.toISOString().split('T')[0];
  
  if (!this._eventCache[dateString]) {
    this._eventCache[dateString] = this.events.filter(event => {
      // Filter logic...
    });
  }
  
  return this._eventCache[dateString];
}
```

## Accessibility

The web components follow accessibility best practices to ensure they are usable by everyone.

### Keyboard Navigation

All interactive elements are keyboard accessible:

```javascript
render() {
  return html`
    <button 
      @click="${this.handleClick}" 
      @keydown="${this.handleKeyDown}"
      tabindex="0"
      role="button"
      aria-label="${this.t('button.label', 'Click me')}"
    >
      ${this.t('button.text', 'Click me')}
    </button>
  `;
}

handleKeyDown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    this.handleClick();
    event.preventDefault();
  }
}
```

### Screen Reader Support

ARIA attributes are used to improve screen reader support:

```javascript
render() {
  return html`
    <div 
      role="grid" 
      aria-label="${this.t('calendar.label', 'Calendar')}"
    >
      <div role="row">
        <div role="columnheader">${this.t('calendar.monday', 'Monday')}</div>
        <!-- More column headers... -->
      </div>
      <!-- Calendar grid... -->
    </div>
  `;
}
```

### High Contrast Support

The components use sufficient color contrast and support high contrast mode:

```css
@media (forced-colors: active) {
  .event {
    border: 1px solid CanvasText;
  }
  
  .event-title {
    color: CanvasText;
  }
}
```

### Focus Indicators

Visible focus indicators are provided for keyboard navigation:

```css
button:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}