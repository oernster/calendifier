"""
🗄️ Database operations for Calendar Application

This module handles SQLite database operations with proper schema management.
"""

import sqlite3
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from datetime import date, time, datetime
from contextlib import contextmanager

from .models import Event, AppSettings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """🗄️ SQLite database manager with schema versioning."""
    
    SCHEMA_VERSION = 1
    
    def __init__(self, db_path: Path):
        """Initialize database manager."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    def _init_database(self):
        """🚀 Initialize database with schema."""
        with self.get_connection() as conn:
            # Create schema version table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Check current schema version
            current_version = self._get_schema_version(conn)
            
            if current_version < self.SCHEMA_VERSION:
                self._migrate_schema(conn, current_version)
    
    def _get_schema_version(self, conn: sqlite3.Connection) -> int:
        """📊 Get current schema version."""
        cursor = conn.execute("SELECT MAX(version) FROM schema_version")
        result = cursor.fetchone()
        return result[0] if result[0] is not None else 0
    
    def _migrate_schema(self, conn: sqlite3.Connection, from_version: int):
        """🔄 Migrate database schema."""
        logger.info(f"🔄 Migrating database schema from version {from_version} to {self.SCHEMA_VERSION}")
        
        if from_version < 1:
            self._create_initial_schema(conn)
            conn.execute("INSERT INTO schema_version (version) VALUES (1)")
        
        conn.commit()
        logger.info("✅ Database migration completed")
    
    def _create_initial_schema(self, conn: sqlite3.Connection):
        """🏗️ Create initial database schema."""
        
        # Events table
        conn.execute("""
            CREATE TABLE events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                start_date DATE NOT NULL,
                start_time TIME,
                end_date DATE,
                end_time TIME,
                is_all_day BOOLEAN DEFAULT FALSE,
                category TEXT DEFAULT 'default',
                color TEXT DEFAULT '#0078d4',
                is_recurring BOOLEAN DEFAULT FALSE,
                recurrence_pattern TEXT,
                recurrence_end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT valid_dates CHECK (end_date >= start_date),
                CONSTRAINT valid_times CHECK (
                    (start_time IS NULL AND end_time IS NULL) OR
                    (start_date != end_date) OR
                    (end_time >= start_time)
                )
            )
        """)
        
        # Create indexes for performance
        conn.execute("CREATE INDEX idx_events_start_date ON events(start_date)")
        conn.execute("CREATE INDEX idx_events_category ON events(category)")
        conn.execute("CREATE INDEX idx_events_recurring ON events(is_recurring)")
        conn.execute("CREATE INDEX idx_events_date_range ON events(start_date, end_date)")
        
        # Settings table
        conn.execute("""
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                data_type TEXT DEFAULT 'string',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Event categories table
        conn.execute("""
            CREATE TABLE event_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                color TEXT NOT NULL,
                description TEXT,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert default categories
        default_categories = [
            ('work', '#0078d4', 'Work-related events', True),
            ('personal', '#16c60c', 'Personal appointments', True),
            ('holiday', '#d13438', 'Holidays and vacations', True),
            ('meeting', '#ffb900', 'Meetings and conferences', True),
            ('meal', '#8a8a8a', 'Meals and dining', True),
            ('travel', '#6b69d6', 'Travel and transportation', True),
            ('health', '#00bcf2', 'Health and medical', True),
            ('education', '#ca5010', 'Education and learning', True),
            ('celebration', '#e3008c', 'Celebrations and parties', True),
            ('reminder', '#5d5a58', 'Reminders and tasks', True),
            ('default', '#0078d4', 'Default category', True)
        ]
        
        conn.executemany("""
            INSERT INTO event_categories (name, color, description, is_system)
            VALUES (?, ?, ?, ?)
        """, default_categories)
        
        # Insert default settings
        default_settings = [
            ('theme', 'dark', 'string'),
            ('ntp_interval_minutes', '5', 'integer'),
            ('ntp_servers', '["pool.ntp.org", "time.google.com", "time.cloudflare.com"]', 'json'),
            ('window_width', '1200', 'integer'),
            ('window_height', '800', 'integer'),
            ('window_x', '-1', 'integer'),
            ('window_y', '-1', 'integer'),
            ('first_day_of_week', '0', 'integer'),
            ('show_week_numbers', 'false', 'boolean'),
            ('default_event_duration', '60', 'integer')
        ]
        
        conn.executemany("""
            INSERT INTO settings (key, value, data_type)
            VALUES (?, ?, ?)
        """, default_settings)
    
    @contextmanager
    def get_connection(self):
        """🔗 Get database connection with proper cleanup."""
        conn = sqlite3.connect(
            self.db_path,
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
        )
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Database error: {e}")
            raise
        finally:
            conn.close()
    
    def create_event(self, event: Event) -> int:
        """📝 Create new event and return ID."""
        errors = event.validate()
        if errors:
            raise ValueError(f"Event validation failed: {', '.join(errors)}")
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO events (
                    title, description, start_date, start_time, end_date, end_time,
                    is_all_day, category, color, is_recurring, recurrence_pattern,
                    recurrence_end_date, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.title, event.description, event.start_date,
                event.start_time.strftime('%H:%M:%S') if event.start_time else None,
                event.end_date,
                event.end_time.strftime('%H:%M:%S') if event.end_time else None,
                event.is_all_day, event.category,
                event.color, event.is_recurring, event.recurrence_pattern,
                event.recurrence_end_date, datetime.now()
            ))
            
            event_id = cursor.lastrowid
            conn.commit()
            logger.info(f"✅ Created event: {event.title} (ID: {event_id})")
            return event_id or 0
    
    def get_event(self, event_id: int) -> Optional[Event]:
        """📋 Get event by ID."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM events WHERE id = ?
            """, (event_id,))
            
            row = cursor.fetchone()
            if row:
                return self._row_to_event(row)
            return None
    
    def get_events_for_date(self, target_date: date) -> List[Event]:
        """📅 Get all events for specific date."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM events 
                WHERE start_date <= ? AND (end_date >= ? OR end_date IS NULL)
                ORDER BY start_time, title
            """, (target_date, target_date))
            
            events = []
            for row in cursor.fetchall():
                event = self._row_to_event(row)
                events.append(event)
                
                # Handle recurring events
                if event.is_recurring:
                    recurring_events = self._generate_recurring_events(event, target_date)
                    events.extend(recurring_events)
            
            return events
    
    def get_events_for_month(self, year: int, month: int) -> List[Event]:
        """📆 Get all events for specific month."""
        from calendar import monthrange
        
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM events 
                WHERE (start_date >= ? AND start_date <= ?) 
                   OR (end_date >= ? AND start_date <= ?)
                   OR (start_date <= ? AND end_date >= ?)
                ORDER BY start_date, start_time, title
            """, (start_date, end_date, start_date, end_date, start_date, end_date))
            
            events = []
            for row in cursor.fetchall():
                event = self._row_to_event(row)
                events.append(event)
                
                # Handle recurring events for the month
                if event.is_recurring:
                    recurring_events = self._generate_recurring_events_for_range(
                        event, start_date, end_date
                    )
                    events.extend(recurring_events)
            
            return events
    
    def update_event(self, event: Event) -> bool:
        """✏️ Update existing event."""
        if not event.id:
            raise ValueError("Event ID is required for update")
        
        errors = event.validate()
        if errors:
            raise ValueError(f"Event validation failed: {', '.join(errors)}")
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                UPDATE events SET
                    title = ?, description = ?, start_date = ?, start_time = ?,
                    end_date = ?, end_time = ?, is_all_day = ?, category = ?,
                    color = ?, is_recurring = ?, recurrence_pattern = ?,
                    recurrence_end_date = ?, updated_at = ?
                WHERE id = ?
            """, (
                event.title, event.description, event.start_date,
                event.start_time.strftime('%H:%M:%S') if event.start_time else None,
                event.end_date,
                event.end_time.strftime('%H:%M:%S') if event.end_time else None,
                event.is_all_day, event.category,
                event.color, event.is_recurring, event.recurrence_pattern,
                event.recurrence_end_date, datetime.now(), event.id
            ))
            
            success = cursor.rowcount > 0
            if success:
                conn.commit()
                logger.info(f"✅ Updated event: {event.title} (ID: {event.id})")
            else:
                logger.warning(f"⚠️ Event not found for update: ID {event.id}")
            
            return success
    
    def delete_event(self, event_id: int) -> bool:
        """🗑️ Delete event by ID."""
        with self.get_connection() as conn:
            cursor = conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
            success = cursor.rowcount > 0
            
            if success:
                conn.commit()
                logger.info(f"✅ Deleted event ID: {event_id}")
            else:
                logger.warning(f"⚠️ Event not found for deletion: ID {event_id}")
            
            return success
    
    def _row_to_event(self, row: sqlite3.Row) -> Event:
        """🔄 Convert database row to Event object."""
        # Convert string time values back to time objects
        start_time = None
        if row['start_time']:
            try:
                start_time = datetime.strptime(row['start_time'], '%H:%M:%S').time()
            except (ValueError, TypeError):
                start_time = None
        
        end_time = None
        if row['end_time']:
            try:
                end_time = datetime.strptime(row['end_time'], '%H:%M:%S').time()
            except (ValueError, TypeError):
                end_time = None
        
        return Event(
            id=row['id'],
            title=row['title'],
            description=row['description'] or '',
            start_date=row['start_date'],
            start_time=start_time,
            end_date=row['end_date'],
            end_time=end_time,
            is_all_day=bool(row['is_all_day']),
            category=row['category'],
            color=row['color'],
            is_recurring=bool(row['is_recurring']),
            recurrence_pattern=row['recurrence_pattern'],
            recurrence_end_date=row['recurrence_end_date'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def _generate_recurring_events(self, base_event: Event, target_date: date) -> List[Event]:
        """🔄 Generate recurring event instances for specific date."""
        if not base_event.is_recurring or not base_event.recurrence_pattern:
            return []
        
        # Simple recurring event generation
        # This is a basic implementation - could be expanded for complex patterns
        recurring_events = []
        
        if base_event.recurrence_pattern == 'daily':
            # Check if target_date matches daily recurrence
            if base_event.start_date is None:
                return []
            days_diff = (target_date - base_event.start_date).days
            if days_diff > 0 and days_diff % 1 == 0:
                if not base_event.recurrence_end_date or target_date <= base_event.recurrence_end_date:
                    recurring_event = Event(
                        id=None,  # Recurring instances don't have IDs
                        title=base_event.title,
                        description=base_event.description,
                        start_date=target_date,
                        start_time=base_event.start_time,
                        end_date=target_date,
                        end_time=base_event.end_time,
                        is_all_day=base_event.is_all_day,
                        category=base_event.category,
                        color=base_event.color,
                        is_recurring=False  # Instances are not recurring themselves
                    )
                    recurring_events.append(recurring_event)
        
        elif base_event.recurrence_pattern == 'weekly':
            # Check if target_date matches weekly recurrence
            if base_event.start_date is None:
                return []
            days_diff = (target_date - base_event.start_date).days
            if days_diff > 0 and days_diff % 7 == 0:
                if not base_event.recurrence_end_date or target_date <= base_event.recurrence_end_date:
                    recurring_event = Event(
                        id=None,
                        title=base_event.title,
                        description=base_event.description,
                        start_date=target_date,
                        start_time=base_event.start_time,
                        end_date=target_date,
                        end_time=base_event.end_time,
                        is_all_day=base_event.is_all_day,
                        category=base_event.category,
                        color=base_event.color,
                        is_recurring=False
                    )
                    recurring_events.append(recurring_event)
        
        return recurring_events
    
    def _generate_recurring_events_for_range(self, base_event: Event, start_date: date, end_date: date) -> List[Event]:
        """🔄 Generate recurring event instances for date range."""
        if not base_event.is_recurring or not base_event.recurrence_pattern:
            return []
        
        recurring_events = []
        if base_event.start_date is None:
            return []
        
        current_date = base_event.start_date
        
        while current_date <= end_date:
            if current_date >= start_date and current_date != base_event.start_date:
                if not base_event.recurrence_end_date or current_date <= base_event.recurrence_end_date:
                    recurring_event = Event(
                        id=None,
                        title=base_event.title,
                        description=base_event.description,
                        start_date=current_date,
                        start_time=base_event.start_time,
                        end_date=current_date,
                        end_time=base_event.end_time,
                        is_all_day=base_event.is_all_day,
                        category=base_event.category,
                        color=base_event.color,
                        is_recurring=False
                    )
                    recurring_events.append(recurring_event)
            
            # Advance to next occurrence
            if base_event.recurrence_pattern == 'daily':
                current_date = date.fromordinal(current_date.toordinal() + 1)
            elif base_event.recurrence_pattern == 'weekly':
                current_date = date.fromordinal(current_date.toordinal() + 7)
            elif base_event.recurrence_pattern == 'monthly':
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            else:
                break  # Unknown pattern
        
        return recurring_events
    
    def get_event_count(self) -> int:
        """📊 Get total number of events."""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM events")
            return cursor.fetchone()[0]
    
    def search_events(self, query: str, limit: int = 100) -> List[Event]:
        """🔍 Search events by title and description."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM events 
                WHERE title LIKE ? OR description LIKE ?
                ORDER BY start_date DESC, start_time
                LIMIT ?
            """, (f"%{query}%", f"%{query}%", limit))
            
            return [self._row_to_event(row) for row in cursor.fetchall()]