/**
 * Calendifier Help Card - Enhanced with New Translation System
 * Provides help documentation, about information, and theme/language controls
 * Uses the new unified translation manager for reliable language support
 */

// Ensure base card is loaded first
(function() {
  function initHelpCard() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initHelpCard, 100);
      return;
    }

    class CalendifierHelpCard extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.aboutData = null;
        this.currentTheme = 'auto';
        this.availableLocales = [];
        this.isLoading = true;
      }

      async setConfig(config) {
        super.setConfig(config);
        
        // Load initial data
        await this.loadInitialData();
        
        this.render();
      }

      async loadInitialData() {
        try {
          this.isLoading = true;
          this.render();
          
          // Load data in parallel
          await Promise.all([
            this.loadAboutData(),
            this.loadCurrentTheme(),
            this.loadAvailableLocales()
          ]);
          
          this.isLoading = false;
          this.render();
        } catch (error) {
          console.error('[HelpCard] Failed to load initial data:', error);
          this.isLoading = false;
          this.render();
        }
      }

      async loadAboutData() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/about`);
          if (response.ok) {
            this.aboutData = await response.json();
          } else {
            // Fallback: create basic about data with version from API
            this.aboutData = {
              app_name: this.t('app_name', '📅 Calendifier'),
              version: await this.getVersionFromAPI(),
              description: this.t('app_description', 'Cross-platform desktop calendar with analog clock, event handling, note taking, and holidays'),
              features: []
            };
          }
        } catch (error) {
          console.error('[HelpCard] Error loading about data:', error);
          // Fallback: create basic about data with version from API
          this.aboutData = {
            app_name: this.t('app_name', '📅 Calendifier'),
            version: await this.getVersionFromAPI(),
            description: this.t('app_description', 'Cross-platform desktop calendar with analog clock, event handling, note taking, and holidays'),
            features: []
          };
        }
      }

      async getVersionFromAPI() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/about`);
          if (response.ok) {
            const data = await response.json();
            return data.version || '1.4.0';
          }
        } catch (error) {
          console.error('[HelpCard] Error getting version from API:', error);
        }
        return '1.4.0'; // Fallback version
      }

      async loadCurrentTheme() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/settings`);
          if (response.ok) {
            const settings = await response.json();
            this.currentTheme = settings.theme || 'auto';
            this.currentLocale = settings.locale || 'en_US';
          }
        } catch (error) {
          console.error('[HelpCard] Error loading theme:', error);
        }
      }

      async loadAvailableLocales() {
        try {
          if (this.translationManager) {
            this.availableLocales = await this.translationManager.getAvailableLocales();
          } else {
            // Fallback to direct API call
            const response = await fetch(`${this.getApiBaseUrl()}/api/v1/translations`);
            if (response.ok) {
              const data = await response.json();
              this.availableLocales = data.locales || [];
            }
          }
        } catch (error) {
          console.error('[HelpCard] Error loading locales:', error);
        }
      }

      async setLocale(locale) {
        try {
          
          // Update API settings first
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/settings`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ locale: locale })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update API settings: ${response.status}`);
          }
          
          // Update translation manager if available
          if (this.translationManager) {
            await this.translationManager.setLocale(locale);
          }
          
          // Update current locale
          this.currentLocale = locale;
          
          // Reload translations for this card
          await this.initTranslations();
          
          // Broadcast locale change to other cards
          const event = new CustomEvent('calendifier-locale-changed', {
            detail: { locale: locale },
            bubbles: true,
            composed: true
          });
          document.dispatchEvent(event);
          
          this.showNotification(`Language changed to ${locale}`, 'success');
          
          
        } catch (error) {
          console.error('[HelpCard] Language change error:', error);
          this.showNotification('Failed to change language', 'error');
        }
      }

      render() {
        if (this.isLoading) {
          this.shadowRoot.innerHTML = `
            <style>${this.getCommonStyles()}</style>
            ${this.renderLoadingState(this.t('loading_help', 'Loading help information...'))}
          `;
          return;
        }

        const aboutData = this.aboutData || {
          app_name: this.t('app_name', '📅 Calendifier'),
          version: '1.4.0',
          description: this.t('app_description', 'Cross-platform desktop calendar with analog clock, event handling, note taking, and holidays'),
          features: []
        };

        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            .theme-controls {
              display: flex;
              justify-content: center;
              gap: 8px;
              margin-bottom: 20px;
              padding: 12px;
              background: var(--secondary-background-color);
              border-radius: 8px;
            }
            
            .theme-button {
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              border: 1px solid var(--divider-color);
              border-radius: 6px;
              padding: 8px 16px;
              font-size: 0.9em;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: all 0.2s;
              min-width: 80px;
              justify-content: center;
            }
            
            .theme-button:hover {
              background: var(--divider-color);
            }
            
            .theme-button.active {
              background: var(--primary-color);
              color: white;
              border-color: var(--primary-color);
            }
            
            .language-controls {
              margin-bottom: 20px;
              padding: 12px;
              background: var(--secondary-background-color);
              border-radius: 8px;
              text-align: center;
            }
            
            .language-label {
              font-weight: bold;
              color: var(--primary-text-color);
              margin-bottom: 8px;
            }
            
            .language-select {
              width: 100%;
              max-width: 300px;
              padding: 8px 12px;
              border: 1px solid var(--divider-color);
              border-radius: 6px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
              cursor: pointer;
            }
            
            .language-select:focus {
              outline: none;
              border-color: var(--primary-color);
            }
            
            /* Increase all emoji sizes by 130% */
            .card-header,
            .language-label,
            .theme-button,
            .language-select,
            .language-select option {
              font-size: 1.3em;
            }
            
            /* Specific adjustments for smaller elements */
            .theme-button {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
            
            .language-select {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
            
            .about-content {
              padding: 20px;
              max-height: 400px;
              overflow-y: auto;
              border: 1px solid var(--divider-color);
              border-radius: 8px;
              background: var(--secondary-background-color);
            }
            
            .app-info {
              text-align: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 1px solid var(--divider-color);
            }
            
            .app-info h2 {
              margin: 0 0 8px 0;
              color: var(--primary-color);
              font-size: 1.5em;
            }
            
            .version {
              font-weight: bold;
              color: var(--secondary-text-color);
              margin: 4px 0;
            }
            
            .description {
              color: var(--primary-text-color);
              font-style: italic;
              margin: 8px 0 0 0;
            }
            
            .features-section,
            .technical-section,
            .libraries-section,
            .license-section,
            .development-section,
            .support-section,
            .acknowledgments-section {
              margin-bottom: 20px;
            }
            
            .features-section h3,
            .technical-section h3,
            .libraries-section h3,
            .license-section h3,
            .development-section h3,
            .support-section h3,
            .acknowledgments-section h3 {
              color: var(--primary-color);
              margin: 0 0 12px 0;
              font-size: 1.2em;
              border-bottom: 1px solid var(--divider-color);
              padding-bottom: 4px;
            }
            
            .features-list,
            .tech-list,
            .lib-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            
            .features-list li,
            .tech-list li,
            .lib-list li {
              padding: 6px 0;
              color: var(--primary-text-color);
              line-height: 1.4;
            }
            
            .license-section p,
            .development-section p,
            .support-section p,
            .acknowledgments-section p {
              color: var(--primary-text-color);
              line-height: 1.5;
              margin: 8px 0;
            }
          </style>
          
          <div class="notification"></div>
          
          <div class="card-header">
            ℹ️ ${this.t('about', 'Help & About')}
          </div>
          
          <div class="language-controls">
            <div class="language-label">🌍 ${this.t('label_language', 'Language')}</div>
            <select class="language-select" onchange="this.getRootNode().host.setLocale(this.value)">
              ${this.availableLocales.map(locale => `
                <option value="${locale.code}" ${this.currentLocale === locale.code ? 'selected' : ''}>
                  ${locale.flag} ${locale.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="about-content">
            <div class="app-info">
              <h2>📅 ${aboutData.app_name}</h2>
              <p class="version">${this.t('version', 'Version')} ${aboutData.version}</p>
              <p class="description">${this.t('app_description', 'Cross-platform desktop calendar with analog clock, event handling, note taking, and holidays')}</p>
            </div>
            
            <div class="features-section">
              <h3>✨ ${this.t('about_features', 'Features')}</h3>
              <ul class="features-list">
                <li>🕐 <strong>${this.t('feature_analog_clock', 'Analog Clock Display')}</strong></li>
                <li>📅 <strong>${this.t('feature_calendar_view', 'Interactive Calendar View')}</strong></li>
                <li>🌍 <strong>${this.t('feature_international_holidays', 'International Holidays')}</strong></li>
                <li>📝 <strong>${this.t('feature_event_management', 'Event Management')}</strong></li>
                <li>📋 <strong>${this.t('feature_note_taking', 'Note Taking System')}</strong></li>
                <li>🌐 <strong>${this.t('feature_ntp_sync', 'NTP Time Synchronization')}</strong></li>
                <li>🎨 <strong>${this.t('feature_themes', 'Multiple Themes')}</strong></li>
                <li>📤📥 <strong>${this.t('feature_import_export', 'Data Import/Export')}</strong></li>
                <li>💾 <strong>${this.t('feature_data_persistence', 'Data Persistence')}</strong></li>
                <li>💻 <strong>${this.t('feature_cross_platform', 'Cross-Platform Support')}</strong></li>
              </ul>
            </div>
            
            <div class="technical-section">
              <h3>🛠️ ${this.t('about_technical_details', 'Technical Details')}</h3>
              <ul class="tech-list">
                <li><strong>${this.t('tech_framework', 'Framework')}:</strong> ${this.t('tech_framework_value', 'FastAPI + Home Assistant')}</li>
                <li><strong>${this.t('tech_language', 'Language')}:</strong> ${this.t('tech_language_value', 'Python + JavaScript')}</li>
                <li><strong>${this.t('tech_architecture', 'Architecture')}:</strong> ${this.t('tech_architecture_value', 'REST API + Lovelace Cards')}</li>
                <li><strong>${this.t('tech_database', 'Database')}:</strong> ${this.t('tech_database_value', 'SQLite')}</li>
                <li><strong>${this.t('tech_time_sync', 'Time Sync')}:</strong> ${this.t('tech_time_sync_value', 'NTP Protocol')}</li>
              </ul>
            </div>
            
            <div class="libraries-section">
              <h3>📚 ${this.t('about_libraries_used', 'Libraries Used')}</h3>
              <ul class="lib-list">
                <li><strong>FastAPI:</strong> ${this.t('lib_fastapi', 'Modern Python web framework')}</li>
                <li><strong>SQLite:</strong> ${this.t('lib_sqlite', 'Lightweight database engine')}</li>
                <li><strong>ntplib:</strong> ${this.t('lib_ntplib', 'Network Time Protocol client')}</li>
                <li><strong>python-dateutil:</strong> ${this.t('lib_dateutil', 'Date/time parsing utilities')}</li>
                <li><strong>holidays:</strong> ${this.t('lib_holidays', 'International holiday data')}</li>
              </ul>
            </div>
            
            <div class="license-section">
              <h3>📄 ${this.t('about_license', 'License')}</h3>
              <p><strong>${this.t('license_mit', 'MIT License')}</strong></p>
              <p>${this.t('copyright', '© 2025 Oliver Ernster')}</p>
            </div>
            
            <div class="development-section">
              <h3>👨‍💻 ${this.t('about_development', 'Development')}</h3>
              <p><strong>${this.t('dev_author', 'Author')}:</strong> ${this.t('author_name', 'Oliver Ernster')}</p>
              <p><strong>${this.t('dev_built_with', 'Built with')}:</strong> ${this.t('dev_built_with_value', 'Python, FastAPI, and Home Assistant')}</p>
            </div>
            
            <div class="support-section">
              <h3>🐛 ${this.t('about_support', 'Support')}</h3>
              <p>${this.t('support_text', 'For issues and feature requests, please contact the developer or check the project documentation.')}</p>
            </div>
            
            <div class="acknowledgments-section">
              <h3>🙏 ${this.t('about_acknowledgments', 'Acknowledgments')}</h3>
              <p>${this.t('acknowledgments_text', 'Thanks to the Home Assistant community and all open-source contributors who made this project possible.')}</p>
            </div>
          </div>
        `;
      }

      getCardSize() {
        return 4;
      }
    }

    if (!customElements.get('calendifier-help-card')) {
      customElements.define('calendifier-help-card', CalendifierHelpCard);
    }

    // Register the card
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'calendifier-help-card',
      name: 'ℹ️ Calendifier Help & About',
      description: 'Help documentation, about information, and theme controls'
    });

  }

  // Start initialization
  initHelpCard();
})();