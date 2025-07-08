# 🖥️ Desktop UI Components

This document provides a detailed explanation of the UI components used in the Calendifier desktop application, their relationships, and how they interact with the core services.

## Table of Contents

- [UI Architecture Overview](#ui-architecture-overview)
- [Main Window](#main-window)
- [Calendar View](#calendar-view)
- [Event Management](#event-management)
- [Settings Dialog](#settings-dialog)
- [Recurrence Dialog](#recurrence-dialog)
- [Theme System](#theme-system)
- [Responsive Design](#responsive-design)
- [Accessibility Features](#accessibility-features)

## UI Architecture Overview

The Calendifier desktop application uses PySide6 (Qt6) for its user interface. The UI follows the Model-View-Controller (MVC) pattern, with a clear separation between data models, views, and controllers.

### Component Hierarchy

```
MainWindow
├── MenuBar
├── ToolBar
├── CalendarWidget
│   ├── MonthView
│   ├── WeekView
│   ├── DayView
│   └── AgendaView
├── EventPanel
│   ├── EventList
│   └── EventDetails
├── StatusBar
└── Dialogs
    ├── EventDialog
    ├── RecurrenceDialog
    ├── SettingsDialog
    └── AboutDialog
```

### UI-Core Interaction

The UI components interact with the core services through a set of controller classes that mediate between the UI and the core. This ensures a clean separation of concerns and makes the code more maintainable.

```
UI Components <-> Controllers <-> Core Services <-> Data Storage
```

For example, when a user creates a new event:
1. The EventDialog UI component collects the event data
2. The EventController processes the data and calls the EventManager
3. The EventManager creates the event and stores it in the database
4. The CalendarWidget is updated to display the new event

## Main Window

The `MainWindow` class is the primary container for all UI components. It sets up the application's layout and manages the interactions between different components.

## Calendar View

The `CalendarWidget` class is the main component for displaying and interacting with the calendar. It supports multiple view modes (day, week, month, agenda) and handles event display and selection.

### View Modes

The calendar widget supports four view modes:

1. **Day View**: Shows a detailed view of a single day, with events displayed in time slots
2. **Week View**: Shows a week view with days as columns and events displayed in time slots
3. **Month View**: Shows a traditional month calendar with events displayed as colored blocks
4. **Agenda View**: Shows a list of upcoming events, grouped by date

Each view mode is implemented as a separate class that inherits from a common base class.

## Event Management

The event management UI consists of the `EventPanel` and `EventDialog` classes.

### Event Panel

The `EventPanel` displays a list of events for the selected date and allows the user to view, create, edit, and delete events.

### Event Dialog

The `EventDialog` is used to create and edit events. It provides fields for entering event details such as title, description, date, time, and category. It also includes a button to open the `RecurrenceDialog` for creating recurring events.

## Settings Dialog

The `SettingsDialog` allows users to configure application settings such as language, theme, date format, time format, and first day of the week.

## Recurrence Dialog

The `RecurrenceDialog` allows users to create and edit recurrence patterns for events. It provides a user-friendly interface for creating complex RRULE patterns without needing to understand the RRULE syntax.

The dialog includes options for:
- Frequency (daily, weekly, monthly, yearly)
- Interval (every X days, weeks, months, years)
- Weekly options (days of the week)
- Monthly options (day of month or position in month)
- Yearly options (month and day)
- End options (never, after X occurrences, on date)

The dialog also provides a summary of the recurrence rule and shows the next few occurrences to help users understand the pattern they're creating.

## Theme System

Calendifier supports multiple themes, including light mode, dark mode, and system theme. The theme system is implemented using Qt stylesheets and is managed by the `ThemeManager` class.

### Theme Manager

The `ThemeManager` class is responsible for loading and applying themes:

```python
class ThemeManager:
    """
    Manages application themes.
    """
    
    def __init__(self, app_controller):
        """
        Initialize the theme manager.
        
        Args:
            app_controller: Reference to the application controller
        """
        self.app_controller = app_controller
        self.logger = logging.getLogger(__name__)
        
        self.themes_dir = Path(__file__).parent / "themes"
        self.current_theme = "light"
        self.app = QApplication.instance()
    
    def apply_theme(self, theme_name):
        """
        Apply the specified theme.
        
        Args:
            theme_name: Name of the theme to apply
        
        Returns:
            True if theme was applied successfully, False otherwise
        """
        if theme_name == "system":
            # Use system theme
            self.logger.info("Using system theme")
            self.app.setStyle("Fusion")
            self.app.setPalette(self.app.style().standardPalette())
            return True
        
        # Load theme stylesheet
        theme_file = self.themes_dir / f"{theme_name}.qss"
        
        if not theme_file.exists():
            self.logger.warning(f"Theme file not found: {theme_file}")
            return False
        
        try:
            with open(theme_file, "r", encoding="utf-8") as f:
                stylesheet = f.read()
                
            # Apply stylesheet
            self.app.setStyleSheet(stylesheet)
            self.current_theme = theme_name
            
            self.logger.info(f"Applied theme: {theme_name}")
            return True
        except Exception as e:
            self.logger.error(f"Error applying theme {theme_name}: {e}")
            return False
    
    def get_available_themes(self):
        """
        Get list of available themes.
        
        Returns:
            List of available theme names
        """
        themes = ["light", "dark", "system"]
        
        # Add custom themes
        if self.themes_dir.exists():
            for file_path in self.themes_dir.glob("*.qss"):
                theme_name = file_path.stem
                if theme_name not in themes and theme_name not in ["light", "dark"]:
                    themes.append(theme_name)
        
        return themes
```

### Theme Files

Themes are defined using Qt stylesheets (QSS files) in the `themes` directory. Each theme file contains style rules for various UI components.

Example of a light theme (`light.qss`):

```css
/* Light Theme */

/* Global */
QWidget {
    background-color: #f5f5f5;
    color: #333333;
}

/* Main Window */
QMainWindow {
    background-color: #f5f5f5;
}

/* Menu Bar */
QMenuBar {
    background-color: #ffffff;
    border-bottom: 1px solid #e0e0e0;
}

QMenuBar::item {
    background-color: transparent;
    padding: 4px 8px;
}

QMenuBar::item:selected {
    background-color: #e0e0e0;
}

/* Menu */
QMenu {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
}

QMenu::item {
    padding: 4px 20px 4px 20px;
}

QMenu::item:selected {
    background-color: #e0e0e0;
}

/* Toolbar */
QToolBar {
    background-color: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    spacing: 4px;
}

/* Status Bar */
QStatusBar {
    background-color: #ffffff;
    border-top: 1px solid #e0e0e0;
}

/* Calendar Widget */
CalendarWidget {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
}

/* Event Panel */
EventPanel {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
}

/* Buttons */
QPushButton {
    background-color: #f0f0f0;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    padding: 4px 8px;
}

QPushButton:hover {
    background-color: #e0e0e0;
}

QPushButton:pressed {
    background-color: #d0d0d0;
}

/* Input Fields */
QLineEdit, QTextEdit, QDateEdit, QTimeEdit, QComboBox {
    background-color: #ffffff;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    padding: 4px;
}

/* List Widget */
QListWidget {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
}

QListWidget::item:selected {
    background-color: #e0e0e0;
    color: #333333;
}

/* Tab Widget */
QTabWidget::pane {
    border: 1px solid #e0e0e0;
    background-color: #ffffff;
}

QTabBar::tab {
    background-color: #f0f0f0;
    border: 1px solid #e0e0e0;
    border-bottom: none;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 4px 8px;
}

QTabBar::tab:selected {
    background-color: #ffffff;
}

/* Group Box */
QGroupBox {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin-top: 8px;
    padding-top: 16px;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    padding: 0 4px;
}
```

Example of a dark theme (`dark.qss`):

```css
/* Dark Theme */

/* Global */
QWidget {
    background-color: #2d2d2d;
    color: #f0f0f0;
}

/* Main Window */
QMainWindow {
    background-color: #2d2d2d;
}

/* Menu Bar */
QMenuBar {
    background-color: #3d3d3d;
    border-bottom: 1px solid #4d4d4d;
}

QMenuBar::item {
    background-color: transparent;
    padding: 4px 8px;
}

QMenuBar::item:selected {
    background-color: #4d4d4d;
}

/* Menu */
QMenu {
    background-color: #3d3d3d;
    border: 1px solid #4d4d4d;
}

QMenu::item {
    padding: 4px 20px 4px 20px;
}

QMenu::item:selected {
    background-color: #4d4d4d;
}

/* Toolbar */
QToolBar {
    background-color: #3d3d3d;
    border-bottom: 1px solid #4d4d4d;
    spacing: 4px;
}

/* Status Bar */
QStatusBar {
    background-color: #3d3d3d;
    border-top: 1px solid #4d4d4d;
}

/* Calendar Widget */
CalendarWidget {
    background-color: #3d3d3d;
    border: 1px solid #4d4d4d;
}

/* Event Panel */
EventPanel {
    background-color: #3d3d3d;
    border: 1px solid #4d4d4d;
}

/* Buttons */
QPushButton {
    background-color: #4d4d4d;
    border: 1px solid #5d5d5d;
    border-radius: 4px;
    padding: 4px 8px;
    color: #f0f0f0;
}

QPushButton:hover {
    background-color: #5d5d5d;
}

QPushButton:pressed {
    background-color: #6d6d6d;
}

/* Input Fields */
QLineEdit, QTextEdit, QDateEdit, QTimeEdit, QComboBox {
    background-color: #3d3d3d;
    border: 1px solid #5d5d5d;
    border-radius: 4px;
    padding: 4px;
    color: #f0f0f0;
}

/* List Widget */
QListWidget {
    background-color: #3d3d3d;
    border: 1px solid #4d4d4d;
}

QListWidget::item:selected {
    background-color: #5d5d5d;
    color: #f0f0f0;
}

/* Tab Widget */
QTabWidget::pane {
    border: 1px solid #4d4d4d;
    background-color: #3d3d3d;
}

QTabBar::tab {
    background-color: #4d4d4d;
    border: 1px solid #5d5d5d;
    border-bottom: none;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 4px 8px;
}

QTabBar::tab:selected {
    background-color: #3d3d3d;
}

/* Group Box */
QGroupBox {
    border: 1px solid #4d4d4d;
    border-radius: 4px;
    margin-top: 8px;
    padding-top: 16px;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    padding: 0 4px;
}
```

### Theme Switching

The theme can be changed at runtime through the `SettingsDialog`. When a new theme is selected, the `ThemeManager.apply_theme()` method is called to apply the new theme to the application.

## Responsive Design

Calendifier's UI is designed to be responsive and adapt to different screen sizes and resolutions. This is achieved through several techniques:

### Layout Management

The application uses Qt's layout management system to ensure that UI components resize appropriately when the window is resized:

1. **QHBoxLayout and QVBoxLayout**: Used for horizontal and vertical layouts
2. **QGridLayout**: Used for grid-based layouts
3. **QFormLayout**: Used for form-based layouts
4. **QSplitter**: Used to allow users to resize panels

### Size Policies

UI components use size policies to define how they should behave when the window is resized:

1. **Fixed**: The component maintains a fixed size
2. **Minimum**: The component can grow but not shrink below its minimum size
3. **Maximum**: The component can shrink but not grow beyond its maximum size
4. **Preferred**: The component has a preferred size but can grow or shrink
5. **Expanding**: The component expands to fill available space
6. **MinimumExpanding**: The component has a minimum size but prefers to expand

### Responsive Calendar Views

The calendar views are designed to adapt to different screen sizes:

1. **Day View**: Shows more or fewer hours based on available height
2. **Week View**: Adjusts column width based on available width
3. **Month View**: Adjusts cell size based on available space
4. **Agenda View**: Shows more or fewer events based on available height

### Window State Persistence

The application saves and restores the window state (size, position, maximized/minimized) between sessions, allowing users to customize the UI to their preferences.

## Accessibility Features

Calendifier includes several accessibility features to ensure that the application is usable by people with disabilities:

### Keyboard Navigation

All UI components can be navigated using the keyboard:

1. **Tab Order**: UI components have a logical tab order
2. **Keyboard Shortcuts**: Common actions have keyboard shortcuts
3. **Focus Indicators**: Focused components have a visible focus indicator

### Screen Reader Support

The application is designed to work with screen readers:

1. **Accessible Names**: All UI components have accessible names
2. **Accessible Descriptions**: Complex components have accessible descriptions
3. **Accessible Roles**: Components have appropriate accessible roles

### High Contrast Themes

The application includes high contrast themes for users with visual impairments:

1. **High Contrast Light**: A high contrast light theme
2. **High Contrast Dark**: A high contrast dark theme

### Font Size Adjustment

Users can adjust the font size to improve readability:

1. **Global Font Size**: The global font size can be adjusted in the settings
2. **Zoom**: The calendar view can be zoomed in and out

### Color Blindness Considerations

The application uses color schemes that are distinguishable by people with color blindness:

1. **Event Categories**: Event categories use colors that are distinguishable by people with color blindness
2. **UI Elements**: UI elements use colors with sufficient contrast

### Internationalization

The application supports multiple languages and locales, making it accessible to users around the world:

1. **40 Languages**: The application is translated into 40 languages
2. **Right-to-Left Support**: The application supports right-to-left languages
3. **Locale-Specific Formatting**: Dates, times, and numbers are formatted according to the user's locale