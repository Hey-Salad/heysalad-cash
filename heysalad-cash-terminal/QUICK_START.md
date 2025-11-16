# HeySalad Cash Terminal - Quick Start Guide

## 🚀 QR Code Payment Terminal (No NFC Required!)

This guide will help you set up your XIAO ESP32-S3 as a payment terminal that displays QR codes for receiving USDC payments.

## 📦 What You Need

- **Hardware**:
  - Seeed XIAO ESP32-S3
  - GC9A01A Round Display (240x240)
  - USB-C cable
  - WiFi network

- **Software**:
  - VS Code with PlatformIO extension
  - HeySalad account

## 🔌 Hardware Setup

### Display Connections

Connect the GC9A01A display to your XIAO ESP32-S3:

| Display Pin | XIAO Pin | Description |
|-------------|----------|-------------|
| VCC         | 3.3V     | Power       |
| GND         | GND      | Ground      |
| SCL/SCK     | D8       | SPI Clock   |
| SDA/MOSI    | D10      | SPI Data    |
| CS          | D3       | Chip Select |
| DC          | D4       | Data/Command|
| RST         | D5       | Reset       |

## 💻 Software Setup

### 1. Install PlatformIO

```bash
# In VS Code, install PlatformIO extension
# Or use CLI:
pip install platformio
```

### 2. Configure WiFi

Edit `src/payment_terminal.cpp` and update:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 3. Set Terminal ID

```cpp
const char* terminalId = "TERM_001"; // Change to your terminal ID
```

### 4. Build and Upload

```bash
# Open terminal in heysalad-cash-terminal directory
pio run --target upload

# Monitor serial output
pio device monitor
```

## 🎯 How to Use

### Creating a Payment

1. **Open Serial Monitor** (115200 baud)
2. **Send command**: `PAY:10.50` (for $10.50)
3. **QR Code appears** on display
4. **Customer scans** QR code with HeySalad app
5. **Payment confirmed** - Success screen shows

### Serial Commands

```
PAY:10.00    - Create $10.00 payment request
PAY:5.50     - Create $5.50 payment request
PAY:100      - Create $100.00 payment request
```

## 📱 Customer Payment Flow

1. Customer sees amount on terminal display
2. Opens HeySalad app
3. Scans QR code
4. Confirms payment
5. Terminal shows success ✅

## 🔧 Backend Setup

### 1. Push Database Migration

```bash
# In heysalad-cash directory
npx supabase db push
```

### 2. Register Your Terminal

```sql
-- In Supabase SQL Editor
INSERT INTO terminals (terminal_id, merchant_id, terminal_name, location)
VALUES (
  'TERM_001',
  'your-profile-id',
  'Main Counter',
  'Store Location'
);
```

### 3. Get Your Profile ID

```sql
-- Find your profile ID
SELECT id FROM profiles WHERE auth_user_id = auth.uid();
```

## 🎨 Display Screens

### Startup Screen
```
┌─────────────┐
│             │
│  HeySalad   │
│   Cash      │
│  Terminal   │
│             │
└─────────────┘
```

### Ready Screen
```
┌─────────────┐
│             │
│    READY    │
│             │
│ Send PAY:   │
│   amount    │
└─────────────┘
```

### Payment QR Screen
```
┌─────────────┐
│  ▄▄▄▄▄▄▄▄▄  │
│  █ ▄▄▄ █ ▀  │
│  █ ███ █ ▄  │
│  █▄▄▄▄▄█ █  │
│  ▄▄▄▄ ▄ ▄▄  │
│             │
│   $10.50    │
│ Scan to Pay │
└─────────────┘
```

### Success Screen
```
┌─────────────┐
│             │
│  SUCCESS!   │
│             │
│   $10.50    │
│             │
└─────────────┘
```

## 🐛 Troubleshooting

### Display Not Working
- Check all connections
- Verify power (3.3V, not 5V!)
- Check SPI pins match code

### WiFi Not Connecting
- Verify SSID and password
- Check 2.4GHz network (ESP32 doesn't support 5GHz)
- Move closer to router

### QR Code Not Scanning
- Ensure good lighting
- QR code should be clear and centered
- Try different QR code sizes (adjust `scale` in code)

### Payment Not Confirming
- Check API endpoint is correct
- Verify terminal is registered in database
- Check merchant wallet exists

## 🔄 Testing Without Hardware

You can test the API endpoints:

```bash
# Create payment
curl -X POST https://heysalad.cash/api/terminal/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "TERM_001",
    "amount": "10.50",
    "currency": "USDC"
  }'

# Check status
curl https://heysalad.cash/api/terminal/status?address=0x...
```

## 📊 Monitoring

### Serial Output

```
HeySalad Cash Terminal Starting...
Connecting to WiFi...
WiFi Connected!
IP: 192.168.1.100
Creating payment for $10.50
Response: {"paymentId":"PAY_123","address":"0x..."}
QR Code displayed
Address: 0x...
Payment received!
```

## 🚀 Next Steps

1. **Add Button**: Physical button to trigger payments
2. **Amount Input**: Keypad for entering amounts
3. **Receipt Printer**: Print paper receipts
4. **Multiple Currencies**: Support different tokens
5. **Offline Mode**: Queue payments when offline

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Hey-Salad/heysalad-cash/issues)
- **Email**: peter@heysalad.io
- **Docs**: [Full Documentation](../README.md)

---

**Happy Selling! 🥗💰**
