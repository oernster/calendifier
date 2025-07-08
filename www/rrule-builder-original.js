/**
 * 🔄 RRULE Builder for Home Assistant
 * Advanced recurring event pattern builder with RFC 5545 RRULE support
 */

class RRuleBuilder extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Initialize state
        this.rrule = '';
        this.startDate = new Date();
        this.translations = {};
        
        // Bind methods
        this.updatePreview = this.updatePreview.bind(this);
        this.buildRRule = this.buildRRule.bind(this);
        this.onFrequencyChange = this.onFrequencyChange.bind(this);
        
        // Initialize component
        this.render();
        this.setupEventListeners();
        this.loadTranslations();
    }
    
    static get observedAttributes() {
        return ['rrule', 'start-date', 'locale'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        console.log('[RRuleBuilder] attributeChangedCallback:', name, oldValue, '->', newValue);
        
        switch (name) {
            case 'rrule':
                this.rrule = newValue || '';
                // Use a timeout to ensure shadow DOM is ready
                setTimeout(() => {
                    this.loadRRule();
                }, 10);
                break;
            case 'start-date':
                this.startDate = newValue ? new Date(newValue + 'T00:00:00Z') : new Date();
                setTimeout(() => {
                    this.updatePreview();
                }, 10);
                break;
            case 'locale':
                this.loadTranslations();
                break;
        }
    }
    
    get value() {
        return this.buildRRule();
    }
    
    set value(rrule) {
        this.setAttribute('rrule', rrule || '');
    }
    
    // Additional methods for better integration
    getRRule() {
        return this.buildRRule();
    }
    
    setRRule(rrule, startDate = null) {
        console.log('[RRuleBuilder] setRRule called with:', rrule, startDate);
        
        if (startDate) {
            // Parse date safely to avoid timezone issues
            this.startDate = new Date(startDate + 'T00:00:00Z');
            this.setAttribute('start-date', startDate);
        }
        
        this.rrule = rrule || '';
        this.setAttribute('rrule', this.rrule);
        
        // Use a small timeout to ensure the shadow DOM is ready
        setTimeout(() => {
            this.loadRRule();
            this.updatePreview();
        }, 10);
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
                    --primary-color: var(--primary-color, #03a9f4);
                    --border-color: var(--divider-color, #e0e0e0);
                    --text-color: var(--primary-text-color, #212121);
                    --secondary-text-color: var(--secondary-text-color, #757575);
                    --background-color: var(--card-background-color, #ffffff);
                }
                
                .rrule-builder {
                    background: var(--background-color);
                    border-radius: 8px;
                    padding: 12px;
                    border: 1px solid var(--border-color);
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr;
                    gap: 12px;
                    max-width: 100%;
                    min-width: 600px;
                }
                
                .section {
                    margin-bottom: 0;
                    padding: 8px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--card-background-color, #ffffff);
                }
                
                .preset-buttons {
                    grid-column: 1 / -1;
                    margin-bottom: 8px;
                }
                
                .frequency-section {
                    grid-column: 1 / 3;
                }
                
                .interval-section {
                    grid-column: 3 / 5;
                }
                
                .weekdays-section {
                    grid-column: 1 / 3;
                }
                
                .monthly-section {
                    grid-column: 1 / 3;
                }
                
                .end-section {
                    grid-column: 3 / 5;
                }
                
                .preview-section {
                    grid-column: 1 / -1;
                    max-height: 120px;
                }
                
                @media (max-width: 768px) {
                    .rrule-builder {
                        grid-template-columns: 1fr 1fr;
                        min-width: 400px;
                    }
                    
                    .frequency-section,
                    .interval-section,
                    .weekdays-section,
                    .monthly-section,
                    .end-section {
                        grid-column: span 1;
                    }
                }
                
                @media (max-width: 480px) {
                    .rrule-builder {
                        grid-template-columns: 1fr;
                        min-width: 300px;
                    }
                    
                    .frequency-section,
                    .interval-section,
                    .weekdays-section,
                    .monthly-section,
                    .end-section {
                        grid-column: 1;
                    }
                }
                
                .section-title {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: var(--text-color);
                    font-size: 14px;
                }
                
                .form-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                }
                
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .radio-group {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                
                .checkbox-group {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                
                input[type="radio"], input[type="checkbox"] {
                    margin-right: 4px;
                }
                
                input[type="number"], input[type="date"], select {
                    padding: 4px 8px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 14px;
                    background: var(--background-color);
                    color: var(--text-color);
                }
                
                input[type="number"] {
                    width: 60px;
                }
                
                input[type="date"] {
                    width: 140px;
                }
                
                select {
                    min-width: 100px;
                }
                
                .preview-section {
                    background: var(--secondary-background-color, #f8f9fa);
                    border-radius: 4px;
                    padding: 12px;
                    margin-top: 0;
                    border: 1px solid var(--border-color);
                }
                
                .preview-description {
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--primary-color, #03a9f4);
                    font-size: 15px;
                }
                
                .preview-list {
                    max-height: 150px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--card-background-color, #ffffff);
                }
                
                .preview-item {
                    padding: 6px 12px;
                    border-bottom: 1px solid var(--divider-color, #e0e0e0);
                    font-size: 14px;
                    color: var(--primary-text-color, #212121);
                    font-weight: 500;
                }
                
                .preview-item:last-child {
                    border-bottom: none;
                }
                
                .rrule-display {
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    background: var(--primary-background-color, #1976d2);
                    color: white;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid var(--primary-color, #03a9f4);
                    word-break: break-all;
                    font-weight: 500;
                    margin-top: 8px;
                }
                
                .preset-buttons {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
                
                .preset-btn {
                    padding: 6px 12px;
                    border: 1px solid var(--primary-color);
                    background: transparent;
                    color: var(--primary-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .preset-btn:hover {
                    background: var(--primary-color);
                    color: white;
                }
                
                .hidden {
                    display: none !important;
                }
                
                label {
                    font-size: 14px;
                    color: var(--text-color);
                    cursor: pointer;
                }
                
                .error {
                    color: var(--error-color, #f44336);
                    font-size: 12px;
                    margin-top: 4px;
                }
            </style>
            
            <div class="rrule-builder">
                <!-- Preset Buttons -->
                <div class="preset-buttons">
                    <button class="preset-btn" data-preset="daily">Daily</button>
                    <button class="preset-btn" data-preset="weekdays">Weekdays</button>
                    <button class="preset-btn" data-preset="weekly">Weekly</button>
                    <button class="preset-btn" data-preset="monthly">Monthly</button>
                </div>
                
                <!-- Frequency Section -->
                <div class="section frequency-section">
                    <div class="section-title">Frequency</div>
                    <div class="radio-group">
                        <label><input type="radio" name="frequency" value="DAILY"> Daily</label>
                        <label><input type="radio" name="frequency" value="WEEKLY" checked> Weekly</label>
                        <label><input type="radio" name="frequency" value="MONTHLY"> Monthly</label>
                        <label><input type="radio" name="frequency" value="YEARLY"> Yearly</label>
                    </div>
                </div>
                
                <!-- Interval Section -->
                <div class="section interval-section">
                    <div class="section-title">Interval</div>
                    <div class="form-row">
                        <span>Every</span>
                        <input type="number" id="interval" min="1" max="999" value="1">
                        <span id="interval-label">weeks</span>
                    </div>
                </div>
                
                <!-- Weekdays Section -->
                <div class="section weekdays-section" id="weekdays-section">
                    <div class="section-title">Days of Week</div>
                    <div class="checkbox-group">
                        <label><input type="checkbox" name="weekday" value="MO"> Mon</label>
                        <label><input type="checkbox" name="weekday" value="TU"> Tue</label>
                        <label><input type="checkbox" name="weekday" value="WE"> Wed</label>
                        <label><input type="checkbox" name="weekday" value="TH"> Thu</label>
                        <label><input type="checkbox" name="weekday" value="FR"> Fri</label>
                        <label><input type="checkbox" name="weekday" value="SA"> Sat</label>
                        <label><input type="checkbox" name="weekday" value="SU"> Sun</label>
                    </div>
                </div>
                
                <!-- End Condition Section -->
                <div class="section end-section">
                    <div class="section-title">End Condition</div>
                    <div class="form-group">
                        <label>
                            <input type="radio" name="end-type" value="never" checked>
                            Never
                        </label>
                        <label>
                            <input type="radio" name="end-type" value="count">
                            After <input type="number" id="count" min="1" max="9999" value="10"> occurrences
                        </label>
                        <label>
                            <input type="radio" name="end-type" value="until">
                            Until <input type="date" id="until">
                        </label>
                    </div>
                </div>
                
                <!-- Monthly Section -->
                <div class="section monthly-section hidden" id="monthly-section">
                    <div class="section-title">Monthly Options</div>
                    <div class="form-group">
                        <label>
                            <input type="radio" name="monthly-type" value="bymonthday" checked>
                            On day <input type="number" id="monthday" min="1" max="31" value="1"> of the month
                        </label>
                        <label>
                            <input type="radio" name="monthly-type" value="bysetpos">
                            On the
                            <select id="setpos">
                                <option value="1">First</option>
                                <option value="2">Second</option>
                                <option value="3">Third</option>
                                <option value="4">Fourth</option>
                                <option value="-1">Last</option>
                            </select>
                            <select id="setpos-weekday">
                                <option value="MO">Monday</option>
                                <option value="TU">Tuesday</option>
                                <option value="WE">Wednesday</option>
                                <option value="TH">Thursday</option>
                                <option value="FR">Friday</option>
                                <option value="SA">Saturday</option>
                                <option value="SU">Sunday</option>
                            </select>
                        </label>
                    </div>
                </div>
                
                <!-- Preview Section -->
                <div class="preview-section">
                    <div class="section-title">Preview</div>
                    <div class="preview-description" id="preview-description">Every week</div>
                    <div class="preview-list" id="preview-list"></div>
                    <div class="rrule-display" id="rrule-display">FREQ=WEEKLY</div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        const shadow = this.shadowRoot;
        
        // Frequency change
        shadow.querySelectorAll('input[name="frequency"]').forEach(radio => {
            radio.addEventListener('change', this.onFrequencyChange);
        });
        
        // Interval change
        shadow.getElementById('interval').addEventListener('input', this.updatePreview);
        
        // Weekdays change
        shadow.querySelectorAll('input[name="weekday"]').forEach(checkbox => {
            checkbox.addEventListener('change', this.updatePreview);
        });
        
        // Monthly options change
        shadow.querySelectorAll('input[name="monthly-type"]').forEach(radio => {
            radio.addEventListener('change', this.updatePreview);
        });
        shadow.getElementById('monthday').addEventListener('input', this.updatePreview);
        shadow.getElementById('setpos').addEventListener('change', this.updatePreview);
        shadow.getElementById('setpos-weekday').addEventListener('change', this.updatePreview);
        
        // End condition change
        shadow.querySelectorAll('input[name="end-type"]').forEach(radio => {
            radio.addEventListener('change', this.updatePreview);
        });
        shadow.getElementById('count').addEventListener('input', this.updatePreview);
        shadow.getElementById('until').addEventListener('change', this.updatePreview);
        
        // Preset buttons
        shadow.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyPreset(btn.dataset.preset);
            });
        });
        
        // Set default until date
        const untilInput = shadow.getElementById('until');
        const defaultUntil = new Date(this.startDate);
        defaultUntil.setFullYear(defaultUntil.getFullYear() + 1);
        untilInput.value = defaultUntil.toISOString().split('T')[0];
    }
    
    loadTranslations() {
        // Load translations from Home Assistant
        const locale = this.getAttribute('locale') || 'en_GB';
        
        // Prevent console errors when locale is null
        if (!locale || locale === 'null') {
            console.log('[RRuleBuilder] Locale is null, using default en_GB');
            return;
        }
        
        // Basic translations - would be loaded from translation manager in real implementation
        this.translations = {
            'rrule.frequency.daily': 'Daily',
            'rrule.frequency.weekly': 'Weekly',
            'rrule.frequency.monthly': 'Monthly',
            'rrule.frequency.yearly': 'Yearly',
            'rrule.weekday.monday': 'Monday',
            'rrule.weekday.tuesday': 'Tuesday',
            'rrule.weekday.wednesday': 'Wednesday',
            'rrule.weekday.thursday': 'Thursday',
            'rrule.weekday.friday': 'Friday',
            'rrule.weekday.saturday': 'Saturday',
            'rrule.weekday.sunday': 'Sunday',
            'recurring.preset.daily': 'Daily',
            'recurring.preset.weekdays': 'Weekdays',
            'recurring.preset.weekly': 'Weekly',
            'recurring.preset.monthly': 'Monthly'
        };
        
        this.updateTranslations();
    }
    
    updateTranslations() {
        // Update UI text with translations
        const shadow = this.shadowRoot;
        
        // Update preset buttons
        shadow.querySelectorAll('.preset-btn').forEach(btn => {
            const key = `recurring.preset.${btn.dataset.preset}`;
            if (this.translations[key]) {
                btn.textContent = this.translations[key];
            }
        });
    }
    
    onFrequencyChange() {
        const shadow = this.shadowRoot;
        const frequency = shadow.querySelector('input[name="frequency"]:checked').value;
        const intervalLabel = shadow.getElementById('interval-label');
        const weekdaysSection = shadow.getElementById('weekdays-section');
        const monthlySection = shadow.getElementById('monthly-section');
        
        // Update interval label
        switch (frequency) {
            case 'DAILY':
                intervalLabel.textContent = 'days';
                weekdaysSection.classList.add('hidden');
                monthlySection.classList.add('hidden');
                break;
            case 'WEEKLY':
                intervalLabel.textContent = 'weeks';
                weekdaysSection.classList.remove('hidden');
                monthlySection.classList.add('hidden');
                break;
            case 'MONTHLY':
                intervalLabel.textContent = 'months';
                weekdaysSection.classList.add('hidden');
                monthlySection.classList.remove('hidden');
                break;
            case 'YEARLY':
                intervalLabel.textContent = 'years';
                weekdaysSection.classList.add('hidden');
                monthlySection.classList.add('hidden');
                break;
        }
        
        this.updatePreview();
    }
    
    applyPreset(preset) {
        const shadow = this.shadowRoot;
        
        switch (preset) {
            case 'daily':
                shadow.querySelector('input[name="frequency"][value="DAILY"]').checked = true;
                shadow.getElementById('interval').value = 1;
                break;
                
            case 'weekdays':
                shadow.querySelector('input[name="frequency"][value="WEEKLY"]').checked = true;
                shadow.getElementById('interval').value = 1;
                // Set Monday to Friday
                shadow.querySelectorAll('input[name="weekday"]').forEach(cb => {
                    cb.checked = ['MO', 'TU', 'WE', 'TH', 'FR'].includes(cb.value);
                });
                break;
                
            case 'weekly':
                shadow.querySelector('input[name="frequency"][value="WEEKLY"]').checked = true;
                shadow.getElementById('interval').value = 1;
                // Set current weekday
                const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
                const currentWeekday = weekdays[this.startDate.getDay()];
                shadow.querySelectorAll('input[name="weekday"]').forEach(cb => {
                    cb.checked = cb.value === currentWeekday;
                });
                break;
                
            case 'monthly':
                shadow.querySelector('input[name="frequency"][value="MONTHLY"]').checked = true;
                shadow.getElementById('interval').value = 1;
                shadow.querySelector('input[name="monthly-type"][value="bymonthday"]').checked = true;
                // Use the actual day of the month from start date
                const dayOfMonth = this.startDate.getDate();
                shadow.getElementById('monthday').value = dayOfMonth;
                break;
        }
        
        this.onFrequencyChange();
    }
    
    buildRRule() {
        const shadow = this.shadowRoot;
        
        try {
            const parts = [];
            
            // Frequency
            const frequency = shadow.querySelector('input[name="frequency"]:checked').value;
            parts.push(`FREQ=${frequency}`);
            
            // Interval
            const interval = parseInt(shadow.getElementById('interval').value);
            if (interval > 1) {
                parts.push(`INTERVAL=${interval}`);
            }
            
            // Weekdays for weekly frequency
            if (frequency === 'WEEKLY') {
                const selectedDays = Array.from(shadow.querySelectorAll('input[name="weekday"]:checked'))
                    .map(cb => cb.value);
                if (selectedDays.length > 0) {
                    parts.push(`BYDAY=${selectedDays.join(',')}`);
                }
            }
            
            // Monthly options
            if (frequency === 'MONTHLY') {
                const monthlyType = shadow.querySelector('input[name="monthly-type"]:checked').value;
                if (monthlyType === 'bymonthday') {
                    const monthday = parseInt(shadow.getElementById('monthday').value);
                    parts.push(`BYMONTHDAY=${monthday}`);
                } else if (monthlyType === 'bysetpos') {
                    const setpos = shadow.getElementById('setpos').value;
                    const weekday = shadow.getElementById('setpos-weekday').value;
                    parts.push(`BYDAY=${weekday}`);
                    parts.push(`BYSETPOS=${setpos}`);
                }
            }
            
            // End condition
            const endType = shadow.querySelector('input[name="end-type"]:checked').value;
            if (endType === 'count') {
                const count = parseInt(shadow.getElementById('count').value);
                parts.push(`COUNT=${count}`);
            } else if (endType === 'until') {
                const until = shadow.getElementById('until').value;
                if (until) {
                    const untilDate = new Date(until + 'T00:00:00Z');
                    const untilStr = untilDate.toISOString().split('T')[0].replace(/-/g, '');
                    parts.push(`UNTIL=${untilStr}`);
                }
            }
            
            return parts.join(';');
            
        } catch (error) {
            console.error('Error building RRULE:', error);
            return '';
        }
    }
    
    loadRRule() {
        if (!this.rrule) {
            console.log('[RRuleBuilder] loadRRule: No RRULE to load');
            return;
        }
        
        console.log('[RRuleBuilder] Loading RRULE:', this.rrule);
        
        try {
            const shadow = this.shadowRoot;
            const parts = this.rrule.split(';');
            const rules = {};
            
            // Parse RRULE parts
            parts.forEach(part => {
                const [key, value] = part.split('=');
                if (key && value) {
                    rules[key] = value;
                }
            });
            
            console.log('[RRuleBuilder] Parsed RRULE rules:', rules);
            
            // Set frequency
            if (rules.FREQ) {
                const freqRadio = shadow.querySelector(`input[name="frequency"][value="${rules.FREQ}"]`);
                if (freqRadio) {
                    freqRadio.checked = true;
                    console.log('[RRuleBuilder] Set frequency:', rules.FREQ);
                } else {
                    console.warn('[RRuleBuilder] Frequency radio not found for:', rules.FREQ);
                }
            }
            
            // Set interval
            if (rules.INTERVAL) {
                const intervalInput = shadow.getElementById('interval');
                if (intervalInput) {
                    intervalInput.value = rules.INTERVAL;
                    console.log('[RRuleBuilder] Set interval:', rules.INTERVAL);
                }
            }
            
            // Set weekdays - THIS IS THE CRITICAL PART FOR THE BUG FIX
            if (rules.BYDAY) {
                const weekdays = rules.BYDAY.split(',');
                console.log('[RRuleBuilder] Setting weekdays:', weekdays);
                
                // First, clear all weekday checkboxes
                shadow.querySelectorAll('input[name="weekday"]').forEach(cb => {
                    cb.checked = false;
                });
                
                // Then set the ones specified in BYDAY
                weekdays.forEach(weekday => {
                    const trimmedWeekday = weekday.trim();
                    const checkbox = shadow.querySelector(`input[name="weekday"][value="${trimmedWeekday}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        console.log('[RRuleBuilder] ✅ Set weekday checkbox:', trimmedWeekday);
                    } else {
                        console.warn('[RRuleBuilder] ❌ Weekday checkbox not found for:', trimmedWeekday);
                    }
                });
                
                // Verify the checkboxes are set correctly
                const checkedWeekdays = Array.from(shadow.querySelectorAll('input[name="weekday"]:checked')).map(cb => cb.value);
                console.log('[RRuleBuilder] Verified checked weekdays:', checkedWeekdays);
            }
            
            // Set monthly options
            if (rules.BYMONTHDAY) {
                const monthdayRadio = shadow.querySelector('input[name="monthly-type"][value="bymonthday"]');
                if (monthdayRadio) monthdayRadio.checked = true;
                const monthdayInput = shadow.getElementById('monthday');
                if (monthdayInput) monthdayInput.value = rules.BYMONTHDAY;
                console.log('[RRuleBuilder] Set monthly by monthday:', rules.BYMONTHDAY);
            } else if (rules.BYSETPOS && rules.BYDAY) {
                const setposRadio = shadow.querySelector('input[name="monthly-type"][value="bysetpos"]');
                if (setposRadio) setposRadio.checked = true;
                const setposSelect = shadow.getElementById('setpos');
                if (setposSelect) setposSelect.value = rules.BYSETPOS;
                const setposWeekdaySelect = shadow.getElementById('setpos-weekday');
                if (setposWeekdaySelect) setposWeekdaySelect.value = rules.BYDAY;
                console.log('[RRuleBuilder] Set monthly by setpos:', rules.BYSETPOS, rules.BYDAY);
            }
            
            // Set end condition
            if (rules.COUNT) {
                const countRadio = shadow.querySelector('input[name="end-type"][value="count"]');
                if (countRadio) countRadio.checked = true;
                const countInput = shadow.getElementById('count');
                if (countInput) countInput.value = rules.COUNT;
                console.log('[RRuleBuilder] Set end condition count:', rules.COUNT);
            } else if (rules.UNTIL) {
                const untilRadio = shadow.querySelector('input[name="end-type"][value="until"]');
                if (untilRadio) untilRadio.checked = true;
                // Convert UNTIL format (YYYYMMDD) to date input format (YYYY-MM-DD)
                const untilStr = rules.UNTIL;
                if (untilStr.length === 8) {
                    const year = untilStr.substr(0, 4);
                    const month = untilStr.substr(4, 2);
                    const day = untilStr.substr(6, 2);
                    const untilInput = shadow.getElementById('until');
                    if (untilInput) {
                        untilInput.value = `${year}-${month}-${day}`;
                        console.log('[RRuleBuilder] Set end condition until:', `${year}-${month}-${day}`);
                    }
                }
            } else {
                // Default to "never" if no end condition specified
                const neverRadio = shadow.querySelector('input[name="end-type"][value="never"]');
                if (neverRadio) neverRadio.checked = true;
                console.log('[RRuleBuilder] Set end condition: never');
            }
            
            // Update the UI based on frequency
            this.onFrequencyChange();
            
            // Update preview after loading
            this.updatePreview();
            
            console.log('[RRuleBuilder] ✅ Successfully loaded RRULE');
            
        } catch (error) {
            console.error('[RRuleBuilder] ❌ Error loading RRULE:', error);
        }
    }
    
    updatePreview() {
        const shadow = this.shadowRoot;
        const rrule = this.buildRRule();
        
        // Update RRULE display
        shadow.getElementById('rrule-display').textContent = rrule;
        
        // Generate preview occurrences
        try {
            const occurrences = this.generatePreviewOccurrences(rrule);
            
            // Update description
            const description = this.getHumanReadableDescription(rrule);
            shadow.getElementById('preview-description').textContent = description;
            
            // Update preview list
            const previewList = shadow.getElementById('preview-list');
            previewList.innerHTML = '';
            
            occurrences.slice(0, 10).forEach(date => {
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.textContent = `${date.toLocaleDateString()} (${date.toLocaleDateString(undefined, { weekday: 'long' })})`;
                previewList.appendChild(item);
            });
            
            if (occurrences.length > 10) {
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.textContent = `... and ${occurrences.length - 10} more`;
                previewList.appendChild(item);
            }
            
        } catch (error) {
            console.error('Error updating preview:', error);
            shadow.getElementById('preview-description').textContent = 'Invalid pattern';
            shadow.getElementById('preview-list').innerHTML = '<div class="preview-item error">Error generating preview</div>';
        }
        
        // Dispatch change event
        this.dispatchEvent(new CustomEvent('change', {
            detail: { rrule: rrule },
            bubbles: true
        }));
    }
    
    generatePreviewOccurrences(rrule) {
        // Enhanced RRULE occurrence generation with proper BYDAY support
        
        const occurrences = [];
        const parts = rrule.split(';');
        const rules = {};
        
        parts.forEach(part => {
            const [key, value] = part.split('=');
            rules[key] = value;
        });
        
        const frequency = rules.FREQ;
        const interval = parseInt(rules.INTERVAL || '1');
        const count = parseInt(rules.COUNT || '20');
        const byDay = rules.BYDAY ? rules.BYDAY.split(',') : [];
        
        // For weekly events with BYDAY, generate occurrences for each specified day
        if (frequency === 'WEEKLY' && byDay.length > 0) {
            const weekdayMap = {'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6};
            const targetDays = byDay.map(day => weekdayMap[day]).filter(day => day !== undefined);
            
            if (targetDays.length > 0) {
                // Start from the beginning of the week containing start date
                let weekStart = new Date(this.startDate);
                weekStart.setDate(this.startDate.getDate() - this.startDate.getDay());
                
                let weekCount = 0;
                let generated = 0;
                
                while (generated < count && weekCount < 50) {
                    // For each target day in this week
                    for (let targetDay of targetDays.sort()) {
                        if (generated >= count) break;
                        
                        let occurrenceDate = new Date(weekStart);
                        occurrenceDate.setDate(weekStart.getDate() + targetDay);
                        
                        // Only include if on or after start date
                        if (occurrenceDate >= this.startDate) {
                            occurrences.push(new Date(occurrenceDate));
                            generated++;
                        }
                    }
                    
                    // Move to next week
                    weekStart.setDate(weekStart.getDate() + (7 * interval));
                    weekCount++;
                }
                
                return occurrences;
            }
        }
        
        // Default behavior for other frequencies or weekly without BYDAY
        let current = new Date(this.startDate);
        let generated = 0;
        
        while (generated < count && generated < 50) {
            occurrences.push(new Date(current));
            generated++;
            
            // Advance to next occurrence
            switch (frequency) {
                case 'DAILY':
                    current.setDate(current.getDate() + interval);
                    break;
                case 'WEEKLY':
                    current.setDate(current.getDate() + (7 * interval));
                    break;
                case 'MONTHLY':
                    current.setMonth(current.getMonth() + interval);
                    break;
                case 'YEARLY':
                    current.setFullYear(current.getFullYear() + interval);
                    break;
            }
        }
        
        return occurrences;
    }
    
    getHumanReadableDescription(rrule) {
        const parts = rrule.split(';');
        const rules = {};
        
        parts.forEach(part => {
            const [key, value] = part.split('=');
            rules[key] = value;
        });
        
        const frequency = rules.FREQ;
        const interval = parseInt(rules.INTERVAL || '1');
        const byDay = rules.BYDAY ? rules.BYDAY.split(',') : [];
        
        let description = '';
        
        // Build frequency description
        if (interval === 1) {
            switch (frequency) {
                case 'DAILY':
                    description = 'Every day';
                    break;
                case 'WEEKLY':
                    if (byDay.length > 0) {
                        const dayNames = {
                            'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday',
                            'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
                        };
                        const dayList = byDay.map(day => dayNames[day]).join(', ');
                        description = `Every week on ${dayList}`;
                    } else {
                        description = 'Every week';
                    }
                    break;
                case 'MONTHLY':
                    if (rules.BYMONTHDAY) {
                        description = `Every month on day ${rules.BYMONTHDAY}`;
                    } else if (rules.BYSETPOS && rules.BYDAY) {
                        const positions = {'1': 'first', '2': 'second', '3': 'third', '4': 'fourth', '-1': 'last'};
                        const dayNames = {
                            'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday',
                            'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
                        };
                        description = `Every month on the ${positions[rules.BYSETPOS]} ${dayNames[rules.BYDAY]}`;
                    } else {
                        description = 'Every month';
                    }
                    break;
                case 'YEARLY':
                    description = 'Every year';
                    break;
            }
        } else {
            switch (frequency) {
                case 'DAILY':
                    description = `Every ${interval} days`;
                    break;
                case 'WEEKLY':
                    if (byDay.length > 0) {
                        const dayNames = {
                            'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday',
                            'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
                        };
                        const dayList = byDay.map(day => dayNames[day]).join(', ');
                        description = `Every ${interval} weeks on ${dayList}`;
                    } else {
                        description = `Every ${interval} weeks`;
                    }
                    break;
                case 'MONTHLY':
                    description = `Every ${interval} months`;
                    break;
                case 'YEARLY':
                    description = `Every ${interval} years`;
                    break;
            }
        }
        
        // Add end condition
        if (rules.COUNT) {
            description += `, ${rules.COUNT} times`;
        } else if (rules.UNTIL) {
            const untilStr = rules.UNTIL;
            if (untilStr.length === 8) {
                const year = untilStr.substr(0, 4);
                const month = untilStr.substr(4, 2);
                const day = untilStr.substr(6, 2);
                description += `, until ${day}/${month}/${year}`;
            }
        }
        
        return description;
    }
}

// Register the custom element
customElements.define('rrule-builder', RRuleBuilder);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RRuleBuilder;
}