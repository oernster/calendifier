"""
📝 Event Dialog for Calendar Application

This module contains the event creation and editing dialog.
"""

import logging
from datetime import date, time, datetime
from typing import Optional
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLabel, QLineEdit, QTextEdit, QComboBox, QDateEdit,
    QTimeEdit, QCheckBox, QPushButton, QDialogButtonBox,
    QMessageBox, QWidget
)
from PySide6.QtCore import Qt, QDate, QTime, Signal
from PySide6.QtGui import QFont

from calendar_app.data.models import Event
from calendar_app.localization import get_i18n_manager
from version import UI_EMOJIS, EVENT_CATEGORY_EMOJIS

logger = logging.getLogger(__name__)


def _(key: str, **kwargs) -> str:
    """Dynamic translation function that gets current locale text."""
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


class EventDialog(QDialog):
    """📝 Event creation and editing dialog."""
    
    event_saved = Signal(Event)
    
    def __init__(self, event_data: Optional[Event] = None, selected_date: Optional[date] = None, parent=None):
        """Initialize event dialog."""
        super().__init__(parent)
        
        self.event_data = event_data
        self.selected_date = selected_date or date.today()
        self.is_editing = event_data is not None
        
        self._setup_ui()
        self._load_event_data()
        self._refresh_qt_widgets_locale()  # Apply locale immediately
        
        logger.debug(f"📝 Event dialog initialized ({'editing' if self.is_editing else 'creating'})")
    
    def _setup_ui(self):
        """🏗️ Setup event dialog UI."""
        title = f"{UI_EMOJIS['edit_event']} {_('event_dialog_edit_title')}" if self.is_editing else f"{UI_EMOJIS['add_event']} {_('event_dialog_add_title')}"
        self.setWindowTitle(title)
        self.setModal(True)
        self.resize(400, 500)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(16, 16, 16, 16)
        
        # Use VBoxLayout with HBoxLayout rows instead of QFormLayout to avoid label borders
        form_widget = QWidget()
        form_layout = QVBoxLayout(form_widget)
        form_layout.setSpacing(12)
        
        # Title
        title_row = QHBoxLayout()
        title_label = QLabel(f"📝 {_('label_title')}")
        title_label.setStyleSheet("border: none; padding: 0; margin: 0;")
        title_label.setMinimumWidth(100)
        self.title_edit = QLineEdit()
        self.title_edit.setPlaceholderText(_("placeholder_enter_event_title"))
        title_row.addWidget(title_label)
        title_row.addWidget(self.title_edit)
        form_layout.addLayout(title_row)
        
        # Category
        category_row = QHBoxLayout()
        category_label = QLabel(f"📂 {_('label_category')}")
        category_label.setStyleSheet("border: none; padding: 0; margin: 0;")
        category_label.setMinimumWidth(100)
        self.category_combo = QComboBox()
        for category, emoji in EVENT_CATEGORY_EMOJIS.items():
            localized_name = _(f"category_{category}")
            self.category_combo.addItem(f"{emoji} {localized_name}", category)
        category_row.addWidget(category_label)
        category_row.addWidget(self.category_combo)
        form_layout.addLayout(category_row)
        
        # Date
        date_row = QHBoxLayout()
        date_label = QLabel(f"📅 {_('label_date')}")
        date_label.setStyleSheet("border: none; padding: 0; margin: 0;")
        date_label.setMinimumWidth(100)
        self.date_edit = QDateEdit()
        self.date_edit.setDate(QDate(self.selected_date.year, self.selected_date.month, self.selected_date.day))
        self.date_edit.setCalendarPopup(True)
        date_row.addWidget(date_label)
        date_row.addWidget(self.date_edit)
        form_layout.addLayout(date_row)
        
        # All day checkbox
        allday_row = QHBoxLayout()
        allday_spacer = QLabel("")
        allday_spacer.setStyleSheet("border: none; padding: 0; margin: 0;")
        allday_spacer.setMinimumWidth(100)
        self.all_day_check = QCheckBox(_("label_all_day_event"))
        self.all_day_check.toggled.connect(self._on_all_day_toggled)
        allday_row.addWidget(allday_spacer)
        allday_row.addWidget(self.all_day_check)
        form_layout.addLayout(allday_row)
        
        # Start time
        start_time_row = QHBoxLayout()
        start_time_label = QLabel(f"🕐 {_('label_start_time')}")
        start_time_label.setStyleSheet("border: none; padding: 0; margin: 0;")
        start_time_label.setMinimumWidth(100)
        self.start_time_edit = QTimeEdit()
        self.start_time_edit.setTime(QTime(9, 0))  # Default 9:00 AM
        start_time_row.addWidget(start_time_label)
        start_time_row.addWidget(self.start_time_edit)
        form_layout.addLayout(start_time_row)
        
        # End time
        end_time_row = QHBoxLayout()
        end_time_label = QLabel(f"🕐 {_('label_end_time')}")
        end_time_label.setStyleSheet("border: none; padding: 0; margin: 0;")
        end_time_label.setMinimumWidth(100)
        self.end_time_edit = QTimeEdit()
        self.end_time_edit.setTime(QTime(10, 0))  # Default 10:00 AM
        end_time_row.addWidget(end_time_label)
        end_time_row.addWidget(self.end_time_edit)
        form_layout.addLayout(end_time_row)
        
        # Description
        desc_row = QHBoxLayout()
        desc_label = QLabel(f"📄 {_('label_description')}")
        desc_label.setStyleSheet("border: none; padding: 0; margin: 0;")
        desc_label.setMinimumWidth(100)
        desc_label.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.description_edit = QTextEdit()
        self.description_edit.setPlaceholderText(_("placeholder_enter_event_description"))
        self.description_edit.setMaximumHeight(100)
        desc_row.addWidget(desc_label)
        desc_row.addWidget(self.description_edit)
        form_layout.addLayout(desc_row)
        
        layout.addWidget(form_widget)
        
        # Button box
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save_event)
        button_box.rejected.connect(self.reject)
        
        # Change button texts
        ok_button = button_box.button(QDialogButtonBox.StandardButton.Ok)
        ok_button.setText(f"{UI_EMOJIS['success']} {_('button_save_event')}")
        
        cancel_button = button_box.button(QDialogButtonBox.StandardButton.Cancel)
        cancel_button.setText(_('button_cancel'))
        
        layout.addWidget(button_box)
        
        # Set focus to title
        self.title_edit.setFocus()
    
    def _load_event_data(self):
        """📥 Load event data if editing."""
        if not self.event_data:
            return
        
        try:
            # Load basic info
            self.title_edit.setText(self.event_data.title or "")
            self.description_edit.setPlainText(self.event_data.description or "")
            
            # Load category
            category_index = self.category_combo.findData(self.event_data.category)
            if category_index >= 0:
                self.category_combo.setCurrentIndex(category_index)
            
            # Load date
            if self.event_data.start_date:
                event_date = self.event_data.start_date
                self.date_edit.setDate(QDate(event_date.year, event_date.month, event_date.day))
            
            # Load time info
            self.all_day_check.setChecked(self.event_data.is_all_day)
            
            if not self.event_data.is_all_day:
                if self.event_data.start_time:
                    start_time = self.event_data.start_time
                    self.start_time_edit.setTime(QTime(start_time.hour, start_time.minute))
                if self.event_data.end_time:
                    end_time = self.event_data.end_time
                    self.end_time_edit.setTime(QTime(end_time.hour, end_time.minute))
            
            self._on_all_day_toggled(self.event_data.is_all_day)
            
        except Exception as e:
            logger.error(f"❌ Failed to load event data: {e}")
    
    def _on_all_day_toggled(self, checked: bool):
        """🔄 Handle all day checkbox toggle."""
        self.start_time_edit.setEnabled(not checked)
        self.end_time_edit.setEnabled(not checked)
    
    def _save_event(self):
        """💾 Save event data."""
        try:
            # Validate title
            title = self.title_edit.text().strip()
            if not title:
                QMessageBox.warning(
                    self,
                    f"⚠️ {_('error_validation_error')}",
                    _("validation_title_required")
                )
                self.title_edit.setFocus()
                return
            
            # Get form data
            category = self.category_combo.currentData() or "default"
            description = self.description_edit.toPlainText().strip()
            
            # Convert QDate to Python date
            qdate = self.date_edit.date()
            event_date = date(qdate.year(), qdate.month(), qdate.day())
            
            is_all_day = self.all_day_check.isChecked()
            
            start_time = None
            end_time = None
            
            if not is_all_day:
                # Convert QTime to Python time
                qstart_time = self.start_time_edit.time()
                start_time = time(qstart_time.hour(), qstart_time.minute())
                
                qend_time = self.end_time_edit.time()
                end_time = time(qend_time.hour(), qend_time.minute())
                
                # Validate times
                if end_time <= start_time:
                    QMessageBox.warning(
                        self,
                        f"⚠️ {_('error_validation_error')}",
                        _("validation_end_time_after_start")
                    )
                    self.end_time_edit.setFocus()
                    return
            
            # Create or update event
            if self.is_editing and self.event_data:
                # Update existing event
                self.event_data.title = title
                self.event_data.description = description
                self.event_data.category = category
                self.event_data.start_date = event_date
                self.event_data.is_all_day = is_all_day
                self.event_data.start_time = start_time
                self.event_data.end_time = end_time
                
                saved_event = self.event_data
            else:
                # Create new event
                saved_event = Event(
                    title=title,
                    description=description,
                    category=category,
                    start_date=event_date,
                    is_all_day=is_all_day,
                    start_time=start_time,
                    end_time=end_time
                )
            
            # Emit signal and close
            self.event_saved.emit(saved_event)
            self.accept()
            
        except Exception as e:
            logger.error(f"❌ Failed to save event: {e}")
            QMessageBox.critical(
                self,
                f"❌ {_('error_save_error')}",
                f"{_('error_failed_to_save_event')}\n{str(e)}"
            )
    
    def get_event(self) -> Optional[Event]:
        """📝 Get the event (for external access)."""
        return self.event_data
    
    def refresh_ui_text(self):
        """🔄 Refresh UI text after language change."""
        try:
            # Update window title
            title = f"{UI_EMOJIS['edit_event']} {_('event_dialog_edit_title')}" if self.is_editing else f"{UI_EMOJIS['add_event']} {_('event_dialog_add_title')}"
            self.setWindowTitle(title)
            
            # Update all labels
            # Find all labels and update their text
            for widget in self.findChildren(QLabel):
                text = widget.text()
                if text.startswith("📝"):
                    widget.setText(f"📝 {_('label_title')}")
                elif text.startswith("📂"):
                    widget.setText(f"📂 {_('label_category')}")
                elif text.startswith("📅"):
                    widget.setText(f"📅 {_('label_date')}")
                elif text.startswith("🕐") and "start" in text.lower():
                    widget.setText(f"🕐 {_('label_start_time')}")
                elif text.startswith("🕐") and "end" in text.lower():
                    widget.setText(f"🕐 {_('label_end_time')}")
                elif text.startswith("📄"):
                    widget.setText(f"📄 {_('label_description')}")
            
            # Update placeholders
            if hasattr(self, 'title_edit'):
                self.title_edit.setPlaceholderText(_("placeholder_enter_event_title"))
            if hasattr(self, 'description_edit'):
                self.description_edit.setPlaceholderText(_("placeholder_enter_event_description"))
            
            # Update checkbox text
            if hasattr(self, 'all_day_check'):
                self.all_day_check.setText(_("label_all_day_event"))
            
            # Update category combo box items
            if hasattr(self, 'category_combo'):
                current_data = self.category_combo.currentData()
                self.category_combo.clear()
                for category, emoji in EVENT_CATEGORY_EMOJIS.items():
                    localized_name = _(f"category_{category}")
                    self.category_combo.addItem(f"{emoji} {localized_name}", category)
                
                # Restore selection
                if current_data:
                    index = self.category_combo.findData(current_data)
                    if index >= 0:
                        self.category_combo.setCurrentIndex(index)
            
            # Update Qt widgets locale (QDateEdit, QTimeEdit)
            self._refresh_qt_widgets_locale()
            
            # Update button texts
            button_box = self.findChild(QDialogButtonBox)
            if button_box:
                ok_button = button_box.button(QDialogButtonBox.StandardButton.Ok)
                if ok_button:
                    ok_button.setText(f"{UI_EMOJIS['success']} {_('button_save_event')}")
                
                cancel_button = button_box.button(QDialogButtonBox.StandardButton.Cancel)
                if cancel_button:
                    cancel_button.setText(_('button_cancel'))
            
            logger.debug("🔄 Event dialog UI text refreshed")
            
        except Exception as e:
            logger.error(f"❌ Failed to refresh event dialog UI text: {e}")
    
    def _refresh_qt_widgets_locale(self):
        """🌍 Refresh Qt widgets to use current locale."""
        try:
            from PySide6.QtCore import QLocale
            
            # Get current locale from I18n manager
            i18n_manager = get_i18n_manager()
            current_locale = i18n_manager.current_locale
            
            # Map ALL supported locale codes to Qt locale codes
            qt_locale_mapping = {
                # Core English locales
                'en_US': QLocale(QLocale.Language.English, QLocale.Country.UnitedStates),
                'en_GB': QLocale(QLocale.Language.English, QLocale.Country.UnitedKingdom),
                
                # French locales
                'fr_CA': QLocale(QLocale.Language.French, QLocale.Country.Canada),
                'fr_FR': QLocale(QLocale.Language.French, QLocale.Country.France),
                
                # Catalan locales
                'ca_ES': QLocale(QLocale.Language.Catalan, QLocale.Country.Spain),
                
                # Major European languages
                'es_ES': QLocale(QLocale.Language.Spanish, QLocale.Country.Spain),
                'de_DE': QLocale(QLocale.Language.German, QLocale.Country.Germany),
                'it_IT': QLocale(QLocale.Language.Italian, QLocale.Country.Italy),
                'pt_BR': QLocale(QLocale.Language.Portuguese, QLocale.Country.Brazil),
                'pt_PT': QLocale(QLocale.Language.Portuguese, QLocale.Country.Portugal),
                'ru_RU': QLocale(QLocale.Language.Russian, QLocale.Country.Russia),
                'nl_NL': QLocale(QLocale.Language.Dutch, QLocale.Country.Netherlands),
                'pl_PL': QLocale(QLocale.Language.Polish, QLocale.Country.Poland),
                
                # Nordic languages
                'sv_SE': QLocale(QLocale.Language.Swedish, QLocale.Country.Sweden),
                'nb_NO': QLocale(QLocale.Language.NorwegianBokmal, QLocale.Country.Norway),
                'da_DK': QLocale(QLocale.Language.Danish, QLocale.Country.Denmark),
                'fi_FI': QLocale(QLocale.Language.Finnish, QLocale.Country.Finland),
                
                # Central/Eastern European languages
                'cs_CZ': QLocale(QLocale.Language.Czech, QLocale.Country.CzechRepublic),
                'tr_TR': QLocale(QLocale.Language.Turkish, QLocale.Country.Turkey),
                'uk_UA': QLocale(QLocale.Language.Ukrainian, QLocale.Country.Ukraine),
                'el_GR': QLocale(QLocale.Language.Greek, QLocale.Country.Greece),
                
                # Asian languages
                'zh_CN': QLocale(QLocale.Language.Chinese, QLocale.Country.China),
                'zh_TW': QLocale(QLocale.Language.Chinese, QLocale.Country.Taiwan),
                'ja_JP': QLocale(QLocale.Language.Japanese, QLocale.Country.Japan),
                'ko_KR': QLocale(QLocale.Language.Korean, QLocale.Country.SouthKorea),
                'hi_IN': QLocale(QLocale.Language.Hindi, QLocale.Country.India),
                'ar_SA': QLocale(QLocale.Language.Arabic, QLocale.Country.SaudiArabia),
                
                # Southeast Asian languages
                'id_ID': QLocale(QLocale.Language.Indonesian, QLocale.Country.Indonesia),
                'vi_VN': QLocale(QLocale.Language.Vietnamese, QLocale.Country.Vietnam),
                'th_TH': QLocale(QLocale.Language.Thai, QLocale.Country.Thailand),
                
                # Middle Eastern languages
                'he_IL': QLocale(QLocale.Language.Hebrew, QLocale.Country.Israel),
                
                # Additional European languages
                'ro_RO': QLocale(QLocale.Language.Romanian, QLocale.Country.Romania),
                'hu_HU': QLocale(QLocale.Language.Hungarian, QLocale.Country.Hungary),
                'hr_HR': QLocale(QLocale.Language.Croatian, QLocale.Country.Croatia),
                'bg_BG': QLocale(QLocale.Language.Bulgarian, QLocale.Country.Bulgaria),
                'sk_SK': QLocale(QLocale.Language.Slovak, QLocale.Country.Slovakia),
                'sl_SI': QLocale(QLocale.Language.Slovenian, QLocale.Country.Slovenia),
                'et_EE': QLocale(QLocale.Language.Estonian, QLocale.Country.Estonia),
                'lv_LV': QLocale(QLocale.Language.Latvian, QLocale.Country.Latvia),
                'lt_LT': QLocale(QLocale.Language.Lithuanian, QLocale.Country.Lithuania)
            }
            
            qt_locale = qt_locale_mapping.get(current_locale, QLocale(QLocale.Language.English, QLocale.Country.UnitedKingdom))
            
            # Update QDateEdit and QTimeEdit widgets
            if hasattr(self, 'date_edit'):
                self.date_edit.setLocale(qt_locale)
                # Force refresh the calendar popup
                if self.date_edit.calendarWidget():
                    self.date_edit.calendarWidget().setLocale(qt_locale)
            
            if hasattr(self, 'start_time_edit'):
                self.start_time_edit.setLocale(qt_locale)
            
            if hasattr(self, 'end_time_edit'):
                self.end_time_edit.setLocale(qt_locale)
            
            logger.debug(f"🌍 Updated Qt widgets locale to: {current_locale} ({qt_locale.name()})")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to refresh Qt widgets locale: {e}")