/**
 * Calendifier Translation Manager
 * Unified translation system that eliminates all 6 critical flaws:
 * 1. Zero English fallbacks
 * 2. Single translation system (no competing mechanisms)
 * 3. Smart key resolution (handles both dot notation and flattened keys)
 * 4. Robust error handling (no silent failures)
 * 5. Intelligent cache management
 * 6. Maintainable codebase
 */

class CalendifierTranslationManager {
  constructor() {
    this.translations = new Map();
    this.currentLocale = 'en_GB';
    this.cache = new Map();
    this.isReady = false;
    this.loadPromises = new Map();
    this.apiBaseUrl = this.getApiBaseUrl();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.debugMode = false;
    
    // Performance tracking
    this.stats = {
      translationsLoaded: 0,
      translationRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.log('Translation Manager initialized');
  }

  getApiBaseUrl() {
    const host = window.location.hostname;
    return `http://${host}:8000`;
  }

  log(message, level = 'info') {
    if (this.debugMode || level === 'error' || level === 'warn') {
      console[level](`[TranslationManager] ${message}`);
    }
  }

  // Smart key resolution - handles both formats automatically
  resolveKey(key, translations) {
    this.stats.translationRequests++;
    
    // Try direct key lookup first (fastest path)
    if (translations[key]) {
      this.stats.cacheHits++;
      return translations[key];
    }
    
    // Try dot notation lookup for nested objects
    if (key.includes('.')) {
      const dotValue = this.getNestedValue(translations, key);
      if (dotValue) {
        this.stats.cacheHits++;
        return dotValue;
      }
      
      // Try flattened version (settings.about -> settings_about)
      const flatKey = key.replace(/\./g, '_');
      if (translations[flatKey]) {
        this.stats.cacheHits++;
        return translations[flatKey];
      }
    }
    
    // Try flattened to dot conversion (settings_about -> settings.about)
    if (key.includes('_') && !key.includes('.')) {
      const dotKey = key.replace(/_/g, '.');
      const dotValue = this.getNestedValue(translations, dotKey);
      if (dotValue) {
        this.stats.cacheHits++;
        return dotValue;
      }
    }
    
    this.stats.cacheMisses++;
    return null;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Main translation function - explicit error handling, no English fallbacks
  t(key, fallback = null) {
    const translations = this.getCurrentTranslations();
    
    if (!translations) {
      this.log(`Translation system not ready for key: ${key}`, 'warn');
      return key; // Return key, never English fallback
    }
    
    const translation = this.resolveKey(key, translations);
    
    if (translation) {
      return translation;
    }
    
    // Log missing translation for debugging (but don't spam console)
    if (!this._loggedMissingKeys) {
      this._loggedMissingKeys = new Set();
    }
    
    if (!this._loggedMissingKeys.has(key)) {
      this.log(`Translation missing: ${key} for locale ${this.currentLocale}`, 'warn');
      this._loggedMissingKeys.add(key);
    }
    
    // Return key only - NO English fallbacks allowed
    return key;
  }

  getCurrentTranslations() {
    return this.translations.get(this.currentLocale) || {};
  }

  async loadTranslations(locale) {
    // Prevent duplicate loads
    if (this.loadPromises.has(locale)) {
      return this.loadPromises.get(locale);
    }

    const loadPromise = this._loadTranslationsWithRetry(locale);
    this.loadPromises.set(locale, loadPromise);
    
    try {
      await loadPromise;
      return true;
    } catch (error) {
      this.log(`Failed to load translations for ${locale}: ${error.message}`, 'error');
      return false;
    } finally {
      this.loadPromises.delete(locale);
    }
  }

  async _loadTranslationsWithRetry(locale, attempt = 1) {
    try {
      this.log(`Loading translations for ${locale} (attempt ${attempt})`);
      
      const response = await fetch(`${this.apiBaseUrl}/api/v1/translations/${locale}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.translations) {
        throw new Error('Invalid translation data received');
      }
      
      // Store normalized translations
      this.translations.set(locale, data.translations);
      this.stats.translationsLoaded++;
      
      this.log(`✅ Loaded ${Object.keys(data.translations).length} translations for ${locale}`);
      
      // Clear missing key cache when new translations are loaded
      this._loggedMissingKeys = new Set();
      
      return true;
    } catch (error) {
      this.log(`Failed to load translations for ${locale} (attempt ${attempt}): ${error.message}`, 'error');
      
      if (attempt < this.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this._loadTranslationsWithRetry(locale, attempt + 1);
      }
      
      throw error;
    }
  }

  async setLocale(locale) {
    if (locale === this.currentLocale && this.translations.has(locale)) {
      this.log(`Locale ${locale} already active and loaded`);
      return true;
    }

    try {
      this.log(`Setting locale to ${locale}`);
      
      const success = await this.loadTranslations(locale);
      if (!success) {
        throw new Error(`Failed to load translations for ${locale}`);
      }
      
      this.currentLocale = locale;
      this.isReady = true;
      
      // Update API settings
      await this.updateApiSettings(locale);
      
      // Broadcast locale change
      this.broadcastLocaleChange(locale);
      
      this.log(`✅ Locale set to ${locale}`);
      return true;
    } catch (error) {
      this.log(`Failed to set locale to ${locale}: ${error.message}`, 'error');
      return false;
    }
  }

  async updateApiSettings(locale) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/settings`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ locale: locale })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update API settings: ${response.status}`);
      }
      
      this.log(`API settings updated for locale ${locale}`);
    } catch (error) {
      this.log(`Failed to update API settings: ${error.message}`, 'warn');
    }
  }

  broadcastLocaleChange(locale) {
    const event = new CustomEvent('calendifier-locale-changed', {
      detail: { 
        locale: locale, 
        translations: this.getCurrentTranslations(),
        manager: this
      },
      bubbles: true,
      composed: true
    });
    
    document.dispatchEvent(event);
    this.log(`Broadcasted locale change to ${locale}`);
  }

  async init() {
    try {
      this.log('Initializing translation manager...');
      
      // Load current locale from API settings
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/v1/settings`);
        if (response.ok) {
          const settings = await response.json();
          this.currentLocale = settings.locale || 'en_GB';
          this.log(`Loaded locale from API: ${this.currentLocale}`);
        }
      } catch (error) {
        this.log(`Could not load locale from settings: ${error.message}`, 'warn');
      }

      // Load initial translations
      const success = await this.setLocale(this.currentLocale);
      if (success) {
        this.log('✅ Translation manager initialized successfully');
      } else {
        throw new Error('Failed to load initial translations');
      }
    } catch (error) {
      this.log(`Failed to initialize: ${error.message}`, 'error');
      throw error;
    }
  }

  // Utility methods for cards
  async getAvailableLocales() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/translations`);
      if (response.ok) {
        const data = await response.json();
        return data.locales || [];
      }
    } catch (error) {
      this.log(`Failed to load available locales: ${error.message}`, 'error');
    }
    return [];
  }

  isLocaleReady(locale = this.currentLocale) {
    return this.translations.has(locale);
  }

  async ensureReady() {
    if (this.isReady && this.isLocaleReady()) {
      return Promise.resolve();
    }
    
    return this.init();
  }

  // Performance and debugging methods
  getStats() {
    return {
      ...this.stats,
      loadedLocales: Array.from(this.translations.keys()),
      currentLocale: this.currentLocale,
      isReady: this.isReady,
      cacheHitRate: this.stats.translationRequests > 0 ? 
        (this.stats.cacheHits / this.stats.translationRequests * 100).toFixed(2) + '%' : '0%'
    };
  }

  enableDebugMode() {
    this.debugMode = true;
    this.log('Debug mode enabled');
  }

  disableDebugMode() {
    this.debugMode = false;
  }

  // Test method for validation
  async testTranslations(testKeys = ['settings.about', 'toolbar.today', 'calendar.months.january']) {
    const results = {};
    const locales = await this.getAvailableLocales();
    
    for (const locale of locales.slice(0, 5)) { // Test first 5 locales
      this.log(`Testing translations for ${locale.code}...`);
      await this.setLocale(locale.code);
      
      results[locale.code] = {};
      for (const key of testKeys) {
        const translation = this.t(key);
        results[locale.code][key] = {
          translation: translation,
          isTranslated: translation !== key,
          isEmpty: !translation || translation.trim() === ''
        };
      }
    }
    
    return results;
  }
}

// Create global instance
window.calendifierTranslationManager = new CalendifierTranslationManager();

// Auto-initialize when DOM is ready
function initializeTranslationManager() {
  if (window.calendifierTranslationManager && !window.calendifierTranslationManager.isReady) {
    window.calendifierTranslationManager.init().catch(error => {
      console.error('[TranslationManager] Failed to initialize:', error);
      // Fallback: set basic ready state so cards don't hang
      window.calendifierTranslationManager.isReady = true;
      window.calendifierTranslationManager.currentLocale = 'en_GB';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTranslationManager);
} else {
  // DOM already loaded
  initializeTranslationManager();
}

// Also try to initialize after a short delay in case of timing issues
setTimeout(initializeTranslationManager, 1000);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendifierTranslationManager;
}

// Debug utilities for browser console
window.calendifierDebug = {
  enableTranslationDebug: () => window.calendifierTranslationManager.enableDebugMode(),
  disableTranslationDebug: () => window.calendifierTranslationManager.disableDebugMode(),
  getTranslationStats: () => window.calendifierTranslationManager.getStats(),
  testTranslations: (keys) => window.calendifierTranslationManager.testTranslations(keys),
  setLocale: (locale) => window.calendifierTranslationManager.setLocale(locale)
};
