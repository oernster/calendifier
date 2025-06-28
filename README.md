# 📅 Calendar Application

<!-- Multi-language summary -->
**🇺🇸 English (US):** A sophisticated cross-platform desktop calendar application with comprehensive internationalization, multi-country holiday support, and real-time features.

**🇬🇧 English (UK):** A sophisticated cross-platform desktop calendar application with comprehensive internationalisation, multi-country holiday support, and real-time features.

**🇪🇸 Español:** Una sofisticada aplicación de calendario de escritorio multiplataforma con internacionalización integral, soporte de días festivos multinacionales y características en tiempo real.

**🇫🇷 Français:** Une application de calendrier de bureau multiplateforme sophistiquée avec une internationalisation complète, un support des jours fériés multinationaux et des fonctionnalités en temps réel.

**🇩🇪 Deutsch:** Eine ausgeklügelte plattformübergreifende Desktop-Kalenderanwendung mit umfassender Internationalisierung, Multi-Country-Feiertagsunterstützung und Echtzeit-Funktionen.

**🇮🇹 Italiano:** Un'applicazione calendario desktop multipiattaforma sofisticata con internazionalizzazione completa, supporto festività multinazionali e funzionalità in tempo reale.

**🇧🇷 Português:** Uma aplicação de calendário de desktop multiplataforma sofisticada com internacionalização abrangente, suporte a feriados multinacionais e recursos em tempo real.

**🇷🇺 Русский:** Сложное кроссплатформенное настольное календарное приложение с комплексной интернационализацией, поддержкой многонациональных праздников и функциями реального времени.

**🇨🇳 简体中文:** 一个复杂的跨平台桌面日历应用程序，具有全面的国际化、多国假期支持和实时功能。

**🇹🇼 繁體中文:** 一個複雜的跨平台桌面日曆應用程式，具有全面的國際化、多國假期支援和即時功能。

**🇯🇵 日本語:** 包括的な国際化、多国間の祝日サポート、リアルタイム機能を備えた洗練されたクロスプラットフォームデスクトップカレンダーアプリケーション。

**🇰🇷 한국어:** 포괄적인 국제화, 다국가 휴일 지원 및 실시간 기능을 갖춘 정교한 크로스 플랫폼 데스크톱 캘린더 애플리케이션.

**🇮🇳 हिन्दी:** व्यापक अंतर्राष्ट्रीयकरण, बहु-देशीय छुट्टी समर्थन और वास्तविक समय सुविधाओं के साथ एक परिष्कृत क्रॉस-प्लेटफॉर्म डेस्कटॉप कैलेंडर एप्लिकेशन।

**🇸🇦 العربية:** تطبيق تقويم سطح مكتب متطور متعدد المنصات مع تدويل شامل ودعم العطل متعددة البلدان وميزات الوقت الفعلي.

---

## 🌟 Overview

The **Calendar Application** is a feature-rich, cross-platform desktop calendar built with Python and PySide6, designed to serve users worldwide with native-quality localization and intelligent holiday management. This application stands out through its sophisticated internationalization system supporting **14 languages** and **14 countries**, making it a truly global calendar solution.

### ✨ Key Features

- 📅 **Full Calendar Management** - Monthly view with intuitive navigation
- 🌍 **14-Language Support** - Complete localization with runtime language switching
- 🏳️ **14-Country Holiday Support** - Intelligent holiday detection with native translations
- 🕐 **Real-time Analog Clock** - NTP synchronization for accurate timekeeping
- 📝 **Comprehensive Event Management** - Create, edit, delete with categories and recurring events
- 🎨 **Dynamic Theming** - Dark/Light mode with instant switching
- 📝 **Integrated Notes** - Built-in note-taking functionality
- 📤📥 **Import/Export** - Support for iCalendar, CSV, and JSON formats
- ⚙️ **Extensive Configuration** - Customizable settings for all preferences

## 🌍 International Support

