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
    this.currentLocale = 'en_US';
    this.isTranslationReady = false;
    this.config = {};
    
    // Bind methods to preserve context
    this.handleLocaleChange = this.handleLocaleChange.bind(this);
    
    this.initTranslations();
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
      // During initialization, return the key to avoid English fallbacks
      return key;
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
    
    // If no translation found, return the key (no English fallbacks allowed)
    return key;
  }

  async loadDirectTranslations() {
    try {
      // Get current locale from API settings
      const settingsResponse = await fetch(`${this.getApiBaseUrl()}/api/v1/settings`);
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        this.currentLocale = settings.locale || 'en_US';
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
        position: absolute;
        top: 10px;
        right: 10px;
        left: 10px;
        padding: 12px;
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: bold;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        z-index: 1000;
        text-align: center;
      }
      
      .notification.show {
        opacity: 1;
        transform: translateY(0);
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
}

// Make CalendifierBaseCard available globally
window.CalendifierBaseCard = CalendifierBaseCard;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendifierBaseCard;
}
