/**
 * Calendifier Data Card - Enhanced with New Translation System
 * Provides data import/export and backup management functionality
 * Uses the new unified translation manager for reliable language support
 */

// Ensure base card is loaded first
(function() {
  function initDataCard() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initDataCard, 100);
      return;
    }

    class CalendifierDataCard extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.exportData = null;
        this.importResults = null;
        this.loading = false;
      }

      async setConfig(config) {
        super.setConfig(config);
        
        // Listen for locale changes
        document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
        
        this.render();
      }

      async exportEvents() {
        try {
          this.loading = true;
          this.render();
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/export/events`);
          if (response.ok) {
            const data = await response.json();
            this.downloadJSON(data, 'calendifier-events.json');
            this.showNotification(this.t('data.events_exported', 'Events exported successfully'), 'success');
          } else {
            this.showNotification(this.t('data.export_events_failed', 'Failed to export events'), 'error');
          }
        } catch (error) {
          console.error('Export error:', error);
          this.showNotification(this.t('data.export_network_error', 'Export failed: Network error'), 'error');
        }
        
        this.loading = false;
        this.render();
      }

      async exportNotes() {
        try {
          this.loading = true;
          this.render();
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/export/notes`);
          if (response.ok) {
            const data = await response.json();
            this.downloadJSON(data, 'calendifier-notes.json');
            this.showNotification(this.t('data.notes_exported', 'Notes exported successfully'), 'success');
          } else {
            this.showNotification(this.t('data.export_notes_failed', 'Failed to export notes'), 'error');
          }
        } catch (error) {
          console.error('Export error:', error);
          this.showNotification(this.t('data.export_network_error', 'Export failed: Network error'), 'error');
        }
        
        this.loading = false;
        this.render();
      }

      async exportAll() {
        try {
          this.loading = true;
          this.render();
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/export/all`);
          if (response.ok) {
            const data = await response.json();
            this.downloadJSON(data, 'calendifier-complete-backup.json');
            this.showNotification(this.t('data.backup_exported', 'Complete backup exported successfully'), 'success');
          } else {
            this.showNotification(this.t('data.export_backup_failed', 'Failed to export complete backup'), 'error');
          }
        } catch (error) {
          console.error('Export error:', error);
          this.showNotification(this.t('data.export_network_error', 'Export failed: Network error'), 'error');
        }
        
        this.loading = false;
        this.render();
      }

      downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      triggerFileInput(type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this.handleFileImport(e, type);
        input.click();
      }

      async handleFileImport(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        try {
          this.loading = true;
          this.render();

          const text = await file.text();
          const data = JSON.parse(text);
          
          let endpoint;
          switch (type) {
            case 'events':
              endpoint = `${this.getApiBaseUrl()}/api/v1/import/events`;
              break;
            case 'notes':
              endpoint = `${this.getApiBaseUrl()}/api/v1/import/notes`;
              break;
            case 'all':
              endpoint = `${this.getApiBaseUrl()}/api/v1/import/all`;
              break;
            default:
              throw new Error('Invalid import type');
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
          });

          if (response.ok) {
            const result = await response.json();
            this.importResults = result;
            this.showImportResults(result, type);
          } else {
            const error = await response.json();
            this.showNotification(`${this.t('data.import_failed', 'Import failed')}: ${error.detail}`, 'error');
          }
        } catch (error) {
          console.error('Import error:', error);
          this.showNotification(this.t('data.import_invalid_format', 'Import failed: Invalid file format'), 'error');
        }

        this.loading = false;
        this.render();
      }

      showImportResults(result, type) {
        let message = '';
        if (type === 'all') {
          const events = result.import_results?.events || {};
          const notes = result.import_results?.notes || {};
          message = `${this.t('data.import_complete', 'Import complete')}! ${this.t('events', 'Events')}: ${events.imported_count || 0} ${this.t('data.imported', 'imported')}, ${events.skipped_count || 0} ${this.t('data.skipped', 'skipped')}. ${this.t('notes', 'Notes')}: ${notes.imported_count || 0} ${this.t('data.imported', 'imported')}, ${notes.skipped_count || 0} ${this.t('data.skipped', 'skipped')}.`;
        } else {
          message = `${this.t('data.import_complete', 'Import complete')}! ${result.imported_count || 0} ${this.t('data.items_imported', 'items imported')}, ${result.skipped_count || 0} ${this.t('data.skipped', 'skipped')}.`;
        }
        this.showNotification(message, 'success');
      }

      async clearData(type) {
        let confirmMessage = '';
        if (type === 'events') {
          confirmMessage = this.t('confirm_delete_events', 'Are you sure you want to delete all events? This cannot be undone!');
        } else if (type === 'notes') {
          confirmMessage = this.t('confirm_delete_notes', 'Are you sure you want to delete all notes? This cannot be undone!');
        } else {
          confirmMessage = this.t('confirm_delete_all', 'Are you sure you want to delete all data? This cannot be undone!');
        }
        
        if (!confirm(confirmMessage)) {
          return;
        }

        try {
          this.loading = true;
          this.render();

          let endpoint;
          switch (type) {
            case 'events':
              endpoint = `${this.getApiBaseUrl()}/api/v1/clear/events`;
              break;
            case 'notes':
              endpoint = `${this.getApiBaseUrl()}/api/v1/clear/notes`;
              break;
            case 'all':
              endpoint = `${this.getApiBaseUrl()}/api/v1/clear/all`;
              break;
            default:
              throw new Error('Invalid clear type');
          }

          const response = await fetch(endpoint, {
            method: 'DELETE'
          });

          if (response.ok) {
            const result = await response.json();
            this.showNotification(result.message, 'success');
          } else {
            const error = await response.json();
            this.showNotification(`${this.t('data.clear_failed', 'Clear failed')}: ${error.detail}`, 'error');
          }
        } catch (error) {
          console.error('Clear error:', error);
          this.showNotification(this.t('data.clear_network_error', 'Clear failed: Network error'), 'error');
        }

        this.loading = false;
        this.render();
      }

      async changeLocale(newLocale) {
        try {
          if (window.calendifierTranslationManager) {
            const success = await window.calendifierTranslationManager.setLocale(newLocale);
            if (success) {
              this.showNotification(this.t('locale.changed', 'Language changed successfully'), 'success');
              // Update the selector to show current locale
              setTimeout(() => {
                const selector = this.shadowRoot.querySelector('#localeSelect');
                if (selector) {
                  selector.value = newLocale;
                }
              }, 100);
            } else {
              this.showNotification(this.t('locale.change_failed', 'Failed to change language'), 'error');
            }
          }
        } catch (error) {
          console.error('Error changing locale:', error);
          this.showNotification(this.t('locale.change_error', 'Error changing language'), 'error');
        }
      }

      getCurrentLocale() {
        if (window.calendifierTranslationManager) {
          return window.calendifierTranslationManager.currentLocale;
        }
        return 'en_US';
      }

      renderLocaleOptions() {
        const currentLocale = this.getCurrentLocale();
        const locales = [
          { code: 'en_US', name: '🇺🇸 English (US)' },
          { code: 'en_GB', name: '🇬🇧 English (UK)' },
          { code: 'de_DE', name: '🇩🇪 Deutsch' },
          { code: 'es_ES', name: '🇪🇸 Español' },
          { code: 'fr_FR', name: '🇫🇷 Français' },
          { code: 'it_IT', name: '🇮🇹 Italiano' },
          { code: 'ja_JP', name: '🇯🇵 日本語' },
          { code: 'ko_KR', name: '🇰🇷 한국어' },
          { code: 'zh_CN', name: '🇨🇳 中文 (简体)' },
          { code: 'zh_TW', name: '🇹🇼 中文 (繁體)' },
          { code: 'pt_BR', name: '🇧🇷 Português' },
          { code: 'ru_RU', name: '🇷🇺 Русский' },
          { code: 'hi_IN', name: '🇮🇳 हिन्दी' },
          { code: 'ar_SA', name: '🇸🇦 العربية' }
        ];

        return locales.map(locale =>
          `<option value="${locale.code}" ${locale.code === currentLocale ? 'selected' : ''}>${locale.name}</option>`
        ).join('');
      }

      render() {
        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            .section {
              margin-bottom: 24px;
              padding: 16px;
              background: var(--secondary-background-color);
              border-radius: 8px;
            }
            
            .section-title {
              font-size: 1.1em;
              font-weight: bold;
              color: var(--primary-color);
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .section-description {
              font-size: 0.9em;
              color: var(--secondary-text-color);
              margin-bottom: 16px;
              line-height: 1.4;
            }
            
            .button-group {
              display: flex;
              gap: 6px;
              flex-wrap: wrap;
            }
            
            .action-button {
              font-size: 0.85em;
              padding: 8px 12px;
              min-width: auto;
              flex: 1;
              max-width: 140px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              text-align: center;
            }
            
            .action-button.secondary {
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              border: 1px solid var(--divider-color);
            }
            
            .action-button.secondary:hover {
              background: var(--divider-color);
            }
            
            .action-button.danger {
              background: #f44336;
            }
            
            .action-button.danger:hover {
              background: #d32f2f;
            }
            
            .loading-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: var(--card-border-radius, 12px);
              z-index: 100;
            }
            
            .loading-content {
              background: var(--card-background-color);
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              color: var(--primary-text-color);
            }
            
            .loading-spinner {
              font-size: 2em;
              margin-bottom: 8px;
              animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            
            .warning-text {
              font-size: 0.8em;
              color: #ff9800;
              font-style: italic;
              margin-top: 8px;
            }
            
            /* Increase all emoji sizes by 130% */
            .card-header,
            .section-title,
            .action-button,
            .loading-spinner {
              font-size: 1.3em;
            }
            
            /* Specific adjustments for smaller elements */
            .section-title {
              font-size: 1.43em; /* 1.1em * 1.3 */
            }
            
            .section-description {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
            
            .warning-text {
              font-size: 1.04em; /* 0.8em * 1.3 */
            }
            
            .loading-spinner {
              font-size: 2.6em; /* 2em * 1.3 */
            }
          </style>
          
          <div class="notification"></div>
          
          ${this.loading ? `
            <div class="loading-overlay">
              <div class="loading-content">
                <div class="loading-spinner">⏳</div>
                <div>${this.t('processing', 'Processing...')}</div>
              </div>
            </div>
          ` : ''}
          
          <div class="card-header">
            ⚙️ ${this.t('settings', 'Settings')}
          </div>
          
          <div class="section">
            <div class="section-title">
              📤 ${this.t('export', 'Export')}
            </div>
            <div class="button-group">
              <button class="action-button" onclick="this.getRootNode().host.exportEvents()" ${this.loading ? 'disabled' : ''}>
                📋 ${this.t('export', 'Export')} ${this.t('events', 'Events')}
              </button>
              <button class="action-button" onclick="this.getRootNode().host.exportNotes()" ${this.loading ? 'disabled' : ''}>
                📝 ${this.t('export', 'Export')} ${this.t('notes', 'Notes')}
              </button>
              <button class="action-button" onclick="this.getRootNode().host.exportAll()" ${this.loading ? 'disabled' : ''}>
                💾 ${this.t('export', 'Export')} ${this.t('save', 'Backup')}
              </button>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">
              📥 ${this.t('import', 'Import')}
            </div>
            <div class="button-group">
              <button class="action-button secondary" onclick="this.getRootNode().host.triggerFileInput('events')" ${this.loading ? 'disabled' : ''}>
                📋 ${this.t('import', 'Import')} ${this.t('events', 'Events')}
              </button>
              <button class="action-button secondary" onclick="this.getRootNode().host.triggerFileInput('notes')" ${this.loading ? 'disabled' : ''}>
                📝 ${this.t('import', 'Import')} ${this.t('notes', 'Notes')}
              </button>
              <button class="action-button secondary" onclick="this.getRootNode().host.triggerFileInput('all')" ${this.loading ? 'disabled' : ''}>
                💾 ${this.t('import', 'Import')} ${this.t('save', 'Backup')}
              </button>
            </div>
            <div class="warning-text">
              ⚠️ ${this.t('import_warning', 'Import will add to existing data. Duplicates will be skipped.')}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">
              🗑️ ${this.t('delete', 'Delete')}
            </div>
            <div class="button-group">
              <button class="action-button danger" onclick="this.getRootNode().host.clearData('events')" ${this.loading ? 'disabled' : ''}>
                🗑️ ${this.t('delete', 'Delete')} ${this.t('events', 'Events')}
              </button>
              <button class="action-button danger" onclick="this.getRootNode().host.clearData('notes')" ${this.loading ? 'disabled' : ''}>
                🗑️ ${this.t('delete', 'Delete')} ${this.t('notes', 'Notes')}
              </button>
              <button class="action-button danger" onclick="this.getRootNode().host.clearData('all')" ${this.loading ? 'disabled' : ''}>
                💥 ${this.t('delete', 'Delete')}
              </button>
            </div>
            <div class="warning-text">
              ⚠️ ${this.t('delete_warning', 'This action cannot be undone! Export your data first.')}
            </div>
          </div>
          
        `;
      }

      getCardSize() {
        return 4;
      }
    }

    if (!customElements.get('calendifier-data-card')) {
      customElements.define('calendifier-data-card', CalendifierDataCard);
    }

    // Register the card
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'calendifier-data-card',
      name: '📤📥 Calendifier Data Management',
      description: 'Import and export calendar data, create backups'
    });

  }

  // Start initialization
  initDataCard();
})();