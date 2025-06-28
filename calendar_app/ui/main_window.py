"""
🏠 Main Window for Calendar Application

This module contains the main application window with layout and component integration.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QSplitter, QStatusBar, QMenuBar, QMenu, QMessageBox, QComboBox, QLabel, QDialog
)
from PySide6.QtCore import Qt, QTimer, Signal, QSize
from PySide6.QtGui import QAction, QIcon, QPixmap, QPainter, QFont

from calendar_app.ui.clock_widget import ClockWidget
from calendar_app.ui.calendar_widget import CalendarWidget
from calendar_app.ui.event_panel import EventPanel
from calendar_app.ui.notes_widget import NotesWidget
from calendar_app.ui.settings_dialog import SettingsDialog
from calendar_app.ui.about_dialog import AboutDialog
from calendar_app.config.themes import ThemeManager
from calendar_app.config.settings import SettingsManager
from calendar_app.localization import LocaleDetector, set_locale
from calendar_app.localization.i18n_manager import get_i18n_manager

def _(key: str, **kwargs) -> str:
    """Dynamic translation function that always uses current locale."""
    try:
        # Extract default before passing to get_text
        default = kwargs.pop('default', key)
        result = get_i18n_manager().get_text(key, **kwargs)
        # If result is the same as key, it means translation wasn't found
        if result == key and default != key:
            return default
        return result
    except Exception as e:
        # Fallback to default or key if translation fails
        return kwargs.get('default', key)
from version import get_version_string, get_about_text, APP_ICON, UI_EMOJIS

logger = logging.getLogger(__name__)


class MainWindow(QMainWindow):
    """🏠 Main application window."""
    
    # Signals
    theme_changed = Signal(str)
    settings_changed = Signal()
    
    def __init__(self, settings_manager: SettingsManager, theme_manager: ThemeManager):
        """Initialize main window."""
        super().__init__()
        
        self.settings_manager = settings_manager
        self.theme_manager = theme_manager
        
        # Flag to prevent recursive language changes
        self._changing_language = False
        
        # UI components
        self.clock_widget: Optional[ClockWidget] = None
        self.calendar_widget: Optional[CalendarWidget] = None
        self.event_panel: Optional[EventPanel] = None
        self.notes_widget: Optional[NotesWidget] = None
        self.central_splitter: Optional[QSplitter] = None
        self.language_combo: Optional[QComboBox] = None
        
        # Dialogs
        self.settings_dialog: Optional[SettingsDialog] = None
        self.about_dialog: Optional[AboutDialog] = None
        
        # Initialize UI
        self._setup_window()
        self._create_menu_bar()
        self._create_status_bar()
        self._create_central_widget()
        self._setup_connections()
        self._apply_theme()
        self._restore_geometry()
        
        # Force all widgets to use correct locale
        self._force_initial_localization()
        
        logger.debug("🏠 Main window initialized")
    
    def _setup_window(self):
        """🖥️ Setup main window properties."""
        self.setWindowTitle(_("main_window_title", version=get_version_string().split('v')[1]))
        # Set window size to ensure entire calendar is always fully visible (with week numbers)
        # Left panel: 400px + Right panel: 773px (with week numbers) + Main layout margins: 16px = 1189px width
        # Calendar height: 490px + header: 50px + event panel: 250px + margins: 150px = 940px minimum height
        self.setMinimumSize(1189, 940)
        self.setMaximumSize(1189, 16777215)  # Fixed width, flexible height
        
        # Create app icon from emoji
        self._create_app_icon()
        
        # Set window properties - disable maximize button across all platforms
        self.setWindowFlags(
            Qt.WindowType.Window |
            Qt.WindowType.WindowTitleHint |
            Qt.WindowType.WindowSystemMenuHint |
            Qt.WindowType.WindowMinimizeButtonHint |
            Qt.WindowType.WindowCloseButtonHint
        )
        
        # Disable maximize via window state
        import platform
        if platform.system() == "Darwin":  # macOS
            # On macOS, also disable the green maximize button
            self.setWindowFlag(Qt.WindowType.WindowMaximizeButtonHint, False)
        elif platform.system() == "Linux":
            # On Linux, ensure maximize is disabled
            self.setWindowFlag(Qt.WindowType.WindowMaximizeButtonHint, False)
        
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
    
    def _create_app_icon(self):
        """📅 Create application icon from emoji."""
        try:
            # Create multiple sizes for better icon quality
            sizes = [16, 24, 32, 48, 64, 128]
            icon = QIcon()
            
            for size in sizes:
                # Create a pixmap with the calendar emoji
                pixmap = QPixmap(size, size)
                pixmap.fill(Qt.GlobalColor.transparent)
                
                painter = QPainter(pixmap)
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                painter.setRenderHint(QPainter.RenderHint.TextAntialiasing)
                
                # Try to use font manager first, fallback to system font
                try:
                    from calendar_app.utils.font_manager import get_emoji_font
                    font = get_emoji_font(int(size * 0.8))
                except:
                    # Fallback to system emoji font
                    font = QFont()
                    font.setFamily("Segoe UI Emoji")  # Windows emoji font
                    font.setPixelSize(int(size * 0.8))
                
                painter.setFont(font)
                painter.drawText(pixmap.rect(), Qt.AlignmentFlag.AlignCenter, APP_ICON)
                painter.end()
                
                # Add this size to the icon
                icon.addPixmap(pixmap)
            
            self.setWindowIcon(icon)
            logger.debug(f"📅 Window icon created with calendar emoji: {APP_ICON}")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to create app icon: {e}")
    
    def _create_menu_bar(self):
        """📋 Create menu bar with fresh translations."""
        menubar = self.menuBar()
        
        # File menu
        self.file_menu = menubar.addMenu(f"📁 {_('menu_file')}")
        
        # Import action
        self.import_action = QAction(f"{UI_EMOJIS['import']} {_('menu_import')}", self)
        self.import_action.setShortcut("Ctrl+I")
        self.import_action.setStatusTip(_("info_import_placeholder"))
        self.import_action.triggered.connect(self._import_events)
        self.file_menu.addAction(self.import_action)
        
        # Export action
        self.export_action = QAction(f"{UI_EMOJIS['export']} {_('menu_export')}", self)
        self.export_action.setShortcut("Ctrl+E")
        self.export_action.setStatusTip(_("info_export_placeholder"))
        self.export_action.triggered.connect(self._export_events)
        self.file_menu.addAction(self.export_action)
        
        self.file_menu.addSeparator()
        
        # Exit action
        self.exit_action = QAction(f"❌ {_('menu_exit')}", self)
        self.exit_action.setShortcut("Ctrl+Q")
        self.exit_action.setStatusTip(_("menu_exit"))
        self.exit_action.triggered.connect(self.close)
        self.file_menu.addAction(self.exit_action)
        
        # View menu
        self.view_menu = menubar.addMenu(f"👁️ {_('menu_view')}")
        
        # Theme submenu
        self.theme_menu = self.view_menu.addMenu(f"🎨 {_('menu_theme')}")
        
        # Dark theme action
        self.dark_theme_action = QAction(f"{UI_EMOJIS['theme_dark']} {_('menu_theme_dark')}", self)
        self.dark_theme_action.setCheckable(True)
        self.dark_theme_action.setChecked(self.theme_manager.current_theme == "dark")
        self.dark_theme_action.triggered.connect(lambda: self._change_theme("dark"))
        self.theme_menu.addAction(self.dark_theme_action)
        
        # Light theme action
        self.light_theme_action = QAction(f"{UI_EMOJIS['theme_light']} {_('menu_theme_light')}", self)
        self.light_theme_action.setCheckable(True)
        self.light_theme_action.setChecked(self.theme_manager.current_theme == "light")
        self.light_theme_action.triggered.connect(lambda: self._change_theme("light"))
        self.theme_menu.addAction(self.light_theme_action)
        
        self.view_menu.addSeparator()
        
        # Today action
        self.today_action = QAction(f"{UI_EMOJIS['today']} {_('menu_today')}", self)
        self.today_action.setShortcut("Ctrl+T")
        self.today_action.setStatusTip(_("status_jumped_to_today"))
        self.today_action.triggered.connect(self._jump_to_today)
        self.view_menu.addAction(self.today_action)
        
        # Tools menu
        self.tools_menu = menubar.addMenu(f"🔧 {_('menu_tools')}")
        
        # Settings action
        self.settings_action = QAction(f"{UI_EMOJIS['settings']} {_('menu_settings')}", self)
        self.settings_action.setShortcut("Ctrl+,")
        self.settings_action.setStatusTip(_("menu_settings"))
        self.settings_action.triggered.connect(self._open_settings)
        self.tools_menu.addAction(self.settings_action)
        
        # Help menu
        self.help_menu = menubar.addMenu(f"❓ {_('menu_help')}")
        
        # About action
        self.about_action = QAction(f"{UI_EMOJIS['about']} {_('menu_about')}", self)
        self.about_action.setStatusTip(_("menu_about"))
        self.about_action.triggered.connect(self._show_about)
        self.help_menu.addAction(self.about_action)
    
    def _refresh_menu_text(self):
        """🔄 Refresh menu text after language change."""
        try:
            # Update menu titles
            if hasattr(self, 'file_menu'):
                self.file_menu.setTitle(f"📁 {_('menu_file')}")
            if hasattr(self, 'view_menu'):
                self.view_menu.setTitle(f"👁️ {_('menu_view')}")
            if hasattr(self, 'theme_menu'):
                self.theme_menu.setTitle(f"🎨 {_('menu_theme')}")
            if hasattr(self, 'tools_menu'):
                self.tools_menu.setTitle(f"🔧 {_('menu_tools')}")
            if hasattr(self, 'help_menu'):
                self.help_menu.setTitle(f"❓ {_('menu_help')}")
            
            # Update action texts
            if hasattr(self, 'import_action'):
                self.import_action.setText(f"{UI_EMOJIS['import']} {_('menu_import')}")
                self.import_action.setStatusTip(_("info_import_placeholder"))
            
            if hasattr(self, 'export_action'):
                self.export_action.setText(f"{UI_EMOJIS['export']} {_('menu_export')}")
                self.export_action.setStatusTip(_("info_export_placeholder"))
            
            if hasattr(self, 'exit_action'):
                self.exit_action.setText(f"❌ {_('menu_exit')}")
                self.exit_action.setStatusTip(_("menu_exit"))
            
            if hasattr(self, 'dark_theme_action'):
                self.dark_theme_action.setText(f"{UI_EMOJIS['theme_dark']} {_('menu_theme_dark')}")
            
            if hasattr(self, 'light_theme_action'):
                self.light_theme_action.setText(f"{UI_EMOJIS['theme_light']} {_('menu_theme_light')}")
            
            if hasattr(self, 'today_action'):
                self.today_action.setText(f"{UI_EMOJIS['today']} {_('menu_today')}")
                self.today_action.setStatusTip(_("status_jumped_to_today"))
            
            if hasattr(self, 'settings_action'):
                self.settings_action.setText(f"{UI_EMOJIS['settings']} {_('menu_settings')}")
                self.settings_action.setStatusTip(_("menu_settings"))
            
            if hasattr(self, 'about_action'):
                self.about_action.setText(f"{UI_EMOJIS['about']} {_('menu_about')}")
                self.about_action.setStatusTip(_("menu_about"))
            
            logger.debug("🔄 Menu text refreshed")
            
        except Exception as e:
            logger.error(f"❌ Failed to refresh menu text: {e}")
    
    def _rebuild_menu_bar(self):
        """🔄 Completely rebuild menu bar with fresh translations."""
        try:
            # Clear existing menu bar
            self.menuBar().clear()
            
            # Recreate all menus with fresh translations
            self._create_menu_bar()
            
            logger.debug("🔄 Menu bar rebuilt with fresh translations")
            
        except Exception as e:
            logger.error(f"❌ Failed to rebuild menu bar: {e}")
    
    def _create_status_bar(self):
        """📊 Create status bar."""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        # Enable size grip (the small square in bottom right)
        self.status_bar.setSizeGripEnabled(True)
        
        # Add language selector to status bar
        self._create_language_selector()
        
        # Show ready message
        self.status_bar.showMessage(f"✅ {_('status_ready', app_name=_('app_name'))}")
    
    def _create_language_selector(self):
        """🌍 Create language selector in status bar."""
        # Create language selector widget
        language_widget = QWidget()
        language_layout = QHBoxLayout(language_widget)
        language_layout.setContentsMargins(5, 0, 5, 0)
        language_layout.setSpacing(5)
        
        # Language label
        language_label = QLabel("🌍")
        language_label.setToolTip(_("label_language", default="Language"))
        language_layout.addWidget(language_label)
        
        # Language combo box
        self.language_combo = QComboBox()
        self.language_combo.setMinimumWidth(200)
        self.language_combo.setMaximumWidth(250)
        self.language_combo.setToolTip(_("label_language", default="Language"))
        
        # Populate languages with translated names from current locale
        sorted_locales = LocaleDetector.get_sorted_locales()
        for locale_code, locale_info in sorted_locales:
            # Use native language names (always in mother tongue)
            native_name = locale_info['native']
            display_text = f"{locale_info['flag']} {native_name}"
            self.language_combo.addItem(display_text, locale_code)
        
        # Set current locale
        current_locale = self.settings_manager.get_locale()
        language_index = self.language_combo.findData(current_locale)
        if language_index >= 0:
            self.language_combo.setCurrentIndex(language_index)
        
        # Connect signal
        self.language_combo.currentIndexChanged.connect(self._on_language_changed)
        
        language_layout.addWidget(self.language_combo)
        
        # Add to status bar (right side)
        self.status_bar.addPermanentWidget(language_widget)
    
    def _refresh_language_selector(self):
        """🔄 Refresh language selector with translated names."""
        try:
            # Save current selection
            current_locale = self.language_combo.currentData()
            
            # Temporarily disconnect signal to prevent recursive calls
            self.language_combo.currentIndexChanged.disconnect()
            
            # Clear and repopulate with translated names
            self.language_combo.clear()
            sorted_locales = LocaleDetector.get_sorted_locales()
            for locale_code, locale_info in sorted_locales:
                # Use native language names (always in mother tongue)
                native_name = locale_info['native']
                display_text = f"{locale_info['flag']} {native_name}"
                self.language_combo.addItem(display_text, locale_code)
            
            # Restore selection
            if current_locale:
                language_index = self.language_combo.findData(current_locale)
                if language_index >= 0:
                    self.language_combo.setCurrentIndex(language_index)
            
            # Reconnect signal
            self.language_combo.currentIndexChanged.connect(self._on_language_changed)
            
            logger.debug("🔄 Language selector refreshed with translated names")
            
        except Exception as e:
            logger.error(f"❌ Failed to refresh language selector: {e}")
            # Make sure signal is reconnected even on error
            try:
                self.language_combo.currentIndexChanged.connect(self._on_language_changed)
            except:
                pass
    
    def _on_language_changed(self):
        """🌍 Handle language change."""
        try:
            # Prevent recursive calls during UI refresh
            if self._changing_language:
                logger.debug("🌍 Ignoring language change during refresh")
                return
                
            selected_locale = self.language_combo.currentData()
            current_locale = self.settings_manager.get_locale()
            
            logger.debug(f"🌍 Language change triggered: {current_locale} -> {selected_locale}")
            
            if selected_locale and selected_locale != current_locale:
                logger.debug(f"🌍 Changing language from {current_locale} to {selected_locale}")
                
                # Set flag to prevent recursive calls
                self._changing_language = True
                
                try:
                    # Save to settings FIRST
                    self.settings_manager.set_locale(selected_locale)
                    
                    # Set global locale with FORCE reload - CRITICAL FIX
                    from calendar_app.localization.i18n_manager import get_i18n_manager
                    from calendar_app.localization import set_locale
                    
                    # Use the proper set_locale function which updates the global manager
                    set_locale(selected_locale)
                    
                    # Get the manager and force complete reload
                    i18n_manager = get_i18n_manager()
                    i18n_manager.clear_cache()  # Clear all cached translations
                    i18n_manager._load_locale(selected_locale)  # Force reload the new locale
                    i18n_manager._set_system_locale()
                    
                    # Update holiday country if needed
                    locale_country = LocaleDetector.get_country_from_locale(selected_locale)
                    current_holiday_country = self.settings_manager.get_holiday_country()
                    if current_holiday_country == 'GB' or current_holiday_country != locale_country:
                        self.settings_manager.set_holiday_country(locale_country)
                        # Update holiday provider and calendar
                        if hasattr(self, 'holiday_provider') and self.holiday_provider:
                            self.holiday_provider.set_country(locale_country)
                        if self.calendar_widget:
                            self.calendar_widget.set_holiday_country(locale_country)
                            self.calendar_widget.refresh_calendar()
                    
                    # CRITICAL FIX: Refresh holiday translations for the new locale
                    # This ensures holidays are displayed in the correct language
                    if hasattr(self, 'holiday_provider') and self.holiday_provider:
                        self.holiday_provider.refresh_translations()
                        logger.debug("🌍 Holiday translations refreshed for new locale")
                    
                    # Also refresh calendar widget's holiday provider if it has one
                    if self.calendar_widget and hasattr(self.calendar_widget, 'holiday_provider'):
                        if self.calendar_widget.holiday_provider:
                            self.calendar_widget.holiday_provider.refresh_translations()
                            logger.debug("🌍 Calendar widget holiday translations refreshed")
                    
                    # Force calendar refresh to show translated holidays
                    if self.calendar_widget:
                        self.calendar_widget.refresh_calendar()
                    
                    # FORCE COMPLETE UI REFRESH
                    logger.debug("🔄 FORCING COMPLETE UI REFRESH after language change")
                    self._force_complete_ui_refresh()
                    
                    # Show status message
                    locale_info = LocaleDetector.get_locale_info(selected_locale)
                    if locale_info:
                        self.status_bar.showMessage(
                            f"🌍 {_('status_language_changed', language=locale_info['name'], default='Language changed to {language}')}",
                            3000
                        )
                    
                    logger.debug(f"🌍 Language changed to {selected_locale}")
                    
                finally:
                    # Always clear the flag
                    self._changing_language = False
                    
            else:
                logger.debug(f"🌍 No language change needed: {selected_locale}")
                
        except Exception as e:
            logger.error(f"❌ Failed to change language: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Make sure flag is cleared on error
            self._changing_language = False
    
    def _force_complete_ui_refresh(self):
        """🔄 Force complete UI refresh after language change using standardized pattern."""
        try:
            from PySide6.QtCore import QCoreApplication
            
            logger.debug("🔄 Starting standardized UI refresh...")
            
            # Step 1: Update window title
            self.setWindowTitle(_("main_window_title", version=get_version_string().split('v')[1]))
            
            # Step 2: REBUILD MENU BAR COMPLETELY (safer than trying to refresh)
            logger.debug("🔄 Rebuilding menu bar...")
            self._rebuild_menu_bar()
            
            # Step 3: Update status bar with translated text
            self.status_bar.showMessage(f"✅ {_('status_ready', app_name=_('app_name'))}")
            
            # Step 4: Update language selector tooltip and rebuild with translated names
            if self.language_combo:
                self.language_combo.setToolTip(_("label_language", default="Language"))
                self._refresh_language_selector()
            
            # Step 5: STANDARDIZED WIDGET REFRESH - Call refresh_ui_text() on all widgets
            logger.debug("🔄 Calling standardized refresh methods on all widgets...")
            
            # Clock widget - use standardized refresh method
            if self.clock_widget and hasattr(self.clock_widget, 'refresh_ui_text'):
                logger.debug("🔄 Refreshing clock widget...")
                self.clock_widget.refresh_ui_text()
            
            # Calendar widget - use standardized refresh method
            if self.calendar_widget and hasattr(self.calendar_widget, 'refresh_ui_text'):
                logger.debug("🔄 Refreshing calendar widget...")
                self.calendar_widget.refresh_ui_text()
            
            # Event panel - use standardized refresh method
            if self.event_panel and hasattr(self.event_panel, 'refresh_ui_text'):
                logger.debug("🔄 Refreshing event panel...")
                self.event_panel.refresh_ui_text()
            
            # Notes widget - use standardized refresh method
            if self.notes_widget and hasattr(self.notes_widget, 'refresh_ui_text'):
                logger.debug("🔄 Refreshing notes widget...")
                self.notes_widget.refresh_ui_text()
            
            # Step 6: Process events to ensure all updates are applied
            logger.debug("🔄 Processing events...")
            for i in range(5):
                QCoreApplication.processEvents()
                if i % 2 == 0:
                    self.update()
            
            # Step 7: Force complete visual refresh of entire window
            logger.debug("🔄 Final window refresh...")
            self.update()
            self.repaint()
            
            # Step 8: Refresh existing dialogs or close them to ensure they use new language
            if self.settings_dialog and hasattr(self.settings_dialog, 'refresh_ui_text'):
                logger.debug("🔄 Refreshing settings dialog...")
                self.settings_dialog.refresh_ui_text()
            
            # Close about dialog if open - it will be recreated with correct language when reopened
            if self.about_dialog and self.about_dialog.isVisible():
                logger.debug("🔄 Closing about dialog to avoid layout conflicts...")
                self.about_dialog.close()
                self.about_dialog = None
            
            # Also refresh any event dialogs that might be open
            # Note: Event dialogs are typically modal and short-lived, but we should handle them
            for child in self.findChildren(QDialog):
                if hasattr(child, 'refresh_ui_text') and child.isVisible():
                    logger.debug(f"🔄 Refreshing dialog: {child.__class__.__name__}")
                    child.refresh_ui_text()
            
            # Final event processing
            QCoreApplication.processEvents()
            
            logger.debug("🔄 Standardized UI refresh completed!")
            
        except Exception as e:
            logger.error(f"❌ Failed to force complete UI refresh: {e}")
            import traceback
            logger.error(traceback.format_exc())

    def _create_central_widget(self):
        """️ Create central widget with layout."""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Create main horizontal splitter
        self.central_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Create left panel (clock and controls)
        left_panel = self._create_left_panel()
        
        # Create right panel (calendar and events)
        right_panel = self._create_right_panel()
        
        # Add panels to splitter
        self.central_splitter.addWidget(left_panel)
        self.central_splitter.addWidget(right_panel)
        
        # Set splitter proportions (400px : 800px)
        self.central_splitter.setSizes([400, 800])
        self.central_splitter.setCollapsible(0, False)
        self.central_splitter.setCollapsible(1, False)
        
        # Create main layout
        main_layout = QHBoxLayout(central_widget)
        main_layout.addWidget(self.central_splitter)
        main_layout.setContentsMargins(8, 8, 8, 8)
    
    def _create_left_panel(self) -> QWidget:
        """🕐 Create left panel with clock and notes."""
        left_panel = QWidget()
        left_panel.setFixedWidth(400)
        
        layout = QVBoxLayout(left_panel)
        layout.setSpacing(16)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # Clock widget (now centered within itself)
        self.clock_widget = ClockWidget()
        layout.addWidget(self.clock_widget)
        
        # Notes widget
        self.notes_widget = NotesWidget()
        layout.addWidget(self.notes_widget)
        
        return left_panel
    
    def _create_right_panel(self) -> QWidget:
        """📅 Create right panel with calendar and events."""
        right_panel = QWidget()
        
        # Set maximum width to accommodate week numbers when enabled
        # Calendar width: 737px (with week numbers) + margins: 16px + some padding: 20px = 773px
        right_panel.setMaximumWidth(773)
        
        layout = QVBoxLayout(right_panel)
        layout.setSpacing(8)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # Calendar widget
        self.calendar_widget = CalendarWidget()
        layout.addWidget(self.calendar_widget, 3)  # Balanced space for calendar
        
        # Event panel (will be injected with event manager later)
        self.event_panel = EventPanel()
        layout.addWidget(self.event_panel, 2)  # Appropriate space for events
        
        return right_panel
    
    def _setup_connections(self):
        """🔗 Setup signal connections between components."""
        if self.calendar_widget and self.event_panel:
            # Connect calendar date selection to event panel
            def debug_date_selected(selected_date):
                logger.debug(f"📅 DEBUG: Main window received date_selected signal for: {selected_date}")
                self.event_panel.show_events_for_date(selected_date)
            
            self.calendar_widget.date_selected.connect(debug_date_selected)
            
            # Connect event panel changes to calendar refresh
            self.event_panel.event_created.connect(
                self.calendar_widget.refresh_calendar
            )
            self.event_panel.event_updated.connect(
                self.calendar_widget.refresh_calendar
            )
            self.event_panel.event_deleted.connect(
                self.calendar_widget.refresh_calendar
            )
        
        # Connect clock widget signals
        if self.clock_widget:
            self.clock_widget.theme_changed.connect(self._change_theme)
            self.clock_widget.settings_requested.connect(self._open_settings)
            self.clock_widget.about_requested.connect(self._show_about)
        
        # Connect theme changes
        self.theme_changed.connect(self._apply_theme)
    
    def _apply_theme(self):
        """🎨 Apply current theme to the window."""
        try:
            qss = self.theme_manager.generate_qss_stylesheet()
            self.setStyleSheet(qss)
            
            # Update theme action states
            if hasattr(self, 'dark_theme_action') and hasattr(self, 'light_theme_action'):
                self.dark_theme_action.setChecked(self.theme_manager.current_theme == "dark")
                self.light_theme_action.setChecked(self.theme_manager.current_theme == "light")
            
            # Update clock widget theme controls
            if self.clock_widget and hasattr(self.clock_widget, 'theme_controls'):
                self.clock_widget.theme_controls.update_theme(self.theme_manager.current_theme)
            
            logger.debug(f"🎨 Applied theme: {self.theme_manager.current_theme}")
            
        except Exception as e:
            logger.error(f"❌ Failed to apply theme: {e}")
    
    def _restore_geometry(self):
        """🖥️ Restore window geometry from settings."""
        try:
            geometry = self.settings_manager.get_window_geometry()
            
            # Set size to our fixed dimensions
            self.resize(1159, geometry['height'])
            
            # Always center on screen for optimal positioning
            self._center_on_screen()
            
            logger.debug(f"🖥️ Restored window geometry and centered on screen")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to restore geometry: {e}")
            # Set default size and center
            self.resize(1159, 940)
            self._center_on_screen()
    
    def _center_on_screen(self):
        """🎯 Center window on screen."""
        try:
            screen = self.screen()
            if screen:
                screen_geometry = screen.availableGeometry()
                window_geometry = self.frameGeometry()
                
                center_point = screen_geometry.center()
                window_geometry.moveCenter(center_point)
                self.move(window_geometry.topLeft())
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to center window: {e}")
    
    def _save_geometry(self):
        """💾 Save current window geometry."""
        try:
            geometry = self.geometry()
            self.settings_manager.set_window_geometry(
                geometry.width(),
                geometry.height(),
                geometry.x(),
                geometry.y()
            )
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to save geometry: {e}")
    
    # Menu action handlers
    
    def _change_theme(self, theme_name: str):
        """🎨 Change application theme."""
        if self.theme_manager.set_theme(theme_name):
            self.settings_manager.set_theme(theme_name)
            
            # Apply the theme (this will update both menu items and clock widget controls)
            self._apply_theme()
            
            self.theme_changed.emit(theme_name)
            self.status_bar.showMessage(_("status_theme_changed", theme=theme_name), 2000)
    
    def _jump_to_today(self):
        """📅 Jump to today's date."""
        if self.calendar_widget:
            self.calendar_widget.jump_to_today()
            self.status_bar.showMessage(_("status_jumped_to_today"), 2000)
    
    def _import_events(self):
        """📥 Import events from file."""
        from PySide6.QtWidgets import QFileDialog
        
        try:
            # Open file dialog for import
            file_path, selected_filter = QFileDialog.getOpenFileName(
                self,
                _("import_events", default="Import Events"),
                "",
                "iCalendar Files (*.ics);;CSV Files (*.csv);;JSON Files (*.json);;All Files (*.*)"
            )
            
            if file_path:
                # For now, show success message with file path
                # TODO: Implement actual import functionality
                QMessageBox.information(
                    self,
                    f"{UI_EMOJIS['import']} {_('import_events', default='Import Events')}",
                    f"{_('import_success', count=0, default='Successfully imported 0 items')}\n\n{_('file_not_found', file=file_path, default='Selected file: {file}')}"
                )
                
        except Exception as e:
            QMessageBox.critical(
                self,
                _("error_title", default="Error"),
                f"{_('import_error', error=str(e), default='Error importing file: {error}')}"
            )
    
    def _export_events(self):
        """📤 Export events to file."""
        from PySide6.QtWidgets import QFileDialog
        
        try:
            # Open file dialog for export
            file_path, selected_filter = QFileDialog.getSaveFileName(
                self,
                _("export_events", default="Export Events"),
                "calendar_export.ics",
                "iCalendar Files (*.ics);;CSV Files (*.csv);;JSON Files (*.json);;All Files (*.*)"
            )
            
            if file_path:
                # For now, show success message with file path
                # TODO: Implement actual export functionality
                QMessageBox.information(
                    self,
                    f"{UI_EMOJIS['export']} {_('export_events', default='Export Events')}",
                    f"{_('export_success', count=0, file=file_path, default='Successfully exported 0 items to {file}')}"
                )
                
        except Exception as e:
            QMessageBox.critical(
                self,
                _("error_title", default="Error"),
                f"{_('export_error', error=str(e), default='Error exporting file: {error}')}"
            )
    
    def _open_settings(self):
        """⚙️ Open settings dialog."""
        # Always create a fresh settings dialog to ensure correct language
        # This avoids language switching issues and ensures current translations
        if self.settings_dialog:
            self.settings_dialog.close()
            self.settings_dialog = None
        
        self.settings_dialog = SettingsDialog(
            self.settings_manager,
            self.theme_manager,
            self
        )
        self.settings_dialog.settings_changed.connect(self._on_settings_changed)
        
        self.settings_dialog.show()
        self.settings_dialog.raise_()
        self.settings_dialog.activateWindow()
    
    def _show_about(self):
        """ℹ️ Show about dialog."""
        # Always create a fresh dialog to ensure correct language
        # This avoids layout conflicts and ensures current translations
        if self.about_dialog:
            self.about_dialog.close()
            self.about_dialog = None
        
        self.about_dialog = AboutDialog(self)
        self.about_dialog.show()
        self.about_dialog.raise_()
        self.about_dialog.activateWindow()
    
    def _on_settings_changed(self):
        """⚙️ Handle settings changes."""
        # Apply new theme if changed
        current_theme = self.settings_manager.get_theme()
        if current_theme != self.theme_manager.current_theme:
            self._change_theme(current_theme)
        
        # Update calendar settings if changed
        if self.calendar_widget:
            calendar_settings = self.settings_manager.get_calendar_settings()
            
            # Update first day of week
            self.calendar_widget.set_first_day_of_week(calendar_settings['first_day_of_week'])
            
            # Update show week numbers setting
            show_week_numbers = calendar_settings['show_week_numbers']
            # Week numbers are always enabled - no need to set
            logger.debug(f"📊 Week numbers are always enabled")
            
            # Update holiday country
            holiday_country = calendar_settings.get('holiday_country', 'GB')
            self.calendar_widget.set_holiday_country(holiday_country)
            
            # Refresh calendar to show new holidays
            self.calendar_widget.refresh_calendar()
        
        # Emit settings changed signal
        self.settings_changed.emit()
        
        self.status_bar.showMessage(_("status_settings_updated"), 2000)
    
    # Event handlers
    
    def closeEvent(self, event):
        """🔚 Handle window close event."""
        try:
            # Save window geometry
            self._save_geometry()
            
            # Save notes
            if self.notes_widget:
                self.notes_widget.save_all_notes()
            
            # Close dialogs
            if self.settings_dialog:
                self.settings_dialog.close()
            if self.about_dialog:
                self.about_dialog.close()
            
            logger.debug("🔚 Main window closing")
            event.accept()
            
        except Exception as e:
            logger.error(f"❌ Error during close: {e}")
            event.accept()
    
    def resizeEvent(self, event):
        """📏 Handle window resize event."""
        super().resizeEvent(event)
        
        # Update splitter sizes to maintain proportions
        if self.central_splitter:
            total_width = event.size().width() - 32  # Account for margins
            left_width = min(400, total_width // 3)
            right_width = total_width - left_width
            self.central_splitter.setSizes([left_width, right_width])
    
    # Public methods
    
    def get_clock_widget(self) -> Optional[ClockWidget]:
        """🕐 Get clock widget reference."""
        return self.clock_widget
    
    def get_calendar_widget(self) -> Optional[CalendarWidget]:
        """📅 Get calendar widget reference."""
        return self.calendar_widget
    
    def get_event_panel(self) -> Optional[EventPanel]:
        """📝 Get event panel reference."""
        return self.event_panel
    
    def get_notes_widget(self) -> Optional[NotesWidget]:
        """📝 Get notes widget reference."""
        return self.notes_widget
    
    def show_status_message(self, message: str, timeout: int = 0):
        """📊 Show message in status bar."""
        self.status_bar.showMessage(message, timeout)
    
    def set_event_manager(self, event_manager):
        """📝 Set event manager for event panel."""
        if self.event_panel and hasattr(self.event_panel, 'set_event_manager'):
            self.event_panel.set_event_manager(event_manager)
            logger.debug("✅ Event manager injected into event panel via main window")
    
    def set_holiday_provider(self, holiday_provider):
        """🌍 Set holiday provider for locale-aware holiday translations."""
        self.holiday_provider = holiday_provider
        logger.debug("✅ Holiday provider injected into main window")
    
    def set_calendar_manager(self, calendar_manager):
        """📅 Set calendar manager and apply initial settings."""
        if self.calendar_widget:
            self.calendar_widget.set_calendar_manager(calendar_manager)
            
            # Apply initial calendar settings
            calendar_settings = self.settings_manager.get_calendar_settings()
            logger.debug(f"📊 Initial calendar settings: {calendar_settings}")
            
            self.calendar_widget.set_first_day_of_week(calendar_settings['first_day_of_week'])
            
            show_week_numbers = calendar_settings['show_week_numbers']
            # Week numbers are always enabled - no need to set
            logger.debug(f"📊 Week numbers are always enabled")
            
            self.calendar_widget.set_holiday_country(calendar_settings.get('holiday_country', 'GB'))
            
            logger.debug("✅ Calendar manager injected and initial settings applied")
    

    def _force_initial_localization(self):
        """🌍 Force all widgets to use correct locale after creation."""
        try:
            # Use dynamic translation function (already defined above)
            from PySide6.QtCore import QCoreApplication
            
            # This method is called after all widgets are created to ensure
            # they display in the correct language from the start
            
            # Force complete UI refresh
            self._force_complete_ui_refresh()
            
            # Additional forced updates for stubborn elements
            if self.calendar_widget and hasattr(self.calendar_widget, 'header'):
                # Force month display update
                self.calendar_widget.header._update_display()
                
                # Force day headers update with localized names (safely)
                if hasattr(self.calendar_widget, 'grid'):
                    try:
                        # Use the global translation function that's already defined
                        from calendar_app.localization.i18n_manager import get_i18n_manager
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
                        if hasattr(self.calendar_widget.grid, '_update_day_headers'):
                            self.calendar_widget.grid._update_day_headers(day_names)
                    except Exception as day_error:
                        logger.warning(f"⚠️ Failed to update day headers: {day_error}")
            
            # Force complete visual refresh multiple times
            for _ in range(5):
                self.update()
                self.repaint()
                QCoreApplication.processEvents()
            
            logger.debug("🌍 Forced initial localization complete")
            
        except Exception as e:
            logger.error(f"❌ Failed to force initial localization: {e}")

    def update_window_title(self, subtitle: str = ""):
        """📝 Update window title with optional subtitle."""
        base_title = get_version_string()
        if subtitle:
            self.setWindowTitle(f"{base_title} - {subtitle}")
        else:
            self.setWindowTitle(base_title)