### 🗣️ Supported Languages
- **🇺🇸🇬🇧 English** (US & UK variants)
- **🇪🇸 Español** (Spanish)
- **🇫🇷 Français** (French)
- **🇩🇪 Deutsch** (German)
- **🇮🇹 Italiano** (Italian)
- **🇧🇷 Português** (Brazilian Portuguese)
- **🇷🇺 Русский** (Russian)
- **🇨🇳 简体中文** (Simplified Chinese)
- **🇹🇼 繁體中文** (Traditional Chinese)
- **🇯🇵 日本語** (Japanese)
- **🇰🇷 한국어** (Korean)
- **🇮🇳 हिन्दी** (Hindi)
- **🇸🇦 العربية** (Arabic)

### 🏳️ Holiday Support
The application automatically detects and displays holidays for 14 countries with intelligent cultural filtering:

| Country | Holidays | Cultural Filtering |
|---------|----------|-------------------|
| 🇺🇸 United States | Federal holidays | ✅ |
| 🇬🇧 United Kingdom | Bank holidays | ✅ |
| 🇪🇸 Spain | National holidays | ✅ |
| 🇫🇷 France | Jours fériés | ✅ |
| 🇩🇪 Germany | Feiertage | ✅ |
| 🇮🇹 Italy | Giorni festivi | ✅ |
| 🇧🇷 Brazil | Feriados nacionais | ✅ |
| 🇷🇺 Russia | Праздничные дни | ✅ |
| 🇨🇳 China | 法定节假日 | ✅ |
| 🇹🇼 Taiwan | 國定假日 | ✅ |
| 🇯🇵 Japan | 祝日 | ✅ |
| 🇰🇷 South Korea | 공휴일 | ✅ |
| 🇮🇳 India | राष्ट्रीय अवकाश | ✅ |
| 🇸🇦 Saudi Arabia | الأعياد الوطنية | ✅ |

## 🚀 Quick Start

### 📋 Prerequisites

- **Python 3.8+**
- **PySide6** (Qt6 for Python)
- **Windows 10+**, **macOS 10.14+**, or **Linux** (Ubuntu 18.04+)

### 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/oernster/calendifier.git
   cd calendifier
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python main.py
   ```

### 🎯 First Launch

On first launch, the application will:
- 🔍 **Auto-detect your system locale** and set the appropriate language
- 🏳️ **Match your country** to display relevant holidays
- 🎨 **Apply your system theme** (dark/light mode)
- 📁 **Create user data directory** at `~/.calendar_app/`

## 📱 Screenshots

### 🌙 Dark Theme
![Dark Theme Calendar](assets/screenshots/dark-theme.png)

### ☀️ Light Theme
![Light Theme Calendar](assets/screenshots/light-theme.png)

### 🌍 Language Switching
![Language Selection](assets/screenshots/language-switching.png)

### 📝 Event Management
![Event Creation](assets/screenshots/event-management.png)

## 🏗️ Architecture

This application features a sophisticated modular architecture with emphasis on internationalization and cultural awareness. For detailed technical documentation, see **[📖 Architecture Documentation](docs/architecture.md)**.

### 🧩 Key Components

- **🌍 I18n Manager** - Advanced internationalization with runtime language switching
- **🏳️ Holiday Provider** - Multi-country holiday system with cultural filtering
- **📅 Calendar Manager** - Calendar logic with event and holiday integration
- **📝 Event Manager** - Full CRUD operations with recurring event support
- **🎨 Theme Manager** - Dynamic theming system
- **🗄️ Database Manager** - SQLite with schema versioning

### 🔄 Data Flow

```mermaid
graph LR
    A[🌍 User Locale] --> B[🏳️ Holiday Provider]
    A --> C[🌐 I18n Manager]
    B --> D[📅 Calendar Manager]
    C --> D
    E[📝 Event Manager] --> D
    D --> F[🖥️ UI Components]
