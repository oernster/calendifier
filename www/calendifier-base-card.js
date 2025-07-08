/**
 * Calendifier Base Card Class
 * Provides standardized translation interface and common functionality
 * for all Calendifier Lovelace cards
 */

class CalendifierBaseCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.translationManager = null;
    this.currentLocale = 'en_GB'; // Match API server default
    this.isTranslationReady = false;
    this.config = {};
    this.cardType = null; // Will be set by subclasses
    this.subscriptions = []; // Track event subscriptions for cleanup
    
    // Bind methods to preserve context
    this.handleLocaleChange = this.handleLocaleChange.bind(this);
    
    this.initTranslations();
    this.initEventService();
  }

  /**
   * Initialize event service integration
   */
  async initEventService() {
    // Wait for event service to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!window.CalendifierEventService && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.CalendifierEventService) {
      console.warn(`[${this.constructor.name}] Event service not available after 5 seconds`);
      return;
    }
    
    this.eventService = window.CalendifierEventService;
    console.log(`[${this.constructor.name}] Event service connected`);
  }

  async initTranslations() {
    try {
      // Load translation manager script if not already loaded
      if (!window.calendifierTranslationManager) {
        await this.loadTranslationManagerScript();
      }
      
      // Wait for translation manager to be available
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max wait
      
      while (!window.calendifierTranslationManager && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.calendifierTranslationManager) {
        throw new Error('Translation manager failed to load after 10 seconds');
      }
      
      this.translationManager = window.calendifierTranslationManager;
      
      // Ensure translation manager is ready
      await this.translationManager.ensureReady();
      
      this.currentLocale = this.translationManager.currentLocale;
      this.isTranslationReady = true;
      
      // Listen for locale changes
      document.addEventListener('calendifier-locale-changed', this.handleLocaleChange);
      
      
      // Re-render when ready
      this.render();
      
    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to initialize translations:`, error);
      throw error; // Don't allow fallbacks - fail hard
    }
  }

  async loadTranslationManagerScript() {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="calendifier-translation-manager"]')) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = '/local/calendifier-translation-manager.js';
      script.onload = () => {
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load translation manager script'));
      };
      document.head.appendChild(script);
    });
  }

  handleTranslationError(errorMessage) {
    // Fallback rendering without translations
    this.isTranslationReady = false;
    console.warn(`[${this.constructor.name}] Running without translations: ${errorMessage}`);
    this.render();
  }

  /**
   * Main translation function
   * @param {string} key - Translation key (supports both dot notation and flattened)
   * @param {string} fallback - Fallback text if translation not found
   * @returns {string} Translated text or fallback
   */
  t(key, fallback = null) {
    if (!this.translationManager || !this.isTranslationReady) {
      // During initialization, return fallback if provided, otherwise key
      return fallback || key;
    }
    
    try {
      const translation = this.translationManager.t(key, null);
      // Only return translation if it's actually translated (not the key itself)
      if (translation && translation !== key) {
        return translation;
      }
    } catch (error) {
      console.error(`[${this.constructor.name}] Translation error for key ${key}:`, error);
    }
    
    // If no translation found, return fallback if provided, otherwise key
    return fallback || key;
  }

  async loadDirectTranslations() {
    try {
      // Get current locale from API settings
      const settingsResponse = await fetch(`${this.getApiBaseUrl()}/api/v1/settings`);
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        this.currentLocale = settings.locale || 'en_GB'; // Match API server default
      }

      // Load translations for current locale
      const translationsResponse = await fetch(`${this.getApiBaseUrl()}/api/v1/translations/${this.currentLocale}`);
      if (translationsResponse.ok) {
        const data = await translationsResponse.json();
        this.translations = data.translations || {};
        return true;
      }
    } catch (error) {
      console.error(`[${this.constructor.name}] Error loading direct translations:`, error);
    }
    return false;
  }

  /**
   * Handle locale change events
   * @param {CustomEvent} event - Locale change event
   */
  async handleLocaleChange(event) {
    const newLocale = event.detail.locale;
    
    // Prevent infinite loops by checking if locale actually changed
    if (this.currentLocale === newLocale) {
      console.log(`[${this.constructor.name}] Locale change ignored - already ${newLocale}`);
      return;
    }
    
    // Prevent multiple simultaneous locale changes
    if (this._localeChangeInProgress) {
      console.log(`[${this.constructor.name}] Locale change already in progress, ignoring`);
      return;
    }
    
    this._localeChangeInProgress = true;
    
    try {
      console.log(`[${this.constructor.name}] Locale changing from ${this.currentLocale} to ${newLocale}`);
      this.currentLocale = newLocale;
      
      // Reload translations for new locale
      if (this.translationManager) {
        try {
          await this.translationManager.setLocale(newLocale);
        } catch (error) {
          console.error(`[${this.constructor.name}] Failed to update translation manager:`, error);
        }
      }
      
      // Re-render with new locale
      this.render();
      
    } finally {
      // Always clear the flag, even if an error occurred
      this._localeChangeInProgress = false;
    }
  }

  /**
   * Get API base URL
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    const host = window.location.hostname;
    return `http://${host}:8000`;
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   */
  showNotification(message, type = 'info') {
    const notification = this.shadowRoot.querySelector('.notification');
    if (notification) {
      notification.textContent = message;
      notification.className = `notification ${type} show`;
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }
  }

  /**
   * Set card configuration
   * @param {Object} config - Card configuration
   */
  setConfig(config) {
    this.config = config || {};
    this.render();
  }

  /**
   * Register this card instance and publish registration event
   */
  registerCard() {
    if (this.cardType && this.eventService) {
      this.eventService.publish(
        this.eventService.EventTypes.CARD_REGISTERED,
        { cardType: this.cardType, cardInstance: this },
        this
      );
      console.log(`[${this.constructor.name}] Registered as ${this.cardType}`);
    }
  }

  /**
   * Unregister this card instance and publish unregistration event
   */
  unregisterCard() {
    if (this.cardType && this.eventService) {
      this.eventService.publish(
        this.eventService.EventTypes.CARD_UNREGISTERED,
        { cardType: this.cardType },
        this
      );
      console.log(`[${this.constructor.name}] Unregistered ${this.cardType}`);
    }
  }

  /**
   * Subscribe to events
   * @param {string} eventType - Type of event to subscribe to
   * @param {Function} callback - Callback function
   * @returns {string} Subscription ID
   */
  subscribe(eventType, callback) {
    if (!this.eventService) {
      console.warn(`[${this.constructor.name}] Event service not available for subscription`);
      return null;
    }
    
    const subscriptionId = this.eventService.subscribe(eventType, callback, this);
    this.subscriptions.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * Publish an event
   * @param {string} eventType - Type of event to publish
   * @param {Object} data - Event data
   */
  publish(eventType, data = {}) {
    if (!this.eventService) {
      console.warn(`[${this.constructor.name}] Event service not available for publishing`);
      return;
    }
    
    this.eventService.publish(eventType, data, this);
  }

  /**
   * Request another card to perform an action
   * @param {string} targetCardType - Type of target card
   * @param {string} action - Action to request
   * @param {Object} data - Action data
   * @returns {Promise} Promise that resolves when action is complete
   */
  async requestCardAction(targetCardType, action, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Subscribe to response
      const responseSubscription = this.subscribe(`${action}-response-${requestId}`, (event) => {
        this.eventService.unsubscribe(responseSubscription);
        
        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error || 'Action failed'));
        }
      });
      
      // Set timeout
      setTimeout(() => {
        this.eventService.unsubscribe(responseSubscription);
        reject(new Error(`Timeout waiting for ${targetCardType} to respond to ${action}`));
      }, 10000);
      
      // Publish request
      this.publish(`${action}-request`, {
        targetCardType,
        requestId,
        data
      });
    });
  }

  /**
   * Home Assistant integration (no-op for independence)
   * @param {Object} hass - Home Assistant object
   */
  set hass(hass) {
    // Work independently - no Home Assistant dependencies
  }

  /**
   * Get card size for Home Assistant layout
   * @returns {number} Card size
   */
  getCardSize() {
    return 3; // Default size, override in subclasses
  }

  /**
   * Render method - must be implemented by subclasses
   */
  render() {
    throw new Error(`${this.constructor.name} must implement render() method`);
  }

  /**
   * Cleanup method called when card is removed
   */
  disconnectedCallback() {
    // Remove event listeners
    document.removeEventListener('calendifier-locale-changed', this.handleLocaleChange);
    
    // Unsubscribe from all events
    if (this.eventService) {
      this.eventService.unsubscribeAll(this);
    }
    
    // Unregister card
    this.unregisterCard();
    
    // Unregister from card registry
    this.unregisterCard();
  }

  /**
   * Common styles for all cards
   * @returns {string} CSS styles
   */
  getCommonStyles() {
    return `
      :host {
        display: block;
        background: var(--card-background-color);
        border-radius: var(--card-border-radius, 12px);
        box-shadow: var(--card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
        padding: 16px;
        font-family: var(--ha-card-font-family, var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif));
        position: relative;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 250px !important;
        box-sizing: border-box !important;
      }
      
      /* Force proper sizing in horizontal stacks */
      :host(.horizontal-stack-item) {
        flex: 1 1 0% !important;
        min-width: 250px !important;
        max-width: calc(50% - 8px) !important;
        margin: 0 4px !important;
      }
      
      /* Override Home Assistant's default card constraints */
      ha-card {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 250px !important;
        box-sizing: border-box !important;
      }
      
      /* Ensure horizontal stacks don't overflow */
      .horizontal-stack {
        display: flex !important;
        gap: 8px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        font-size: 1.2em;
        font-weight: bold;
        color: var(--primary-text-color);
      }
      
      .notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.9em;
        font-weight: bold;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 10000;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .notification.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      
      .notification.success {
        background: #4caf50;
        color: white;
      }
      
      .notification.error {
        background: #f44336;
        color: white;
      }
      
      .notification.warning {
        background: #ff9800;
        color: white;
      }
      
      .notification.info {
        background: #2196f3;
        color: white;
      }
      
      .loading {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 24px;
      }
      
      .error-state {
        text-align: center;
        color: var(--error-color);
        padding: 24px;
        background: var(--error-background-color, #ffebee);
        border-radius: 8px;
        margin: 16px 0;
      }
      
      .error-state .error-icon {
        font-size: 2em;
        margin-bottom: 8px;
      }
      
      .action-button {
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 0.8em;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background 0.2s;
      }
      
      .action-button:hover {
        background: var(--primary-color-dark);
      }
      
      .action-button.secondary {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
      }
      
      .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
  }

  /**
   * Render error state
   * @param {string} message - Error message
   * @returns {string} Error HTML
   */
  renderErrorState(message) {
    return `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div>${this.t('error', 'Error')}: ${message}</div>
        <button class="action-button" onclick="location.reload()">
          🔄 ${this.t('retry', 'Retry')}
        </button>
      </div>
    `;
  }

  /**
   * Render loading state
   * @param {string} message - Loading message
   * @returns {string} Loading HTML
   */
  renderLoadingState(message = null) {
    return `
      <div class="loading">
        <div>⏳</div>
        <div>${message || this.t('loading', 'Loading...')}</div>
      </div>
    `;
  }

  /**
   * Get current local date in YYYY-MM-DD format
   * Avoids timezone issues with toISOString()
   * @returns {string} Local date in YYYY-MM-DD format
   */
  getLocalDateString(date = null) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

// Load event service if not already loaded
if (!window.CalendifierEventService) {
  const script = document.createElement('script');
  script.src = '/local/calendifier-event-service.js';
  script.onload = () => {
    console.log('[BaseCard] Event service loaded');
  };
  script.onerror = () => {
    console.error('[BaseCard] Failed to load event service');
  };
  document.head.appendChild(script);
}

// Make CalendifierBaseCard available globally
window.CalendifierBaseCard = CalendifierBaseCard;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendifierBaseCard;
}
