/**
 * Notes functionality for Calendifier
 */

class CalendifierNotes {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadNotes();
    }

    initializeElements() {
        this.notesList = document.getElementById('notes-list');
        this.addNoteBtn = document.getElementById('add-note-btn');
    }

    bindEvents() {
        this.addNoteBtn.addEventListener('click', () => {
            this.showNoteDialog();
        });

        // Listen for WebSocket updates
        calendifierAPI.on('websocket:note_created', () => this.loadNotes());
        calendifierAPI.on('websocket:note_updated', () => this.loadNotes());
        calendifierAPI.on('websocket:note_deleted', () => this.loadNotes());
    }

    async loadNotes() {
        try {
            // For now, we'll use local storage since the API doesn't have notes endpoints yet
            // In a full implementation, this would call calendifierAPI.getNotes()
            const savedNotes = localStorage.getItem('calendifier_notes');
            this.notes = savedNotes ? JSON.parse(savedNotes) : [];
            
            this.renderNotes();
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showError('Failed to load notes');
        }
    }

    renderNotes() {
        this.notesList.innerHTML = '';

        if (this.notes.length === 0) {
            const noNotesMessage = document.createElement('div');
            noNotesMessage.className = 'no-notes-message';
            noNotesMessage.textContent = 'No notes yet';
            noNotesMessage.style.textAlign = 'center';
            noNotesMessage.style.color = 'var(--text-muted)';
            noNotesMessage.style.padding = '1rem';
            noNotesMessage.style.fontStyle = 'italic';
            this.notesList.appendChild(noNotesMessage);
            return;
        }

        // Sort notes by updated date (most recent first)
        const sortedNotes = [...this.notes].sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
        );

        sortedNotes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            this.notesList.appendChild(noteElement);
        });
    }

    createNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.style.cssText = `
            padding: 0.75rem;
            background-color: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            margin-bottom: 0.5rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
        `;

        // Note title
        const titleElement = document.createElement('div');
        titleElement.className = 'note-title';
        titleElement.textContent = note.title || 'Untitled Note';
        titleElement.style.cssText = `
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
            font-size: 0.9rem;
        `;
        noteElement.appendChild(titleElement);

        // Note preview (first line of content)
        if (note.content) {
            const previewElement = document.createElement('div');
            previewElement.className = 'note-preview';
            const preview = note.content.split('\n')[0];
            previewElement.textContent = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
            previewElement.style.cssText = `
                color: var(--text-secondary);
                font-size: 0.8rem;
                margin-bottom: 0.25rem;
            `;
            noteElement.appendChild(previewElement);
        }

        // Note date
        const dateElement = document.createElement('div');
        dateElement.className = 'note-date';
        const date = new Date(note.updated_at);
        dateElement.textContent = this.formatDate(date);
        dateElement.style.cssText = `
            color: var(--text-muted);
            font-size: 0.7rem;
        `;
        noteElement.appendChild(dateElement);

        // Click handler
        noteElement.addEventListener('click', () => {
            this.showNoteDialog(note);
        });

        // Hover effect
        noteElement.addEventListener('mouseenter', () => {
            noteElement.style.backgroundColor = 'var(--bg-tertiary)';
        });

        noteElement.addEventListener('mouseleave', () => {
            noteElement.style.backgroundColor = 'var(--bg-primary)';
        });

        return noteElement;
    }

    showNoteDialog(note = null) {
        this.currentNote = note;
        
        // Create modal if it doesn't exist
        let noteModal = document.getElementById('note-modal');
        if (!noteModal) {
            noteModal = this.createNoteModal();
            document.body.appendChild(noteModal);
        }

        const titleInput = noteModal.querySelector('#note-title');
        const contentTextarea = noteModal.querySelector('#note-content');
        const modalTitle = noteModal.querySelector('.modal-title');
        const saveBtn = noteModal.querySelector('#save-note');
        const deleteBtn = noteModal.querySelector('#delete-note');

        if (note) {
            // Edit mode
            modalTitle.textContent = 'Edit Note';
            titleInput.value = note.title || '';
            contentTextarea.value = note.content || '';
            saveBtn.textContent = 'Update Note';
            deleteBtn.style.display = 'inline-block';
        } else {
            // Create mode
            modalTitle.textContent = 'New Note';
            titleInput.value = '';
            contentTextarea.value = '';
            saveBtn.textContent = 'Save Note';
            deleteBtn.style.display = 'none';
        }

        noteModal.style.display = 'block';
        titleInput.focus();
    }

    createNoteModal() {
        const modal = document.createElement('div');
        modal.id = 'note-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">New Note</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="note-form" class="note-form" style="padding: 1.5rem;">
                    <div class="form-group">
                        <label for="note-title">Title</label>
                        <input type="text" id="note-title" name="title" placeholder="Enter note title...">
                    </div>
                    <div class="form-group">
                        <label for="note-content">Content</label>
                        <textarea id="note-content" name="content" rows="10" placeholder="Write your note here..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="delete-note" class="btn-secondary" style="margin-right: auto; background-color: var(--danger-color); color: white; display: none;">Delete Note</button>
                        <button type="button" id="cancel-note" class="btn-secondary">Cancel</button>
                        <button type="submit" id="save-note" class="btn-primary">Save Note</button>
                    </div>
                </form>
            </div>
        `;

        // Bind events
        const form = modal.querySelector('#note-form');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancel-note');
        const deleteBtn = modal.querySelector('#delete-note');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });

        closeBtn.addEventListener('click', () => {
            this.hideNoteDialog();
        });

        cancelBtn.addEventListener('click', () => {
            this.hideNoteDialog();
        });

        deleteBtn.addEventListener('click', () => {
            this.deleteNote();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideNoteDialog();
            }
        });

        return modal;
    }

    hideNoteDialog() {
        const noteModal = document.getElementById('note-modal');
        if (noteModal) {
            noteModal.style.display = 'none';
        }
        this.currentNote = null;
    }

    async saveNote() {
        const noteModal = document.getElementById('note-modal');
        const titleInput = noteModal.querySelector('#note-title');
        const contentTextarea = noteModal.querySelector('#note-content');
        const saveBtn = noteModal.querySelector('#save-note');

        const title = titleInput.value.trim();
        const content = contentTextarea.value.trim();

        if (!title && !content) {
            this.showError('Please enter a title or content for the note');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const noteData = {
                title: title || 'Untitled Note',
                content: content,
                updated_at: new Date().toISOString()
            };

            if (this.currentNote) {
                // Update existing note
                noteData.id = this.currentNote.id;
                noteData.created_at = this.currentNote.created_at;
                
                const index = this.notes.findIndex(n => n.id === this.currentNote.id);
                if (index !== -1) {
                    this.notes[index] = noteData;
                }
            } else {
                // Create new note
                noteData.id = Date.now(); // Simple ID generation
                noteData.created_at = new Date().toISOString();
                this.notes.push(noteData);
            }

            // Save to localStorage (in a real implementation, this would call the API)
            localStorage.setItem('calendifier_notes', JSON.stringify(this.notes));

            this.hideNoteDialog();
            this.renderNotes();
            this.showSuccess(this.currentNote ? 'Note updated successfully' : 'Note created successfully');

        } catch (error) {
            console.error('Error saving note:', error);
            this.showError('Failed to save note');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = this.currentNote ? 'Update Note' : 'Save Note';
        }
    }

    async deleteNote() {
        if (!this.currentNote) return;

        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            const index = this.notes.findIndex(n => n.id === this.currentNote.id);
            if (index !== -1) {
                this.notes.splice(index, 1);
                localStorage.setItem('calendifier_notes', JSON.stringify(this.notes));
            }

            this.hideNoteDialog();
            this.renderNotes();
            this.showSuccess('Note deleted successfully');

        } catch (error) {
            console.error('Error deleting note:', error);
            this.showError('Failed to delete note');
        }
    }

    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    showSuccess(message) {
        console.log('Success:', message);
        // Could implement a toast notification system
    }

    showError(message) {
        console.error('Error:', message);
        alert(message);
    }
}

// Initialize notes when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendifierNotes = new CalendifierNotes();
});