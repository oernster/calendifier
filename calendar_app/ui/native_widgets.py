"""
🔢 Native Numeral Widgets
Custom UI widgets that display numbers in native numeral systems
"""

import logging
from PySide6.QtWidgets import QSpinBox, QLineEdit
from PySide6.QtCore import Signal
from PySide6.QtGui import QValidator

logger = logging.getLogger(__name__)


class NativeSpinBox(QSpinBox):
    """SpinBox that displays numbers in native numeral systems"""

    def __init__(self, parent=None, i18n_manager=None):
        super().__init__(parent)
        self.i18n_manager = i18n_manager

        # Native number systems mapping
        self.number_systems = {
            # Arabic-Indic numerals
            "ar_SA": {
                "0": "٠",
                "1": "١",
                "2": "٢",
                "3": "٣",
                "4": "٤",
                "5": "٥",
                "6": "٦",
                "7": "٧",
                "8": "٨",
                "9": "٩",
            },
            # Devanagari numerals
            "hi_IN": {
                "0": "०",
                "1": "१",
                "2": "२",
                "3": "३",
                "4": "४",
                "5": "५",
                "6": "६",
                "7": "७",
                "8": "८",
                "9": "९",
            },
            # Thai numerals
            "th_TH": {
                "0": "๐",
                "1": "๑",
                "2": "๒",
                "3": "๓",
                "4": "๔",
                "5": "๕",
                "6": "๖",
                "7": "๗",
                "8": "๘",
                "9": "๙",
            },
        }

        # Reverse mapping for input parsing
        self.reverse_number_systems = {}
        for locale, mapping in self.number_systems.items():
            self.reverse_number_systems[locale] = {v: k for k, v in mapping.items()}

        # Native number locales
        self.native_number_locales = {"ar_SA", "hi_IN", "th_TH"}

        # Connect to value changed to update display
        self.valueChanged.connect(self._update_display)

        # Override the line edit to handle native input
        self._setup_native_input()

        # Trigger initial display update after a short delay
        from PySide6.QtCore import QTimer

        QTimer.singleShot(100, self._update_display)

        # Also connect to focus events to ensure display updates
        self.editingFinished.connect(self._update_display)

    def _setup_native_input(self):
        """Setup native numeral input handling"""
        try:
            # Get the internal line edit
            line_edit = self.lineEdit()
            if line_edit:
                # Install event filter for custom input handling
                line_edit.textChanged.connect(self._handle_native_input)
        except Exception as e:
            logger.warning(f"Could not setup native input: {e}")

    def _handle_native_input(self, text):
        """Handle native numeral input"""
        try:
            if not self.i18n_manager:
                return

            locale = getattr(self.i18n_manager, "current_locale", "en_US")

            if locale in self.reverse_number_systems:
                # Convert native numerals to Western Arabic for internal processing
                western_text = text
                for native, western in self.reverse_number_systems[locale].items():
                    western_text = western_text.replace(native, western)

                # Try to parse as integer
                try:
                    value = int(western_text)
                    if self.minimum() <= value <= self.maximum():
                        # Temporarily disconnect to avoid recursion
                        self.valueChanged.disconnect(self._update_display)
                        self.setValue(value)
                        self.valueChanged.connect(self._update_display)
                except ValueError:
                    pass  # Invalid input, let Qt handle it
        except Exception as e:
            logger.warning(f"Error handling native input: {e}")

    def _update_display(self):
        """Update display with native numerals"""
        try:
            if not self.i18n_manager:
                return

            locale = getattr(self.i18n_manager, "current_locale", "en_US")

            if locale in self.native_number_locales and locale in self.number_systems:
                # Get current value
                value = self.value()

                # Convert to native numerals
                native_text = self._to_native_numerals(str(value), locale)

                # Update the display
                line_edit = self.lineEdit()
                if line_edit:
                    # Temporarily block signals to avoid recursion
                    line_edit.blockSignals(True)
                    line_edit.setText(native_text)
                    line_edit.blockSignals(False)
                    # Force a repaint to ensure the change is visible
                    line_edit.repaint()
                    self.repaint()
        except Exception as e:
            logger.warning(f"Error updating native display: {e}")

    def _to_native_numerals(self, text, locale):
        """Convert Western Arabic numerals to native numerals"""
        if locale in self.number_systems:
            number_map = self.number_systems[locale]
            return "".join(number_map.get(digit, digit) for digit in text)
        return text

    def _from_native_numerals(self, text, locale):
        """Convert native numerals to Western Arabic numerals"""
        if locale in self.reverse_number_systems:
            reverse_map = self.reverse_number_systems[locale]
            return "".join(reverse_map.get(char, char) for char in text)
        return text

    def setValue(self, value):
        """Override setValue to update native display"""
        super().setValue(value)
        self._update_display()

    def setI18nManager(self, i18n_manager):
        """Set the i18n manager for locale detection"""
        self.i18n_manager = i18n_manager
        # Trigger display update immediately and after a short delay
        self._update_display()
        from PySide6.QtCore import QTimer

        QTimer.singleShot(50, self._update_display)

    def forceNativeDisplay(self):
        """Force update to native numeral display"""
        try:
            # Force immediate update
            self._update_display()

            # Also trigger multiple update attempts with slight delays
            from PySide6.QtCore import QTimer

            QTimer.singleShot(10, self._update_display)
            QTimer.singleShot(50, self._update_display)

            # Force repaints
            self.repaint()
            line_edit = self.lineEdit()
            if line_edit:
                line_edit.repaint()

        except Exception as e:
            logger.warning(f"Error forcing native display: {e}")


