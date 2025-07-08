/**
 * Calendifier Notes Card - Enhanced with New Translation System
 * Provides notes management with categories and multiple view modes
 * Uses the new unified translation manager for reliable language support
 */

// Ensure base card is loaded first
(function() {
  function initNotesCard() {
    if (!window.CalendifierBaseCard) {
      setTimeout(initNotesCard, 100);
      return;
    }

    class CalendifierNotesCard extends window.CalendifierBaseCard {
      constructor() {
        super();
        this.notes = [];
        this.categories = {};
        this.selectedCategory = 'all';
        this.viewMode = 'list';
        this.loading = true;
        this.maxNotes = 8;
        this.showCategories = true;
      }

      async setConfig(config) {
        super.setConfig(config);
        
        this.maxNotes = config.max_notes || 8;
        this.showCategories = config.show_categories !== false;
        
        // Load initial data
        await this.loadInitialData();
        
        // Listen for locale changes
        document.addEventListener('calendifier-locale-changed', this.handleLocaleChange.bind(this));
        
        this.render();
      }

      async loadInitialData() {
        try {
          this.loading = true;
          this.render();
          
          await this.loadNotes();
          
          this.loading = false;
          this.render();
        } catch (error) {
          console.error('[NotesCard] Failed to load initial data:', error);
          this.loading = false;
          this.render();
        }
      }

      async loadNotes() {
        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/notes`);
          if (response.ok) {
            const data = await response.json();
            this.notes = data.notes || [];
            
            // Calculate categories
            this.categories = {};
            this.notes.forEach(note => {
              const category = note.category || 'general';
              this.categories[category] = (this.categories[category] || 0) + 1;
            });
          } else {
            this.notes = [];
            this.categories = {};
          }
        } catch (error) {
          console.error('Error loading notes:', error);
          this.notes = [];
          this.categories = {};
        }
      }

      async createNote(noteData) {
        try {
          console.log('Creating note with data:', noteData); // Debug log
          
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/notes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(noteData)
          });
          
          if (response.ok) {
            this.showNotification(this.t('note.created_success', 'Note created successfully'), 'success');
            await this.loadNotes();
            this.render();
            return true;
          } else {
            const errorText = await response.text();
            console.error('Server error creating note:', response.status, errorText);
            this.showNotification(`${this.t('note.create_failed', 'Failed to create note')} (${response.status})`, 'error');
            return false;
          }
        } catch (error) {
          console.error('Error creating note:', error);
          this.showNotification(this.t('note.network_error_create', 'Network error creating note'), 'error');
          return false;
        }
      }

      async deleteNote(noteId) {
        if (!confirm(this.t('are_you_sure_you_want_to_delete_this_note', 'Are you sure you want to delete this note?'))) {
          return;
        }

        try {
          const response = await fetch(`${this.getApiBaseUrl()}/api/v1/notes/${noteId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            this.showNotification(this.t('note.deleted_success', 'Note deleted successfully'), 'success');
            await this.loadNotes();
            this.render();
          } else {
            this.showNotification(this.t('note.delete_failed', 'Failed to delete note'), 'error');
          }
        } catch (error) {
          console.error('Error deleting note:', error);
          this.showNotification(this.t('note.network_error_delete', 'Network error deleting note'), 'error');
        }
      }

      setViewMode(mode) {
        this.viewMode = mode;
        this.render();
      }

      filterByCategory(category) {
        this.selectedCategory = category;
        this.render();
      }

      getCategoryDisplayName(category) {
        const categoryTranslations = {
          'general': this.t('general', 'General'),
          'work': this.t('category_work', 'Work'),
          'personal': this.t('category_personal', 'Personal'),
          'meeting': this.t('category_meeting', 'Meeting'),
          'meal': this.t('category_meal', 'Meal'),
          'travel': this.t('category_travel', 'Travel'),
          'health': this.t('category_health', 'Health'),
          'education': this.t('category_education', 'Education'),
          'celebration': this.t('category_celebration', 'Celebration'),
          'reminder': this.t('category_reminder', 'Reminder'),
          'holiday': this.t('category_holiday', 'Holiday'),
          'important': this.t('category_important', 'Important'),
          'ideas': this.t('category_ideas', 'Ideas'),
          'todo': this.t('category_todo', 'Todo'),
          'reminders': this.t('category_reminders', 'Reminders'),
          'quotes': this.t('category_quotes', 'Quotes'),
          'recipes': this.t('category_recipes', 'Recipes'),
          'books': this.t('category_books', 'Books'),
          'links': this.t('category_links', 'Links'),
          'drafts': this.t('category_drafts', 'Drafts')
        };
        
        return categoryTranslations[category] || category.charAt(0).toUpperCase() + category.slice(1);
      }


      toggleQuickAdd() {
        const form = this.shadowRoot.querySelector('#quickAddForm');
        const isVisible = form.classList.contains('show');
        
        if (isVisible) {
          form.classList.remove('show');
          this.clearQuickAddForm();
        } else {
          form.classList.add('show');
        }
      }

      async saveQuickAdd() {
        const title = this.shadowRoot.querySelector('#noteTitle').value.trim();
        const category = this.shadowRoot.querySelector('#noteCategory').value;
        const content = this.shadowRoot.querySelector('#noteContent').value.trim();

        console.log('Note data:', { title, category, content }); // Debug log

        if (!title) {
          this.showNotification(`${this.t('error', 'Error')}: ${this.t('note.missing_title', 'Title is required')}`, 'error');
          return;
        }

        if (!content) {
          this.showNotification(`${this.t('error', 'Error')}: ${this.t('note.missing_description', 'Description is required')}`, 'error');
          return;
        }

        const noteData = {
          title: title,
          content: content,
          category: category,
          date: (() => {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          })()
        };

        const success = await this.createNote(noteData);
        if (success) {
          this.toggleQuickAdd();
        }
      }

      cancelQuickAdd() {
        this.toggleQuickAdd();
      }

      clearQuickAddForm() {
        this.shadowRoot.querySelector('#noteTitle').value = '';
        this.shadowRoot.querySelector('#noteCategory').value = 'general';
        this.shadowRoot.querySelector('#noteContent').value = '';
      }

      render() {
        if (this.loading) {
          this.shadowRoot.innerHTML = `
            <style>${this.getCommonStyles()}</style>
            ${this.renderLoadingState(this.t('loading', 'Loading notes...'))}
          `;
          return;
        }

        const categoryEmojis = {
          all: '📝',
          general: '📝',
          important: '⭐',
          ideas: '💡',
          todo: '✅',
          reminders: '🔔',
          quotes: '💬',
          recipes: '🍳',
          books: '📚',
          links: '🔗',
          drafts: '📄'
        };

        this.shadowRoot.innerHTML = `
          <style>
            ${this.getCommonStyles()}
            
            
            .view-toggle {
              display: flex;
              background: var(--secondary-background-color);
              border-radius: 6px;
              overflow: hidden;
            }
            
            .view-button {
              background: none;
              border: none;
              padding: 6px 12px;
              color: var(--secondary-text-color);
              cursor: pointer;
              font-size: 0.8em;
              transition: all 0.2s;
            }
            
            .view-button.active {
              background: var(--primary-color);
              color: white;
            }
            
            .view-button:hover:not(.active) {
              background: var(--divider-color);
              color: var(--primary-text-color);
            }
            
            .category-filter {
              display: flex;
              gap: 8px;
              margin-bottom: 16px;
              flex-wrap: wrap;
            }
            
            .category-chip {
              background: var(--secondary-background-color);
              border: 1px solid var(--divider-color);
              border-radius: 16px;
              padding: 4px 12px;
              font-size: 0.8em;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            
            .category-chip.active {
              background: var(--primary-color);
              color: white;
              border-color: var(--primary-color);
            }
            
            .category-chip:hover:not(.active) {
              background: var(--divider-color);
            }
            
            .category-count {
              background: rgba(255,255,255,0.2);
              border-radius: 8px;
              padding: 1px 6px;
              font-size: 0.7em;
              font-weight: bold;
            }
            
            .notes-container {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            
            .notes-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 12px;
            }
            
            .note-item {
              background: var(--secondary-background-color);
              border-radius: 8px;
              padding: 16px;
              border-left: 4px solid var(--primary-color);
              transition: transform 0.2s, box-shadow 0.2s;
              cursor: pointer;
              position: relative;
            }
            
            .note-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .note-item.general { border-left-color: #0078d4; }
            .note-item.important { border-left-color: #ff6b35; }
            .note-item.ideas { border-left-color: #9c27b0; }
            .note-item.todo { border-left-color: #2196f3; }
            .note-item.reminders { border-left-color: #ff9800; }
            .note-item.quotes { border-left-color: #4caf50; }
            .note-item.recipes { border-left-color: #795548; }
            .note-item.books { border-left-color: #607d8b; }
            .note-item.links { border-left-color: #00bcd4; }
            .note-item.drafts { border-left-color: #8bc34a; }
            
            .note-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
            }
            
            .note-title {
              font-weight: bold;
              color: var(--primary-text-color);
              font-size: 1.1em;
              display: flex;
              align-items: center;
              gap: 8px;
              flex: 1;
            }
            
            .note-actions {
              display: flex;
              gap: 4px;
              opacity: 0;
              transition: opacity 0.2s;
            }
            
            .note-item:hover .note-actions {
              opacity: 1;
            }
            
            .note-action {
              background: none;
              border: none;
              color: var(--secondary-text-color);
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              font-size: 0.9em;
              transition: all 0.2s;
            }
            
            .note-action:hover {
              background: var(--divider-color);
              color: var(--primary-text-color);
            }
            
            .note-content {
              color: var(--primary-text-color);
              line-height: 1.5;
              margin-bottom: 12px;
              font-size: 0.95em;
            }
            
            .note-content.preview {
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            
            .note-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 0.8em;
              color: var(--secondary-text-color);
            }
            
            .note-category {
              background: var(--primary-color);
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 0.7em;
              text-transform: uppercase;
              font-weight: bold;
            }
            
            .note-category.general { background: #0078d4; }
            .note-category.important { background: #ff6b35; }
            .note-category.ideas { background: #9c27b0; }
            .note-category.todo { background: #2196f3; }
            .note-category.reminders { background: #ff9800; }
            .note-category.quotes { background: #4caf50; }
            .note-category.recipes { background: #795548; }
            .note-category.books { background: #607d8b; }
            .note-category.links { background: #00bcd4; }
            .note-category.drafts { background: #8bc34a; }
            
            .note-date {
              font-style: italic;
            }
            
            .no-notes {
              text-align: center;
              color: var(--secondary-text-color);
              padding: 24px;
              font-style: italic;
            }
            
            .no-notes-emoji {
              font-size: 2em;
              margin-bottom: 8px;
            }
            
            .add-note-section {
              background: var(--secondary-background-color);
              border-radius: 8px;
              padding: 16px;
              text-align: center;
              border: 2px dashed var(--divider-color);
              margin-top: 16px;
            }
            
            .add-note-button {
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 12px 24px;
              font-size: 1em;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin: 0 auto;
              width: 100%;
              max-width: 200px;
              transition: background 0.2s;
            }
            
            .add-note-button:hover {
              background: var(--primary-color-dark);
            }
            
            .quick-add-form {
              display: none;
              margin-top: 12px;
              text-align: left;
            }
            
            .quick-add-form.show {
              display: block;
            }
            
            .form-row {
              display: flex;
              gap: 8px;
              margin-bottom: 8px;
            }
            
            .form-input {
              flex: 1;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
            }
            
            .form-textarea {
              width: 100%;
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
              resize: vertical;
              min-height: 80px;
              font-family: inherit;
            }
            
            .form-select {
              padding: 8px;
              border: 1px solid var(--divider-color);
              border-radius: 4px;
              background: var(--card-background-color);
              color: var(--primary-text-color);
              font-size: 0.9em;
              min-width: 120px;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            .form-actions {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
              margin-top: 12px;
            }
            
            .form-button {
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.9em;
              transition: background 0.2s;
            }
            
            .form-button.primary {
              background: var(--primary-color);
              color: white;
            }
            
            .form-button.primary:hover {
              background: var(--primary-color-dark);
            }
            
            .form-button.secondary {
              background: var(--secondary-background-color);
              color: var(--primary-text-color);
              border: 1px solid var(--divider-color);
            }
            
            /* Increase all emoji sizes by 130% */
            .card-header span,
            .view-button,
            .category-chip,
            .note-title,
            .note-action,
            .add-note-button,
            .form-button,
            input::placeholder,
            textarea::placeholder,
            select option {
              font-size: 1.3em;
            }
            
            /* Specific emoji sizing adjustments */
            .no-notes-emoji {
              font-size: 2.6em; /* Already updated above */
            }
            
            .view-button {
              font-size: 1.04em; /* 0.8em * 1.3 */
            }
            
            .category-chip {
              font-size: 1.04em; /* 0.8em * 1.3 */
            }
            
            .note-title {
              font-size: 1.43em; /* 1.1em * 1.3 */
            }
            
            .note-action {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
            
            .form-input::placeholder,
            .form-textarea::placeholder {
              font-size: 1.17em; /* 0.9em * 1.3 */
            }
          </style>
          
          <div class="notification"></div>
          
          <div class="card-header">
            📝 ${this.t('notes', 'Notes')} (${this.notes.length})
          </div>
          
          ${this.showCategories ? this.renderCategoryFilter() : ''}
          
          ${this.renderNotes()}
          
          ${this.renderAddNoteSection()}
        `;
      }

      renderCategoryFilter() {
        const categoryEmojis = {
          all: '📝',
          general: '📝',
          important: '⭐',
          ideas: '💡',
          todo: '✅',
          reminders: '🔔',
          quotes: '💬',
          recipes: '🍳',
          books: '📚',
          links: '🔗',
          drafts: '📄'
        };

        const allCategories = { all: this.notes.length, ...this.categories };

        return `
          <div class="category-filter">
            ${Object.entries(allCategories).map(([category, count]) => `
              <div class="category-chip ${this.selectedCategory === category ? 'active' : ''}"
                   onclick="this.getRootNode().host.filterByCategory('${category}')">
                <span>${categoryEmojis[category] || '📝'}</span>
                <span>${category === 'all' ? this.t('all', 'All') : this.getCategoryDisplayName(category)}</span>
                <span class="category-count">${count}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      renderNotes() {
        const filteredNotes = this.selectedCategory === 'all' ? 
          this.notes : 
          this.notes.filter(note => note.category === this.selectedCategory);

        if (filteredNotes.length === 0) {
          return `
            <div class="no-notes">
              <div class="no-notes-emoji">📝</div>
              <div>${this.t('note.no_notes', 'No notes found')}</div>
              ${this.selectedCategory !== 'all' ?
                `<div style="margin-top: 8px; font-size: 0.8em;">${this.t('note.no_notes_category', 'No notes in "{category}" category').replace('{category}', this.selectedCategory)}</div>` :
                ''
              }
            </div>
          `;
        }

        const containerClass = this.viewMode === 'grid' ? 'notes-grid' : 'notes-container';
        const displayNotes = filteredNotes.slice(0, this.maxNotes);

        return `
          <div class="${containerClass}">
            ${displayNotes.map(note => this.renderNoteItem(note)).join('')}
          </div>
        `;
      }

      renderNoteItem(note) {
        const categoryEmojis = {
          general: '📝',
          important: '⭐',
          ideas: '💡',
          todo: '✅',
          reminders: '🔔',
          quotes: '💬',
          recipes: '🍳',
          books: '📚',
          links: '🔗',
          drafts: '📄'
        };

        const noteDate = note.date || note.created_at;
        const displayDate = noteDate ? new Date(noteDate).toLocaleDateString() : '';

        return `
          <div class="note-item ${note.category || 'general'}">
            <div class="note-header">
              <div class="note-title">
                <span>${categoryEmojis[note.category || 'general'] || '📝'}</span>
                ${note.title}
              </div>
              <div class="note-actions">
                <button class="note-action" onclick="event.stopPropagation(); this.getRootNode().host.deleteNote(${note.id || 0})" title="Delete Note">🗑️</button>
              </div>
            </div>
            
            <div class="note-content preview">${note.content}</div>
            
            <div class="note-meta">
              <span class="note-category ${note.category || 'general'}">${this.getCategoryDisplayName(note.category || 'general')}</span>
              <span class="note-date">${displayDate}</span>
            </div>
          </div>
        `;
      }

      renderAddNoteSection() {
        return `
          <div class="add-note-section">
            <button class="add-note-button" onclick="this.getRootNode().host.toggleQuickAdd()">
              ➕ ${this.t('add', 'Add')} ${this.t('note', 'Note')}
            </button>
            
            <div class="quick-add-form" id="quickAddForm">
              <div class="form-row">
                <input type="text" class="form-input" id="noteTitle" placeholder="📝 ${this.t('title', 'Title')}..." />
              </div>
              <div class="form-row">
                <select class="form-select" id="noteCategory">
                  <option value="general">📝 ${this.t('general', 'General')}</option>
                  <option value="important">⭐ ${this.t('category_important', 'Important')}</option>
                  <option value="ideas">💡 ${this.t('category_ideas', 'Ideas')}</option>
                  <option value="todo">✅ ${this.t('category_todo', 'Todo')}</option>
                  <option value="reminders">🔔 ${this.t('category_reminders', 'Reminders')}</option>
                  <option value="quotes">💬 ${this.t('category_quotes', 'Quotes')}</option>
                  <option value="recipes">🍳 ${this.t('category_recipes', 'Recipes')}</option>
                  <option value="books">📚 ${this.t('category_books', 'Books')}</option>
                  <option value="links">🔗 ${this.t('category_links', 'Links')}</option>
                  <option value="drafts">📄 ${this.t('category_drafts', 'Drafts')}</option>
                </select>
              </div>
              <div class="form-row">
                <textarea class="form-textarea" id="noteContent" placeholder="📄 ${this.t('description', 'Description')}..."></textarea>
              </div>
              <div class="form-actions">
                <button class="form-button secondary" onclick="this.getRootNode().host.cancelQuickAdd()">❌ ${this.t('cancel', 'Cancel')}</button>
                <button class="form-button primary" onclick="this.getRootNode().host.saveQuickAdd()">💾 ${this.t('save', 'Save')}</button>
              </div>
            </div>
          </div>
        `;
      }

      getCardSize() {
        return this.viewMode === 'grid' ? 6 : 5;
      }
    }

    if (!customElements.get('calendifier-notes-card')) {
      customElements.define('calendifier-notes-card', CalendifierNotesCard);
    }

    // Register the card
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: 'calendifier-notes-card',
      name: '📝 Calendifier Notes',
      description: 'Notes management with categories and multiple view modes'
    });

  }

  // Start initialization
  initNotesCard();
})();