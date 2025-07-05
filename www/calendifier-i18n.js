/**
 * Calendifier Internationalization System
 * Provides comprehensive translation support for all Lovelace cards
 */

class CalendifierI18n {
  constructor() {
    this.currentLocale = 'en_GB';
    this.translations = {};
    this.fallbackTranslations = {};
    this.apiBaseUrl = this.getApiBaseUrl();
    this.isLoading = false;
    this.loadPromise = null;
    
    // Initialize with current locale
    this.init();
  }

  getApiBaseUrl() {
    const host = window.location.hostname;
    return `http://${host}:8000`;
  }

  async init() {
    
    // Load current settings to get locale
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/settings`);
      if (response.ok) {
        const settings = await response.json();
        this.currentLocale = settings.locale || 'en_GB';
      }
    } catch (error) {
      console.warn('Could not load locale from settings, using default:', error);
    }

    // Load translations for current locale
    const success = await this.loadTranslations(this.currentLocale);
    if (!success) {
      console.warn('Failed to load translations, trying fallback');
      await this.loadTranslations('en_GB');
    }
    
    // Load fallback translations (English)
    if (this.currentLocale !== 'en_GB') {
      await this.loadFallbackTranslations();
    }
    
  }

  async loadTranslations(locale) {
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this._loadTranslationsInternal(locale);
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  async _loadTranslationsInternal(locale) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/translations/${locale}`);
      
      if (response.ok) {
        const data = await response.json();
        
        this.translations = data.translations || {};
        this.currentLocale = locale;
        
        // Store globally for other components
        window.calendifierTranslations = this.translations;
        window.calendifierCurrentLocale = locale;
        
        // Create global translation function
        window.calendifierT = (key, fallback) => {
          return this.translations[key] || fallback || key;
        };
        
        return true;
      } else {
        console.warn(`Failed to load translations for ${locale}: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error(`Error loading translations for ${locale}:`, error);
      return false;
    }
  }

  async loadFallbackTranslations() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/translations/en_GB`);
      if (response.ok) {
        const data = await response.json();
        this.fallbackTranslations = data.translations || {};
      }
    } catch (error) {
      console.warn('Could not load fallback translations:', error);
    }
  }

  /**
   * Get translated text for a key
   * @param {string} key - Translation key (supports dot notation)
   * @param {string} fallback - Fallback text if translation not found
   * @param {object} variables - Variables for string interpolation
   * @returns {string} Translated text
   */
  t(key, fallback = null, variables = {}) {
    let translation = this.getTranslation(key);
    
    // If not found, try fallback translations
    if (!translation && this.fallbackTranslations) {
      translation = this.getTranslationFromObject(key, this.fallbackTranslations);
    }
    
    // If still not found, use fallback or key
    if (!translation) {
      translation = fallback || key;
    }

    // Apply variable substitution
    if (variables && Object.keys(variables).length > 0) {
      translation = this.interpolate(translation, variables);
    }

    return translation;
  }

  /**
   * Get translation from current translations
   */
  getTranslation(key) {
    return this.getTranslationFromObject(key, this.translations);
  }

  /**
   * Get translation from a specific translation object
   */
  getTranslationFromObject(key, translationObj) {
    if (!translationObj || !key) return null;

    // Direct key lookup (for flattened structure)
    if (translationObj[key]) {
      return translationObj[key];
    }

    // Dot notation support (for nested structure)
    const keys = key.split('.');
    let current = translationObj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && current[k] !== undefined) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  }

  /**
   * Interpolate variables into translation string
   */
  interpolate(text, variables) {
    if (!text || !variables) return text;
    
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * Change locale and reload translations
   */
  async setLocale(locale) {
    if (locale === this.currentLocale) return true;

    const success = await this.loadTranslations(locale);
    if (success) {
      // Broadcast locale change
      this.broadcastLocaleChange(locale);
      return true;
    }
    return false;
  }

  /**
   * Broadcast locale change to all cards
   */
  broadcastLocaleChange(locale) {
    // Update global variables
    window.calendifierCurrentLocale = locale;
    
    // Dispatch custom event
    const event = new CustomEvent('calendifier-locale-changed', {
      detail: { locale: locale, translations: this.translations },
      bubbles: true,
      composed: true
    });
    
    document.dispatchEvent(event);
    
    // Force update all Calendifier cards
    setTimeout(() => {
      const cards = document.querySelectorAll('[class*="calendifier"]');
      cards.forEach(card => {
        if (card.handleLocaleChange && typeof card.handleLocaleChange === 'function') {
          card.handleLocaleChange(locale);
        }
        if (card.render && typeof card.render === 'function') {
          try {
            card.render();
          } catch (e) {
          }
        }
      });
    }, 100);
  }

  /**
   * Get available locales
   */
  async getAvailableLocales() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/translations`);
      if (response.ok) {
        const data = await response.json();
        return data.locales || [];
      }
    } catch (error) {
      console.error('Error loading available locales:', error);
    }
    return [];
  }

  /**
   * Get current locale
   */
  getCurrentLocale() {
    return this.currentLocale;
  }

  /**
   * Get all current translations
   */
  getTranslations() {
    return this.translations;
  }

  /**
   * Check if translations are loaded
   */
  isReady() {
    return Object.keys(this.translations).length > 0;
  }

  /**
   * Get category translations for events
   */
  getCategoryTranslations() {
    const categories = {};
    const categoryKeys = [
      'category_work', 'category_meeting', 'category_personal', 'category_meal',
      'category_travel', 'category_health', 'category_education', 'category_celebration',
      'category_reminder', 'category_holiday', 'category_default'
    ];

    categoryKeys.forEach(key => {
      const translation = this.t(key);
      if (translation && translation !== key) {
        const categoryName = key.replace('category_', '');
        categories[categoryName] = translation;
      }
    });

    return categories;
  }

  /**
   * Get month names
   */
  getMonthNames() {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const monthKey = `calendar.months.${[
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ][i - 1]}`;
      months.push(this.t(monthKey, `Month ${i}`));
    }
    return months;
  }

  /**
   * Get day names
   */
  getDayNames() {
    const days = [];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    dayKeys.forEach(day => {
      days.push(this.t(`calendar.days.${day}`, day));
    });
    return days;
  }

  /**
   * Get short day names
   */
  getShortDayNames() {
    const days = [];
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    dayKeys.forEach(day => {
      days.push(this.t(`calendar.days_short.${day}`, day));
    });
    return days;
  }
}

// Create global instance
window.calendifierI18n = new CalendifierI18n();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendifierI18n;
}