class NativeLineEdit(QLineEdit):
    """LineEdit that can display native numerals"""

    def __init__(self, parent=None, i18n_manager=None):
        super().__init__(parent)
        self.i18n_manager = i18n_manager

        # Native number systems mapping (same as NativeSpinBox)
        self.number_systems = {
            "ar_SA": {
                "0": "٠",
                "1": "١",
                "2": "٢",
                "3": "٣",
                "4": "٤",
                "5": "٥",
                "6": "٦",
                "7": "٧",
                "8": "٨",
                "9": "٩",
            },
            "hi_IN": {
                "0": "०",
                "1": "१",
                "2": "२",
                "3": "३",
                "4": "४",
                "5": "५",
                "6": "६",
                "7": "७",
                "8": "८",
                "9": "९",
            },
            "th_TH": {
                "0": "๐",
                "1": "๑",
                "2": "๒",
                "3": "๓",
                "4": "๔",
                "5": "๕",
                "6": "๖",
                "7": "๗",
                "8": "๘",
                "9": "๙",
            },
        }

        self.native_number_locales = {"ar_SA", "hi_IN", "th_TH"}

    def setText(self, text):
        """Override setText to display native numerals"""
        if self.i18n_manager:
            locale = getattr(self.i18n_manager, "current_locale", "en_US")
            if locale in self.native_number_locales and locale in self.number_systems:
                # Convert numbers in text to native numerals
                native_text = self._to_native_numerals(text, locale)
                super().setText(native_text)
                return

        super().setText(text)

    def _to_native_numerals(self, text, locale):
        """Convert Western Arabic numerals to native numerals"""
        if locale in self.number_systems:
            number_map = self.number_systems[locale]
            return "".join(number_map.get(digit, digit) for digit in text)
        return text

    def setI18nManager(self, i18n_manager):
        """Set the i18n manager for locale detection"""
        self.i18n_manager = i18n_manager


def create_native_spinbox(parent=None, i18n_manager=None):
    """Factory function to create native spinbox"""
    return NativeSpinBox(parent, i18n_manager)


def create_native_line_edit(parent=None, i18n_manager=None):
    """Factory function to create native line edit"""
    return NativeLineEdit(parent, i18n_manager)