```

## 🛠️ Development

### 🏃‍♂️ Running from Source

```bash
# Clone repository
git clone https://github.com/your-username/calendifier.git
cd calendifier

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run application
python main.py
```

### 🧪 Running Tests

```bash
# Install test dependencies
pip install -r requirements.txt

# Run test suite
pytest tests/

# Run with coverage
pytest --cov=calendar_app tests/
```

### 🌍 Adding New Languages

1. Create translation file: `calendar_app/localization/translations/{locale}.json`
2. Add holiday translations: `calendar_app/localization/locale_holiday_translations/{locale}_holidays.json`
3. Update supported locales in `LocaleDetector`
4. Test language switching functionality

See [Architecture Documentation](docs/architecture.md#-adding-new-languages) for detailed instructions.

## 📦 Project Structure

```
calendifier/
├── 📄 main.py                    # Application entry point
├── 📄 version.py                 # Version and metadata
├── 📄 requirements.txt           # Dependencies
├── 📁 calendar_app/              # Main application package
│   ├── 📁 core/                  # Business logic
│   │   ├── 📄 calendar_manager.py
│   │   ├── 📄 event_manager.py
│   │   └── 📄 multi_country_holiday_provider.py
│   ├── 📁 ui/                    # User interface
│   │   ├── 📄 main_window.py
│   │   ├── 📄 calendar_widget.py
│   │   └── 📄 clock_widget.py
│   ├── 📁 data/                  # Data layer
│   │   ├── 📄 database.py
│   │   └── 📄 models.py
│   ├── 📁 config/                # Configuration
│   │   ├── 📄 settings.py
│   │   └── 📄 themes.py
│   ├── 📁 localization/          # Internationalization
│   │   ├── 📄 i18n_manager.py
│   │   ├── 📁 translations/      # Translation files
│   │   └── 📁 locale_holiday_translations/
│   └── 📁 utils/                 # Utilities
├── 📁 assets/                    # Application assets
├── 📁 docs/                      # Documentation
│   └── 📄 architecture.md        # Technical architecture
└── 📁 tests/                     # Test suite
```

## ⚙️ Configuration

### 🏠 User Data Location

The application stores user data in:
- **Windows:** `%USERPROFILE%\.calendar_app\`
- **macOS:** `~/.calendar_app/`
- **Linux:** `~/.calendar_app/`

### 📁 Configuration Files

- **`settings.json`** - Application preferences
- **`data/calendar.db`** - SQLite database
- **`logs/`** - Application logs
- **`exports/`** - Exported calendar files
- **`backups/`** - Database backups

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### 🐛 Bug Reports

Please use the [GitHub Issues](https://github.com/your-username/calendifier/issues) page to report bugs. Include:
- Operating system and version
- Python version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### 💡 Feature Requests

We're always looking to improve! Submit feature requests via [GitHub Issues](https://github.com/your-username/calendifier/issues) with the "enhancement" label.

### 🌍 Translations

Help us support more languages! See [Adding New Languages](docs/architecture.md#-adding-new-languages) in our architecture documentation.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[PySide6](https://doc.qt.io/qtforpython/)** - Qt6 Python bindings
- **[Python holidays](https://python-holidays.readthedocs.io/)** - Holiday data library
- **[ntplib](https://pypi.org/project/ntplib/)** - NTP client library
- **[icalendar](https://icalendar.readthedocs.io/)** - iCalendar format support

## 📞 Support

- 📖 **Documentation:** [Architecture Guide](docs/architecture.md)
- 🐛 **Issues:** [GitHub Issues](https://github.com/your-username/calendifier/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/your-username/calendifier/discussions)

---

<div align="center">

**Made with ❤️ for the global community**

*Supporting 14 languages and 14 countries worldwide*

[🌍 View Architecture](docs/architecture.md) • [🚀 Quick Start](#-quick-start) • [🤝 Contributing](#-contributing)

</div>
