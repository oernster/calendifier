/**
 * Main application initialization and coordination
 */

class CalendifierApp {
    constructor() {
        this.isLoading = true;
        this.settings = null;
        this.currentLocale = 'en_US';
        this.currentTheme = 'dark';
        
        this.initializeElements();
        this.bindGlobalEvents();
        this.initializeApp();
    }

    initializeElements() {
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.languageSelector = document.getElementById('language-selector');
        this.themeToggle = document.getElementById('theme-toggle');
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
    }

    bindGlobalEvents() {
        // Language selector
        this.languageSelector.addEventListener('change', (e) => {
            this.changeLocale(e.target.value);
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Settings button
        this.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });

        // Settings modal close
        const settingsCloseButtons = this.settingsModal.querySelectorAll('.modal-close');
        settingsCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideSettings();
            });
        });

        // Settings modal backdrop
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });

        // WebSocket events
        calendifierAPI.on('websocket:connected', () => {
            console.log('Real-time updates connected');
        });

        calendifierAPI.on('websocket:disconnected', () => {
            console.log('Real-time updates disconnected');
        });

        calendifierAPI.on('websocket:settings_updated', (data) => {
            this.handleSettingsUpdate(data);
        });

        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
        });
    }

    async initializeApp() {
        try {
            this.showLoading('Initializing Calendifier...');

            // Check API health
            await this.checkAPIHealth();

            // Load initial settings
            await this.loadSettings();

            // Apply initial theme and locale
            this.applyTheme(this.currentTheme);
            this.setLanguageSelector(this.currentLocale);

            // Connect WebSocket for real-time updates
            calendifierAPI.connectWebSocket();

            // Hide loading overlay
            this.hideLoading();

            console.log('Calendifier initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Calendifier:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async checkAPIHealth() {
        try {
            const health = await calendifierAPI.getHealth();
            if (health.status !== 'healthy') {
                throw new Error('API is not healthy');
            }
        } catch (error) {
            throw new Error('Cannot connect to Calendifier API');
        }
    }

    async loadSettings() {
        try {
            this.settings = await calendifierAPI.getSettings();
            this.currentLocale = this.settings.locale || 'en_US';
            this.currentTheme = this.settings.theme || 'dark';
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Use defaults
            this.currentLocale = 'en_US';
            this.currentTheme = 'dark';
        }
    }

    async changeLocale(newLocale) {
        if (newLocale === this.currentLocale) return;

        try {
            await calendifierAPI.updateSettings({ locale: newLocale });
            this.currentLocale = newLocale;
            
            // Reload the page to apply new locale
            // In a more sophisticated implementation, you would update all text dynamically
            window.location.reload();
            
        } catch (error) {
            console.error('Failed to change locale:', error);
            this.showError('Failed to change language');
            
            // Reset selector to current locale
            this.setLanguageSelector(this.currentLocale);
        }
    }

    async toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        
        try {
            await calendifierAPI.updateSettings({ theme: newTheme });
            this.currentTheme = newTheme;
            this.applyTheme(newTheme);
            
        } catch (error) {
            console.error('Failed to change theme:', error);
            this.showError('Failed to change theme');
        }
    }

    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        
        // Update theme toggle icon
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        
        this.currentTheme = theme;
    }

    setLanguageSelector(locale) {
        this.languageSelector.value = locale;
    }

    showSettings() {
        this.loadSettingsContent();
        this.settingsModal.style.display = 'block';
    }

    hideSettings() {
        this.settingsModal.style.display = 'none';
    }

    async loadSettingsContent() {
        const settingsContent = this.settingsModal.querySelector('.settings-content');
        
        try {
            const settings = await calendifierAPI.getSettings();
            const info = await calendifierAPI.getInfo();
            
            settingsContent.innerHTML = `
                <div class="settings-section">
                    <h4>🌍 Localization</h4>
                    <div class="setting-item">
                        <label>Language:</label>
                        <select id="settings-locale">
                            ${this.generateLocaleOptions(settings.locale)}
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Holiday Country:</label>
                        <select id="settings-holiday-country">
                            ${this.generateCountryOptions(settings.holiday_country)}
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>🎨 Appearance</h4>
                    <div class="setting-item">
                        <label>Theme:</label>
                        <select id="settings-theme">
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>📅 Calendar</h4>
                    <div class="setting-item">
                        <label>First Day of Week:</label>
                        <select id="settings-first-day">
                            <option value="0" ${settings.first_day_of_week === 0 ? 'selected' : ''}>Monday</option>
                            <option value="1" ${settings.first_day_of_week === 1 ? 'selected' : ''}>Tuesday</option>
                            <option value="2" ${settings.first_day_of_week === 2 ? 'selected' : ''}>Wednesday</option>
                            <option value="3" ${settings.first_day_of_week === 3 ? 'selected' : ''}>Thursday</option>
                            <option value="4" ${settings.first_day_of_week === 4 ? 'selected' : ''}>Friday</option>
                            <option value="5" ${settings.first_day_of_week === 5 ? 'selected' : ''}>Saturday</option>
                            <option value="6" ${settings.first_day_of_week === 6 ? 'selected' : ''}>Sunday</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="settings-week-numbers" ${settings.show_week_numbers ? 'checked' : ''}>
                            Show Week Numbers
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>🌐 Time Synchronization</h4>
                    <div class="setting-item">
                        <label>NTP Sync Interval (minutes):</label>
                        <input type="number" id="settings-ntp-interval" value="${settings.ntp_interval_minutes}" min="1" max="1440">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>ℹ️ Information</h4>
                    <div class="info-item">
                        <strong>Version:</strong> ${info.version}
                    </div>
                    <div class="info-item">
                        <strong>Current Locale:</strong> ${info.locale}
                    </div>
                    <div class="info-item">
                        <strong>Timezone:</strong> ${info.timezone}
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn-secondary" onclick="window.calendifierApp.hideSettings()">Cancel</button>
                    <button type="button" class="btn-primary" onclick="window.calendifierApp.saveSettings()">Save Settings</button>
                </div>
            `;
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            settingsContent.innerHTML = '<p>Failed to load settings</p>';
        }
    }

    generateLocaleOptions(currentLocale) {
        const locales = {
            'en_US': '🇺🇸 English (US)',
            'en_GB': '🇬🇧 English (UK)',
            'es_ES': '🇪🇸 Español',
            'fr_FR': '🇫🇷 Français',
            'de_DE': '🇩🇪 Deutsch',
            'it_IT': '🇮🇹 Italiano',
            'pt_BR': '🇧🇷 Português',
            'ru_RU': '🇷🇺 Русский',
            'zh_CN': '🇨🇳 简体中文',
            'zh_TW': '🇹🇼 繁體中文',
            'ja_JP': '🇯🇵 日本語',
            'ko_KR': '🇰🇷 한국어',
            'hi_IN': '🇮🇳 हिन्दी',
            'ar_SA': '🇸🇦 العربية'
        };
        
        return Object.entries(locales)
            .map(([code, name]) => `<option value="${code}" ${code === currentLocale ? 'selected' : ''}>${name}</option>`)
            .join('');
    }

    generateCountryOptions(currentCountry) {
        const countries = {
            'US': '🇺🇸 United States',
            'GB': '🇬🇧 United Kingdom',
            'ES': '🇪🇸 Spain',
            'FR': '🇫🇷 France',
            'DE': '🇩🇪 Germany',
            'IT': '🇮🇹 Italy',
            'BR': '🇧🇷 Brazil',
            'RU': '🇷🇺 Russia',
            'CN': '🇨🇳 China',
            'TW': '🇹🇼 Taiwan',
            'JP': '🇯🇵 Japan',
            'KR': '🇰🇷 South Korea',
            'IN': '🇮🇳 India',
            'SA': '🇸🇦 Saudi Arabia'
        };
        
        return Object.entries(countries)
            .map(([code, name]) => `<option value="${code}" ${code === currentCountry ? 'selected' : ''}>${name}</option>`)
            .join('');
    }

    async saveSettings() {
        try {
            const settingsData = {
                locale: document.getElementById('settings-locale').value,
                theme: document.getElementById('settings-theme').value,
                holiday_country: document.getElementById('settings-holiday-country').value,
                first_day_of_week: parseInt(document.getElementById('settings-first-day').value),
                show_week_numbers: document.getElementById('settings-week-numbers').checked,
                ntp_interval_minutes: parseInt(document.getElementById('settings-ntp-interval').value)
            };
            
            await calendifierAPI.updateSettings(settingsData);
            
            this.hideSettings();
            this.showSuccess('Settings saved successfully');
            
            // Reload if locale changed
            if (settingsData.locale !== this.currentLocale) {
                window.location.reload();
            }
            
            // Apply theme if changed
            if (settingsData.theme !== this.currentTheme) {
                this.applyTheme(settingsData.theme);
            }
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError('Failed to save settings');
        }
    }

    handleSettingsUpdate(data) {
        console.log('Settings updated via WebSocket:', data);
        // Handle real-time settings updates from other clients
    }

    showLoading(message = 'Loading...') {
        this.loadingOverlay.style.display = 'flex';
        const loadingText = this.loadingOverlay.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        this.isLoading = true;
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
        this.isLoading = false;
    }

    showSuccess(message) {
        console.log('Success:', message);
        // Could implement a toast notification system
    }

    showError(message) {
        console.error('Error:', message);
        alert(message); // Simple error display
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendifierApp = new CalendifierApp();
});