# HeySalad Cash Terminal 💳

> **ESP32-based NFC payment terminal for HeySalad cryptocurrency payments**

A hardware payment terminal using ESP32 microcontroller with NFC card reader for tap-to-pay cryptocurrency transactions.

## 🔧 Hardware Components

- **Microcontroller**: Seeed XIAO ESP32-C3
- **NFC Reader**: PN532 NFC/RFID module
- **Display**: TFT LCD screen (optional)
- **Connectivity**: WiFi 802.11 b/g/n
- **Power**: USB-C

## ✨ Features

- 📱 **NFC Card Reading**: Tap-to-pay with NFC cards
- 🔐 **Secure Communication**: Encrypted API calls to HeySalad backend
- 📊 **Transaction Display**: Real-time transaction status
- 🌐 **WiFi Connectivity**: Cloud-based payment processing
- ⚡ **Low Power**: Optimized for battery operation

## 🚀 Getting Started

### Prerequisites

- PlatformIO IDE or VS Code with PlatformIO extension
- Seeed XIAO ESP32-C3 board
- PN532 NFC module
- USB-C cable

### Installation

1. **Clone the repository** (if not already done)
   ```bash
   git clone https://github.com/Hey-Salad/heysalad-cash.git
   cd heysalad-cash/heysalad-cash-terminal
   ```

2. **Open in PlatformIO**
   - Open VS Code
   - Install PlatformIO extension
   - Open this folder

3. **Configure WiFi**
   - Copy `include/config.h.example` to `include/config.h`
   - Add your WiFi credentials and API endpoint

4. **Build and Upload**
   ```bash
   pio run --target upload
   ```

## 📁 Project Structure

```
heysalad-cash-terminal/
├── src/
│   ├── main.cpp           # Main application logic
│   ├── nfc_reader.cpp     # NFC card reading
│   ├── api_client.cpp     # HeySalad API integration
│   └── display.cpp        # Display management
├── include/
│   ├── config.h           # Configuration (WiFi, API)
│   └── *.h                # Header files
├── data/                  # SPIFFS data (web interface)
├── lib/                   # External libraries
└── platformio.ini         # PlatformIO configuration
```

## 🔌 Hardware Connections

### PN532 NFC Module → ESP32-C3

| PN532 Pin | ESP32-C3 Pin | Description |
|-----------|--------------|-------------|
| VCC       | 3.3V         | Power       |
| GND       | GND          | Ground      |
| SDA       | GPIO6        | I2C Data    |
| SCL       | GPIO7        | I2C Clock   |

### Optional TFT Display → ESP32-C3

| Display Pin | ESP32-C3 Pin | Description |
|-------------|--------------|-------------|
| VCC         | 3.3V         | Power       |
| GND         | GND          | Ground      |
| SCK         | GPIO8        | SPI Clock   |
| MOSI        | GPIO10       | SPI Data    |
| CS          | GPIO3        | Chip Select |
| DC          | GPIO4        | Data/Command|
| RST         | GPIO5        | Reset       |

## 💡 Usage

### Basic Payment Flow

1. **Power On**: Terminal connects to WiFi
2. **Ready State**: Display shows "Ready for Payment"
3. **Tap Card**: Customer taps NFC card
4. **Read Card**: Terminal reads card UID
5. **API Call**: Sends payment request to HeySalad backend
6. **Process**: Backend processes USDC transaction via Circle
7. **Confirm**: Terminal displays success/failure
8. **Receipt**: Optional email/SMS receipt sent

### API Integration

The terminal communicates with HeySalad backend:

```cpp
// Example API call
POST https://heysalad.cash/api/terminal/payment
{
  "cardId": "04:A1:B2:C3:D4:E5:F6",
  "amount": "10.00",
  "currency": "USDC",
  "terminalId": "TERM_001"
}
```

## 🔒 Security

- ✅ Encrypted WiFi communication (WPA2)
- ✅ HTTPS API calls
- ✅ Card UID hashing
- ✅ No sensitive data stored on device
- ✅ Secure boot enabled
- ✅ OTA update authentication

## 🛠️ Development

### Building

```bash
# Build project
pio run

# Upload to device
pio run --target upload

# Monitor serial output
pio device monitor
```

### Testing

```bash
# Run unit tests
pio test

# Test NFC reading
pio test -e test_nfc

# Test API communication
pio test -e test_api
```

## 📊 Configuration

Edit `include/config.h`:

```cpp
// WiFi Configuration
#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"

// API Configuration
#define API_ENDPOINT "https://heysalad.cash/api/terminal"
#define API_KEY "your_terminal_api_key"

// Terminal Configuration
#define TERMINAL_ID "TERM_001"
#define MERCHANT_ID "MERCHANT_001"
```

## 🎯 Use Cases

### Retail Point of Sale
- Replace traditional card terminals
- Accept cryptocurrency payments
- Lower transaction fees
- Instant settlement

### Vending Machines
- Cashless payments
- Remote monitoring
- Inventory tracking
- Usage analytics

### Event Ticketing
- Tap-to-enter
- Payment + access control
- Real-time attendance
- Fraud prevention

### Transportation
- Tap-to-ride systems
- Fare collection
- Multi-modal integration
- Usage statistics

## 🔮 Future Enhancements

- [ ] Offline transaction queuing
- [ ] Bluetooth connectivity
- [ ] Battery power optimization
- [ ] Multi-currency support
- [ ] Receipt printer integration
- [ ] Touchscreen interface
- [ ] QR code display
- [ ] Sound feedback
- [ ] LED status indicators
- [ ] Merchant dashboard

## 📚 Documentation

- [ESP32-C3 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)
- [PN532 User Manual](https://www.nxp.com/docs/en/user-guide/141520.pdf)
- [PlatformIO Documentation](https://docs.platformio.org/)
- [HeySalad API Docs](https://heysalad.cash/api/docs)

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test on actual hardware
4. Submit a pull request

## ⚠️ Disclaimer

This is a prototype hardware device. Use at your own risk. Ensure proper testing before production deployment.

## 📄 License

MIT License - See main repository LICENSE file

---

**Part of the HeySalad ecosystem** 🥗

[Main App](https://github.com/Hey-Salad/heysalad-cash) • [Mobile App](https://github.com/Hey-Salad/heysalad-wallet) • **Hardware Terminal**
