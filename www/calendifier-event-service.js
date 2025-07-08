/**
 * Calendifier Event Service
 * Centralized event bus for cross-card communication and state management
 * Provides publish/subscribe pattern for reliable card-to-card communication
 */

class CalendifierEventService {
  constructor() {
    this.subscribers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.isDebugMode = false;
    
    console.log('[EventService] Initialized');
  }

  /**
   * Subscribe to events
   * @param {string} eventType - Type of event to subscribe to
   * @param {Function} callback - Callback function to execute
   * @param {Object} context - Context object (usually the card instance)
   * @returns {string} Subscription ID for unsubscribing
   */
  subscribe(eventType, callback, context = null) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }
    
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscribers.get(eventType).set(subscriptionId, {
      callback,
      context,
      subscribedAt: new Date()
    });
    
    if (this.isDebugMode) {
      console.log(`[EventService] Subscribed to ${eventType}:`, { subscriptionId, context: context?.constructor?.name });
    }
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   * @param {string} subscriptionId - Subscription ID returned from subscribe
   */
  unsubscribe(subscriptionId) {
    for (const [eventType, subscribers] of this.subscribers.entries()) {
      if (subscribers.has(subscriptionId)) {
        subscribers.delete(subscriptionId);
        if (this.isDebugMode) {
          console.log(`[EventService] Unsubscribed from ${eventType}:`, subscriptionId);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Unsubscribe all events for a specific context
   * @param {Object} context - Context object to unsubscribe
   */
  unsubscribeAll(context) {
    let unsubscribedCount = 0;
    
    for (const [eventType, subscribers] of this.subscribers.entries()) {
      const toRemove = [];
      
      for (const [subscriptionId, subscription] of subscribers.entries()) {
        if (subscription.context === context) {
          toRemove.push(subscriptionId);
        }
      }
      
      toRemove.forEach(id => {
        subscribers.delete(id);
        unsubscribedCount++;
      });
    }
    
    if (this.isDebugMode) {
      console.log(`[EventService] Unsubscribed ${unsubscribedCount} events for context:`, context?.constructor?.name);
    }
    
    return unsubscribedCount;
  }

  /**
   * Publish an event to all subscribers
   * @param {string} eventType - Type of event to publish
   * @param {Object} data - Event data
   * @param {Object} source - Source object that published the event
   */
  async publish(eventType, data = {}, source = null) {
    const event = {
      type: eventType,
      data,
      source: source?.constructor?.name || 'Unknown',
      timestamp: new Date(),
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    if (this.isDebugMode) {
      console.log(`[EventService] Publishing ${eventType}:`, event);
    }
    
    const subscribers = this.subscribers.get(eventType);
    if (!subscribers || subscribers.size === 0) {
      if (this.isDebugMode) {
        console.log(`[EventService] No subscribers for ${eventType}`);
      }
      return;
    }
    
    const promises = [];
    
    for (const [subscriptionId, subscription] of subscribers.entries()) {
      try {
        const result = subscription.callback.call(subscription.context, event);
        
        // Handle async callbacks
        if (result && typeof result.then === 'function') {
          promises.push(result.catch(error => {
            console.error(`[EventService] Async callback error for ${eventType}:`, error);
          }));
        }
        
      } catch (error) {
        console.error(`[EventService] Callback error for ${eventType} (${subscriptionId}):`, error);
      }
    }
    
    // Wait for all async callbacks to complete
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    if (this.isDebugMode) {
      console.log(`[EventService] Published ${eventType} to ${subscribers.size} subscribers`);
    }
  }

  /**
   * Get event history
   * @param {string} eventType - Optional filter by event type
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of events
   */
  getEventHistory(eventType = null, limit = 50) {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    return events.slice(-limit);
  }

  /**
   * Get current subscribers
   * @returns {Object} Map of event types and their subscriber counts
   */
  getSubscribers() {
    const result = {};
    
    for (const [eventType, subscribers] of this.subscribers.entries()) {
      result[eventType] = {
        count: subscribers.size,
        subscribers: Array.from(subscribers.entries()).map(([id, sub]) => ({
          id,
          context: sub.context?.constructor?.name || 'Unknown',
          subscribedAt: sub.subscribedAt
        }))
      };
    }
    
    return result;
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    console.log(`[EventService] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    console.log('[EventService] Event history cleared');
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const totalSubscribers = Array.from(this.subscribers.values())
      .reduce((total, subscribers) => total + subscribers.size, 0);
    
    return {
      totalEventTypes: this.subscribers.size,
      totalSubscribers,
      eventHistorySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize,
      isDebugMode: this.isDebugMode,
      uptime: Date.now() - this.startTime
    };
  }
}

// Create global singleton instance
window.CalendifierEventService = window.CalendifierEventService || new CalendifierEventService();

// Standard event types
window.CalendifierEventService.EventTypes = {
  // Card lifecycle events
  CARD_REGISTERED: 'card-registered',
  CARD_UNREGISTERED: 'card-unregistered',
  CARD_READY: 'card-ready',
  
  // Event data events
  EVENT_CREATED: 'event-created',
  EVENT_UPDATED: 'event-updated',
  EVENT_DELETED: 'event-deleted',
  EVENTS_LOADED: 'events-loaded',
  
  // UI interaction events
  EVENT_EDIT_REQUESTED: 'event-edit-requested',
  EVENT_VIEW_REQUESTED: 'event-view-requested',
  DATE_SELECTED: 'date-selected',
  
  // Settings events
  LOCALE_CHANGED: 'locale-changed',
  SETTINGS_CHANGED: 'settings-changed',
  
  // Error events
  ERROR_OCCURRED: 'error-occurred',
  WARNING_OCCURRED: 'warning-occurred'
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendifierEventService;
}

console.log('[EventService] Service loaded and ready');