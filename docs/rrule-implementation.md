# 🔄 RRule Implementation

This document provides a detailed explanation of how Calendifier implements recurring events using the RFC 5545 RRULE standard.

## Table of Contents

- [RFC 5545 RRULE Overview](#rfc-5545-rrule-overview)
- [RRULE Implementation in Calendifier](#rrule-implementation-in-calendifier)
- [Event Expansion Algorithm](#event-expansion-algorithm)
- [RRULE Builder Components](#rrule-builder-components)
- [Common Recurrence Patterns](#common-recurrence-patterns)
- [Handling Exceptions](#handling-exceptions)
- [Performance Considerations](#performance-considerations)

## RFC 5545 RRULE Overview

The RFC 5545 (Internet Calendaring and Scheduling Core Object Specification) defines the iCalendar format, which includes the RRULE property for specifying recurring events. The RRULE property uses a specific syntax to define recurrence patterns.

### RRULE Syntax

The basic syntax of an RRULE is:

```
RRULE:FREQ=<frequency>;[other-properties]
```

Where:
- `FREQ`: Specifies the frequency (YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, SECONDLY)
- Other properties can include:
  - `INTERVAL`: How often the recurrence rule repeats (default: 1)
  - `COUNT`: Number of occurrences
  - `UNTIL`: End date for the recurrence
  - `BYDAY`: Days of the week (SU, MO, TU, WE, TH, FR, SA)
  - `BYMONTHDAY`: Days of the month (1-31)
  - `BYMONTH`: Months of the year (1-12)
  - `BYYEARDAY`: Days of the year (1-366)
  - `BYWEEKNO`: Weeks of the year (1-53)
  - `BYSETPOS`: Positions within the set of occurrences
  - `WKST`: Day of the week that starts the week (default: MO)

### Examples

- Weekly on Tuesday: `RRULE:FREQ=WEEKLY;BYDAY=TU`
- Monthly on the first Monday: `RRULE:FREQ=MONTHLY;BYDAY=1MO`
- Every other day: `RRULE:FREQ=DAILY;INTERVAL=2`
- Every weekday: `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
- Yearly on January 1st: `RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1`

## RRULE Implementation in Calendifier

Calendifier implements the RRULE standard using a combination of:

1. The `rrule` Python library for the desktop application
2. The `rrule.js` JavaScript library for the Home Assistant integration

### Core RRULE Classes

#### Desktop Application

In the desktop application, recurring events are handled by the `RecurringEventManager` class:

```python
class RecurringEventManager:
    """
    Manages recurring events using the RFC 5545 RRULE standard.
    """
    
    def __init__(self, event_manager):
        """
        Initialize the RecurringEventManager.
        
        Args:
            event_manager: Reference to the EventManager
        """
        self.event_manager = event_manager
        self.logger = logging.getLogger(__name__)
    
    def create_recurring_event(self, event_data, rrule_str):
        """
        Create a new recurring event.
        
        Args:
            event_data: Base event data
            rrule_str: RRULE string in RFC 5545 format
            
        Returns:
            ID of the created recurring event
        """
        # Validate RRULE
        try:
            rrule_obj = rrulestr(rrule_str)
        except ValueError as e:
            self.logger.error(f"Invalid RRULE: {e}")
            raise ValueError(f"Invalid recurrence rule: {e}")
        
        # Create parent event
        event_data['is_recurring'] = True
        event_data['rrule'] = rrule_str
        event_id = self.event_manager.create_event(event_data)
        
        self.logger.info(f"Created recurring event {event_id} with rule: {rrule_str}")
        return event_id
    
    def expand_recurring_event(self, event_id, start_date, end_date):
        """
        Expand a recurring event into individual occurrences.
        
        Args:
            event_id: ID of the recurring event
            start_date: Start date for expansion
            end_date: End date for expansion
            
        Returns:
            List of expanded event occurrences
        """
        event = self.event_manager.get_event(event_id)
        if not event or not event.get('is_recurring'):
            self.logger.warning(f"Event {event_id} is not a recurring event")
            return []
        
        rrule_str = event.get('rrule')
        if not rrule_str:
            self.logger.warning(f"Event {event_id} has no RRULE")
            return []
        
        # Parse RRULE
        try:
            rrule_obj = rrulestr(rrule_str, dtstart=event['start_date'])
        except ValueError as e:
            self.logger.error(f"Invalid RRULE for event {event_id}: {e}")
            return []
        
        # Get occurrences between start_date and end_date
        occurrences = list(rrule_obj.between(start_date, end_date, inc=True))
        
        # Create occurrence events
        expanded_events = []
        for occurrence_date in occurrences:
            # Skip exceptions
            if self._is_exception(event_id, occurrence_date):
                continue
                
            # Create occurrence event
            occurrence = event.copy()
            occurrence['id'] = f"{event_id}_{occurrence_date.strftime('%Y%m%d')}"
            occurrence['start_date'] = occurrence_date
            occurrence['end_date'] = occurrence_date + (event['end_date'] - event['start_date'])
            occurrence['is_occurrence'] = True
            occurrence['parent_id'] = event_id
            occurrence['occurrence_date'] = occurrence_date
            
            expanded_events.append(occurrence)
        
        self.logger.debug(f"Expanded event {event_id} into {len(expanded_events)} occurrences")
        return expanded_events
    
    def _is_exception(self, event_id, date):
        """
        Check if a date is an exception for a recurring event.
        
        Args:
            event_id: ID of the recurring event
            date: Date to check
            
        Returns:
            True if the date is an exception, False otherwise
        """
        exceptions = self.event_manager.get_event_exceptions(event_id)
        date_str = date.strftime('%Y-%m-%d')
        return date_str in exceptions
```

#### Home Assistant Integration

In the Home Assistant integration, recurring events are handled by the `RRuleManager` class:

```javascript
class RRuleManager {
  /**
   * Initialize the RRuleManager.
   */
  constructor() {
    this.logger = new Logger('RRuleManager');
  }
  
  /**
   * Create an RRule object from an RRULE string.
   * 
   * @param {string} rruleStr - RRULE string in RFC 5545 format
   * @param {Date} dtstart - Start date for the recurrence
   * @returns {RRule} RRule object
   */
  createRRule(rruleStr, dtstart) {
    try {
      const options = RRule.parseString(rruleStr);
      options.dtstart = dtstart;
      return new RRule(options);
    } catch (error) {
      this.logger.error(`Invalid RRULE: ${error.message}`);
      throw new Error(`Invalid recurrence rule: ${error.message}`);
    }
  }
  
  /**
   * Expand a recurring event into individual occurrences.
   * 
   * @param {Object} event - Recurring event object
   * @param {Date} startDate - Start date for expansion
   * @param {Date} endDate - End date for expansion
   * @returns {Array} List of expanded event occurrences
   */
  expandRecurringEvent(event, startDate, endDate) {
    if (!event || !event.is_recurring || !event.rrule) {
      this.logger.warning(`Event ${event?.id} is not a valid recurring event`);
      return [];
    }
    
    try {
      // Parse RRULE
      const rrule = this.createRRule(event.rrule, new Date(event.start_date));
      
      // Get occurrences between startDate and endDate
      const occurrences = rrule.between(startDate, endDate, true);
      
      // Create occurrence events
      const expandedEvents = occurrences.map(occurrenceDate => {
        // Skip exceptions
        if (this.isException(event.id, occurrenceDate)) {
          return null;
        }
        
        // Calculate duration
        const duration = new Date(event.end_date) - new Date(event.start_date);
        
        // Create occurrence event
        return {
          ...event,
          id: `${event.id}_${this.formatDate(occurrenceDate)}`,
          start_date: occurrenceDate,
          end_date: new Date(occurrenceDate.getTime() + duration),
          is_occurrence: true,
          parent_id: event.id,
          occurrence_date: occurrenceDate
        };
      }).filter(Boolean); // Remove null values (exceptions)
      
      this.logger.debug(`Expanded event ${event.id} into ${expandedEvents.length} occurrences`);
      return expandedEvents;
    } catch (error) {
      this.logger.error(`Error expanding recurring event ${event.id}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Check if a date is an exception for a recurring event.
   * 
   * @param {string} eventId - ID of the recurring event
   * @param {Date} date - Date to check
   * @returns {boolean} True if the date is an exception, False otherwise
   */
  isException(eventId, date) {
    // Get exceptions from API or cache
    const exceptions = this.getEventExceptions(eventId);
    const dateStr = this.formatDate(date);
    return exceptions.includes(dateStr);
  }
  
  /**
   * Format a date as YYYY-MM-DD.
   * 
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Get exceptions for a recurring event.
   * 
   * @param {string} eventId - ID of the recurring event
   * @returns {Array} List of exception dates
   */
  getEventExceptions(eventId) {
    // Implementation depends on how exceptions are stored
    // This could be an API call or a cache lookup
    return []; // Placeholder
  }
}
```

## Event Expansion Algorithm

The event expansion algorithm is a critical part of the RRULE implementation. It converts a recurring event definition into individual event occurrences for a specific date range.

### Algorithm Steps

1. **Parse the RRULE**: Convert the RRULE string into an object representation
2. **Generate Occurrences**: Use the RRULE object to generate all occurrences within the specified date range
3. **Apply Exceptions**: Remove any occurrences that have been explicitly excluded
4. **Create Event Instances**: For each occurrence, create an event instance with the appropriate properties
5. **Apply Modifications**: Apply any modifications to specific occurrences

### Pseudocode

```
function expandRecurringEvent(event, startDate, endDate):
    if not event.is_recurring or not event.rrule:
        return []
    
    rruleObj = parseRRule(event.rrule, event.start_date)
    occurrences = rruleObj.between(startDate, endDate, inclusive=true)
    
    expandedEvents = []
    for occurrenceDate in occurrences:
        if isException(event.id, occurrenceDate):
            continue
        
        occurrenceEvent = copy(event)
        occurrenceEvent.id = event.id + "_" + formatDate(occurrenceDate)
        occurrenceEvent.start_date = occurrenceDate
        occurrenceEvent.end_date = occurrenceDate + (event.end_date - event.start_date)
        occurrenceEvent.is_occurrence = true
        occurrenceEvent.parent_id = event.id
        occurrenceEvent.occurrence_date = occurrenceDate
        
        // Apply any modifications
        applyModifications(occurrenceEvent)
        
        expandedEvents.append(occurrenceEvent)
    
    return expandedEvents
```

## RRULE Builder Components

Calendifier provides UI components for creating and editing RRULE patterns.

### Desktop Application

The desktop application uses the `RecurrenceDialog` class to create and edit RRULE patterns. This dialog provides a user-friendly interface for creating complex recurrence rules without needing to understand the RRULE syntax.

The dialog includes options for:
- Frequency (daily, weekly, monthly, yearly)
- Interval (every X days, weeks, months, years)
- Weekly options (days of the week)
- Monthly options (day of month or position in month)
- Yearly options (month and day)
- End options (never, after X occurrences, on date)

The dialog also provides a summary of the recurrence rule and shows the next few occurrences to help users understand the pattern they're creating.

### Home Assistant Integration

The Home Assistant integration uses the `rrule-builder.js` component to create and edit RRULE patterns. This component is built using LitElement and provides a similar interface to the desktop application's RecurrenceDialog.

The component includes:
- Frequency selection (daily, weekly, monthly, yearly)
- Interval selection
- Day selection for weekly recurrence
- Month day or position selection for monthly recurrence
- Month, day, and position selection for yearly recurrence
- End options (never, after X occurrences, on date)
- Summary and next occurrences preview

## Common Recurrence Patterns

Calendifier provides pre-defined templates for common recurrence patterns to simplify the creation of recurring events.

### Daily Patterns

- **Every day**: `RRULE:FREQ=DAILY`
- **Every weekday**: `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
- **Every weekend day**: `RRULE:FREQ=WEEKLY;BYDAY=SA,SU`
- **Every X days**: `RRULE:FREQ=DAILY;INTERVAL=X`

### Weekly Patterns

- **Every week on specific days**: `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR`
- **Every other week on specific days**: `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH`

### Monthly Patterns

- **Monthly on a specific day**: `RRULE:FREQ=MONTHLY;BYMONTHDAY=15`
- **Monthly on the first Monday**: `RRULE:FREQ=MONTHLY;BYDAY=1MO`
- **Monthly on the last day**: `RRULE:FREQ=MONTHLY;BYMONTHDAY=-1`
- **Monthly on the last Friday**: `RRULE:FREQ=MONTHLY;BYDAY=-1FR`
- **Every other month on the 15th**: `RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15`

### Yearly Patterns

- **Yearly on a specific date**: `RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1`
- **Yearly on the first Monday in January**: `RRULE:FREQ=YEARLY;BYMONTH=1;BYDAY=1MO`
- **Yearly on the last day of March**: `RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=-1`

### Limited Recurrence

- **Daily for 10 occurrences**: `RRULE:FREQ=DAILY;COUNT=10`
- **Weekly until a specific date**: `RRULE:FREQ=WEEKLY;UNTIL=20251231T000000Z`

## Handling Exceptions

Calendifier supports exceptions to recurring events, allowing users to exclude specific occurrences or modify individual instances.

### Exception Types

1. **Exclusions**: Dates that are excluded from the recurrence pattern
2. **Modifications**: Occurrences that have been modified (e.g., time change, description change)

### Exclusion Implementation

Exclusions are stored in the database as a list of dates associated with the recurring event:

```python
def add_exception(self, event_id, exception_date):
    """
    Add an exception date to a recurring event.
    
    Args:
        event_id: ID of the recurring event
        exception_date: Date to exclude
        
    Returns:
        True if successful, False otherwise
    """
    event = self.event_manager.get_event(event_id)
    if not event or not event.get('is_recurring'):
        self.logger.warning(f"Event {event_id} is not a recurring event")
        return False
    
    date_str = exception_date.strftime('%Y-%m-%d')
    
    # Add to exceptions table
    try:
        self.event_manager.db.execute(
            "INSERT INTO event_exceptions (event_id, exception_date) VALUES (?, ?)",
            (event_id, date_str)
        )
        self.event_manager.db.commit()
        self.logger.info(f"Added exception {date_str} to event {event_id}")
        return True
    except Exception as e:
        self.logger.error(f"Error adding exception to event {event_id}: {e}")
        return False
```

### Modification Implementation

Modifications are stored as separate events with a reference to the parent event and the specific occurrence date:

```python
def modify_occurrence(self, event_id, occurrence_date, modified_data):
    """
    Modify a specific occurrence of a recurring event.
    
    Args:
        event_id: ID of the recurring event
        occurrence_date: Date of the occurrence to modify
        modified_data: Modified event data
        
    Returns:
        ID of the modified occurrence
    """
    event = self.event_manager.get_event(event_id)
    if not event or not event.get('is_recurring'):
        self.logger.warning(f"Event {event_id} is not a recurring event")
        return None
    
    # Add exception for the original occurrence
    self.add_exception(event_id, occurrence_date)
    
    # Create a new event for the modified occurrence
    occurrence_id = f"{event_id}_{occurrence_date.strftime('%Y%m%d')}"
    
    # Start with the original event data
    occurrence_data = event.copy()
    
    # Update with modified data
    occurrence_data.update(modified_data)
    
    # Set occurrence properties
    occurrence_data['id'] = occurrence_id
    occurrence_data['is_occurrence'] = True
    occurrence_data['parent_id'] = event_id
    occurrence_data['occurrence_date'] = occurrence_date
    
    # Remove recurring properties
    occurrence_data.pop('is_recurring', None)
    occurrence_data.pop('rrule', None)
    
    # Create the modified occurrence
    try:
        self.event_manager.create_event(occurrence_data)
        self.logger.info(f"Created modified occurrence {occurrence_id} for event {event_id}")
        return occurrence_id
    except Exception as e:
        self.logger.error(f"Error creating modified occurrence for event {event_id}: {e}")
        return None
```

### Database Schema

The database schema includes tables for events, event exceptions, and event modifications:

```sql
-- Events table
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_all_day INTEGER DEFAULT 0,
    category TEXT,
    is_recurring INTEGER DEFAULT 0,
    rrule TEXT,
    is_occurrence INTEGER DEFAULT 0,
    parent_id TEXT,
    occurrence_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Event exceptions table
CREATE TABLE event_exceptions (
    event_id TEXT NOT NULL,
    exception_date TEXT NOT NULL,
    PRIMARY KEY (event_id, exception_date),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

## Performance Considerations

Recurring events can have a significant impact on performance, especially when dealing with long-running recurrence patterns or a large number of events. Calendifier implements several optimizations to ensure good performance:

### 1. Lazy Expansion

Events are expanded only when needed, typically when viewing a specific date range in the calendar. This avoids the need to generate all occurrences upfront, which could be prohibitively expensive for infinite recurrence patterns.

```python
def get_events_in_range(self, start_date, end_date):
    """
    Get all events (including expanded recurring events) in a date range.
    
    Args:
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        List of events in the range
    """
    # Get regular events
    regular_events = self.event_manager.get_events_in_range(start_date, end_date)
    
    # Get recurring events
    recurring_events = self.event_manager.get_recurring_events()
    
    # Expand recurring events
    expanded_events = []
    for event in recurring_events:
        occurrences = self.expand_recurring_event(event['id'], start_date, end_date)
        expanded_events.extend(occurrences)
    
    # Combine regular and expanded events
    all_events = regular_events + expanded_events
    
    # Sort by start date
    all_events.sort(key=lambda e: e['start_date'])
    
    return all_events
```

### 2. Caching

Expanded occurrences are cached to avoid redundant calculations when viewing the same date range multiple times:

```python
def expand_recurring_event(self, event_id, start_date, end_date):
    """
    Expand a recurring event into individual occurrences.
    
    Args:
        event_id: ID of the recurring event
        start_date: Start date for expansion
        end_date: End date for expansion
        
    Returns:
        List of expanded event occurrences
    """
    # Check cache
    cache_key = f"{event_id}_{start_date.isoformat()}_{end_date.isoformat()}"
    if cache_key in self._expansion_cache:
        return self._expansion_cache[cache_key]
    
    # Expand event
    # ... (expansion logic)
    
    # Cache result
    self._expansion_cache[cache_key] = expanded_events
    
    return expanded_events
```

### 3. Limiting Expansion Range

The expansion range is limited to a reasonable time period (e.g., 1 year) to avoid excessive memory usage:

```python
def get_events_in_range(self, start_date, end_date):
    """
    Get all events (including expanded recurring events) in a date range.
    
    Args:
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        List of events in the range
    """
    # Limit expansion range to 1 year
    max_range = timedelta(days=365)
    if end_date - start_date > max_range:
        end_date = start_date + max_range
        self.logger.warning(f"Limiting expansion range to 1 year from {start_date}")
    
    # ... (rest of the method)
```

### 4. Incremental Updates

When a recurring event is modified, only the affected occurrences are updated, rather than regenerating all occurrences:

```python
def update_recurring_event(self, event_id, updated_data, update_all=False):
    """
    Update a recurring event.
    
    Args:
        event_id: ID of the recurring event
        updated_data: Updated event data
        update_all: Whether to update all future occurrences
        
    Returns:
        True if successful, False otherwise
    """
    event = self.event_manager.get_event(event_id)
    if not event or not event.get('is_recurring'):
        self.logger.warning(f"Event {event_id} is not a recurring event")
        return False
    
    # Update the parent event
    success = self.event_manager.update_event(event_id, updated_data)
    
    if success and update_all:
        # Get all future occurrences that have been modified
        today = datetime.now().date()
        modified_occurrences = self.event_manager.get_modified_occurrences(
            event_id, min_date=today
        )
        
        # Update each modified occurrence
        for occurrence in modified_occurrences:
            # Apply relevant updates
            occurrence_updates = {}
            for key, value in updated_data.items():
                if key in ['title', 'description', 'category']:
                    occurrence_updates[key] = value
            
            if occurrence_updates:
                self.event_manager.update_event(occurrence['id'], occurrence_updates)
    
    return success
```

### 5. Database Indexing

The database schema includes indexes to optimize queries for recurring events:

```sql
-- Indexes for events table
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);
CREATE INDEX idx_events_is_recurring ON events(is_recurring);
CREATE INDEX idx_events_parent_id ON events(parent_id);
CREATE INDEX idx_events_occurrence_date ON events(occurrence_date);

-- Indexes for event exceptions table
CREATE INDEX idx_event_exceptions_event_id ON event_exceptions(event_id);
CREATE INDEX idx_event_exceptions_exception_date ON event_exceptions(exception_date);
```

These optimizations ensure that Calendifier can handle a large number of recurring events efficiently, providing a smooth user experience even with complex recurrence patterns.