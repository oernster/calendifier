"""
📅 Calendar Manager for Calendar Application

This module manages calendar display logic and navigation.
"""

import logging
import calendar
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Tuple
from calendar_app.data.models import CalendarMonth, CalendarDay, Holiday, Event
from calendar_app.core.multi_country_holiday_provider import MultiCountryHolidayProvider
from calendar_app.core.event_manager import EventManager

logger = logging.getLogger(__name__)


class CalendarManager:
    """📅 Manages calendar display and navigation logic."""
    
    def __init__(self, event_manager: EventManager, holiday_provider: Optional[MultiCountryHolidayProvider] = None):
        """Initialize calendar manager with event and holiday providers."""
        self.event_manager = event_manager
        self.holiday_provider = holiday_provider or MultiCountryHolidayProvider()
        self.current_year = datetime.now().year
        self.current_month = datetime.now().month
        self.first_day_of_week = 0  # 0 = Monday, 6 = Sunday
        
        logger.info(f"📅 Calendar Manager initialized for {self.current_year}-{self.current_month:02d}")
    
    def get_month_data(self, year: int, month: int) -> CalendarMonth:
        """📆 Get calendar data for specified month."""
        try:
            # Get holidays for the month
            holidays = self.holiday_provider.get_holidays_for_month(year, month)
            holiday_dict = {h.date: h for h in holidays}
            
            # Get events for the month
            events = self.event_manager.get_events_for_month(year, month)
            
            # Group events by date
            events_by_date: Dict[date, List[Event]] = {}
            for event in events:
                if event.start_date:
                    if event.start_date not in events_by_date:
                        events_by_date[event.start_date] = []
                    events_by_date[event.start_date].append(event)
            
            # Generate calendar weeks
            weeks = self._generate_calendar_weeks(year, month, holiday_dict, events_by_date)
            
            calendar_month = CalendarMonth(
                year=year,
                month=month,
                weeks=weeks,
                holidays=holidays,
                events=events
            )
            
            logger.debug(f"📆 Generated calendar for {year}-{month:02d} with {len(holidays)} holidays and {len(events)} events")
            return calendar_month
            
        except Exception as e:
            logger.error(f"❌ Failed to get month data for {year}-{month:02d}: {e}")
            # Return empty calendar month
            return CalendarMonth(year=year, month=month)
    
    def _generate_calendar_weeks(self, year: int, month: int,
                                holiday_dict: Dict[date, Holiday],
                                events_by_date: Dict[date, List[Event]]) -> List[List[CalendarDay]]:
        """📅 Generate calendar weeks with days."""
        weeks = []
        today = date.today()
        
        # Use Python's calendar module to get the correct calendar structure
        cal = calendar.Calendar(firstweekday=self.first_day_of_week)
        month_calendar = cal.monthdatescalendar(year, month)
        
        for week_dates in month_calendar:
            week = []
            for day_date in week_dates:
                is_other_month = (day_date.month != month)
                
                # Create calendar day
                calendar_day = CalendarDay(
                    date=day_date,
                    is_today=(day_date == today),
                    is_weekend=self.holiday_provider.is_weekend(day_date),
                    is_other_month=is_other_month,
                    is_holiday=day_date in holiday_dict,
                    holiday=holiday_dict.get(day_date),
                    events=events_by_date.get(day_date, [])
                )
                
                week.append(calendar_day)
            
            weeks.append(week)
        
        return weeks
    
    def navigate_to_month(self, year: int, month: int) -> CalendarMonth:
        """🧭 Navigate to specific month and year."""
        if 1 <= month <= 12 and 1900 <= year <= 2100:
            self.current_year = year
            self.current_month = month
            logger.debug(f"🧭 Navigated to {year}-{month:02d}")
            return self.get_month_data(year, month)
        else:
            logger.warning(f"⚠️ Invalid date for navigation: {year}-{month:02d}")
            return self.get_current_month_data()
    
    def navigate_next_month(self) -> CalendarMonth:
        """▶️ Navigate to next month."""
        if self.current_month == 12:
            self.current_year += 1
            self.current_month = 1
        else:
            self.current_month += 1
        
        logger.debug(f"▶️ Next month: {self.current_year}-{self.current_month:02d}")
        return self.get_month_data(self.current_year, self.current_month)
    
    def navigate_previous_month(self) -> CalendarMonth:
        """◀️ Navigate to previous month."""
        if self.current_month == 1:
            self.current_year -= 1
            self.current_month = 12
        else:
            self.current_month -= 1
        
        logger.debug(f"◀️ Previous month: {self.current_year}-{self.current_month:02d}")
        return self.get_month_data(self.current_year, self.current_month)
    
    def navigate_next_year(self) -> CalendarMonth:
        """⏭️ Navigate to next year."""
        self.current_year += 1
        logger.debug(f"⏭️ Next year: {self.current_year}")
        return self.get_month_data(self.current_year, self.current_month)
    
    def navigate_previous_year(self) -> CalendarMonth:
        """⏮️ Navigate to previous year."""
        self.current_year -= 1
        logger.debug(f"⏮️ Previous year: {self.current_year}")
        return self.get_month_data(self.current_year, self.current_month)
    
    def jump_to_today(self) -> CalendarMonth:
        """📅 Jump to current date."""
        today = date.today()
        self.current_year = today.year
        self.current_month = today.month
        logger.debug(f"📅 Jumped to today: {today}")
        return self.get_month_data(self.current_year, self.current_month)
    
    def get_current_month_data(self) -> CalendarMonth:
        """📆 Get current month data."""
        return self.get_month_data(self.current_year, self.current_month)
    
    def get_holidays(self, year: int, month: int) -> List[Holiday]:
        """🌍 Get holidays for specified month."""
        return self.holiday_provider.get_holidays_for_month(year, month)
    
    def is_holiday(self, check_date: date) -> bool:
        """🌍 Check if date is a holiday."""
        return self.holiday_provider.is_holiday(check_date)
    
    def is_weekend(self, check_date: date) -> bool:
        """🏖️ Check if date is weekend."""
        return self.holiday_provider.is_weekend(check_date)
    
    def get_day_info(self, target_date: date) -> CalendarDay:
        """📋 Get detailed information for specific day."""
        # Get events for the day
        events = self.event_manager.get_events_for_date(target_date)
        
        # Get holiday info
        holiday = self.holiday_provider.get_holiday_object(target_date)
        
        # Create calendar day
        today = date.today()
        calendar_day = CalendarDay(
            date=target_date,
            is_today=(target_date == today),
            is_weekend=self.is_weekend(target_date),
            is_other_month=False,  # Assume current month context
            is_holiday=holiday is not None,
            holiday=holiday,
            events=events
        )
        
        return calendar_day
    
    def get_week_containing_date(self, target_date: date) -> List[CalendarDay]:
        """📅 Get week containing specific date."""
        # Find the Monday of the week containing target_date
        days_since_monday = target_date.weekday()
        monday = target_date - timedelta(days=days_since_monday)
        
        week_days = []
        for i in range(7):
            day_date = monday + timedelta(days=i)
            day_info = self.get_day_info(day_date)
            week_days.append(day_info)
        
        return week_days
    
    def get_month_summary(self, year: int, month: int) -> Dict[str, int]:
        """📊 Get summary statistics for month."""
        month_data = self.get_month_data(year, month)
        
        total_days = 0
        weekend_days = 0
        holiday_days = 0
        event_days = 0
        
        for week in month_data.weeks:
            for day in week:
                if not day.is_other_month:
                    total_days += 1
                    if day.is_weekend:
                        weekend_days += 1
                    if day.is_holiday:
                        holiday_days += 1
                    if day.has_events():
                        event_days += 1
        
        working_days = total_days - weekend_days - holiday_days
        
        return {
            'total_days': total_days,
            'working_days': working_days,
            'weekend_days': weekend_days,
            'holiday_days': holiday_days,
            'event_days': event_days,
            'total_events': len(month_data.events)
        }
    
    def find_next_event(self, from_date: Optional[date] = None) -> Optional[Event]:
        """➡️ Find next upcoming event."""
        if from_date is None:
            from_date = date.today()
        
        # Search in current and next few months
        for month_offset in range(6):  # Search 6 months ahead
            search_date = from_date + timedelta(days=30 * month_offset)
            events = self.event_manager.get_events_for_month(search_date.year, search_date.month)
            
            for event in events:
                if event.start_date and event.start_date > from_date:
                    return event
        
        return None
    
    def find_previous_event(self, from_date: Optional[date] = None) -> Optional[Event]:
        """⬅️ Find previous event."""
        if from_date is None:
            from_date = date.today()
        
        # Search in current and previous few months
        for month_offset in range(6):  # Search 6 months back
            search_date = from_date - timedelta(days=30 * month_offset)
            events = self.event_manager.get_events_for_month(search_date.year, search_date.month)
            
            # Sort events in reverse order
            events.sort(key=lambda e: e.start_date or date.min, reverse=True)
            
            for event in events:
                if event.start_date and event.start_date < from_date:
                    return event
        
        return None
    
    def get_events_in_date_range(self, start_date: date, end_date: date) -> List[Event]:
        """📅 Get events in date range."""
        all_events = []
        
        current_date = start_date
        while current_date <= end_date:
            events = self.event_manager.get_events_for_date(current_date)
            all_events.extend(events)
            current_date += timedelta(days=1)
        
        # Remove duplicates and sort
        unique_events = []
        seen_ids = set()
        
        for event in all_events:
            if event.id not in seen_ids:
                unique_events.append(event)
                if event.id:
                    seen_ids.add(event.id)
        
        unique_events.sort(key=lambda e: (e.start_date or date.min, e.start_time or datetime.min.time()))
        return unique_events
    
    def set_first_day_of_week(self, day: int):
        """⚙️ Set first day of week (0=Monday, 6=Sunday)."""
        if 0 <= day <= 6:
            self.first_day_of_week = day
            logger.info(f"⚙️ Set first day of week to {day}")
        else:
            logger.warning(f"⚠️ Invalid first day of week: {day}")
    
    def set_holiday_country(self, country_code: str):
        """🌍 Set holiday country code."""
        if self.holiday_provider:
            self.holiday_provider.set_country(country_code)
            logger.debug(f"🌍 Set holiday country to {country_code}")
    
    def get_holiday_country(self) -> str:
        """🌍 Get current holiday country code."""
        if self.holiday_provider:
            return self.holiday_provider.country_code
        return 'GB'
    
    def get_holiday_country_display_name(self) -> str:
        """🌍 Get current holiday country display name."""
        if self.holiday_provider:
            return self.holiday_provider.get_country_display_name()
        return "🇬🇧 United Kingdom"
    
    def refresh_holiday_translations(self) -> None:
        """🔄 Refresh holiday translations after locale change."""
        if self.holiday_provider:
            self.holiday_provider.refresh_translations()
            logger.debug("🌍 Holiday translations refreshed in calendar manager")
    
    def get_current_position(self) -> Tuple[int, int]:
        """📍 Get current year and month."""
        return (self.current_year, self.current_month)
    
    def get_day_names(self) -> List[str]:
        """📅 Get day names based on first day of week setting."""
        from calendar_app.localization.i18n_manager import get_i18n_manager
        
        # Get localized day names
        i18n = get_i18n_manager()
        day_names = [
            i18n.get_text("calendar.days_short.mon", default="Mon"),
            i18n.get_text("calendar.days_short.tue", default="Tue"),
            i18n.get_text("calendar.days_short.wed", default="Wed"),
            i18n.get_text("calendar.days_short.thu", default="Thu"),
            i18n.get_text("calendar.days_short.fri", default="Fri"),
            i18n.get_text("calendar.days_short.sat", default="Sat"),
            i18n.get_text("calendar.days_short.sun", default="Sun")
        ]
        
        # Rotate based on first day of week
        if self.first_day_of_week != 0:
            day_names = day_names[self.first_day_of_week:] + day_names[:self.first_day_of_week]
        
        return day_names
    
    def get_month_names(self) -> List[str]:
        """📅 Get list of month names."""
        from calendar_app.localization.i18n_manager import get_i18n_manager
        
        # Get localized month names
        i18n = get_i18n_manager()
        return [
            i18n.get_text("calendar.months.january", default="January"),
            i18n.get_text("calendar.months.february", default="February"),
            i18n.get_text("calendar.months.march", default="March"),
            i18n.get_text("calendar.months.april", default="April"),
            i18n.get_text("calendar.months.may", default="May"),
            i18n.get_text("calendar.months.june", default="June"),
            i18n.get_text("calendar.months.july", default="July"),
            i18n.get_text("calendar.months.august", default="August"),
            i18n.get_text("calendar.months.september", default="September"),
            i18n.get_text("calendar.months.october", default="October"),
            i18n.get_text("calendar.months.november", default="November"),
            i18n.get_text("calendar.months.december", default="December")
        ]
    
    def is_valid_date(self, year: int, month: int, day: int) -> bool:
        """✅ Check if date is valid."""
        try:
            date(year, month, day)
            return True
        except ValueError:
            return False
    
    def get_days_in_month(self, year: int, month: int) -> int:
        """📊 Get number of days in month."""
        return calendar.monthrange(year, month)[1]
    
    def is_leap_year(self, year: int) -> bool:
        """📅 Check if year is leap year."""
        return calendar.isleap(year)