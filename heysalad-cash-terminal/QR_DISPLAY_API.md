# QR Code Display API for HeySalad Cash Terminal

The payment terminal now supports displaying QR codes for crypto payments while showing animated BMP images during idle periods.

## Display Modes

The terminal operates in two display modes:

1. **IDLE_BMP**: Shows the "speedy" BMP animation when no payment is active
2. **PAYMENT_QR**: Displays a QR code with payment information

## API Endpoints

### Display QR Code

**POST** `/api/display/qr`

Displays a QR code on the terminal screen.

**Request Body:**
```json
{
  "data": "ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "label": "Payment: $50 USDC"
}
```

**Parameters:**
- `data` (required): The QR code content (wallet address, payment URI, etc.)
- `label` (optional): Text label to display above the QR code (default: "Payment Request")

**Response:**
```json
{
  "success": true,
  "mode": "payment_qr",
  "data": "ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "label": "Payment: $50 USDC"
}
```

**Example:**
```bash
curl -X POST http://terminal-ip/api/display/qr \
  -H "Content-Type: application/json" \
  -d '{
    "data": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "label": "$25.00 USDC"
  }'
```

### Return to Idle Mode

**POST** `/api/display/idle`

Returns the display to idle mode, showing the animated BMP image.

**Response:**
```json
{
  "success": true,
  "mode": "idle_bmp"
}
```

**Example:**
```bash
curl -X POST http://terminal-ip/api/display/idle
```

### Get Display Status

**GET** `/api/display/status`

Returns the current display mode and status.

**Response:**
```json
{
  "mode": "idle_bmp",
  "display_ready": true
}
```

**Example:**
```bash
curl http://terminal-ip/api/display/status
```

## Integration Example

Here's a complete payment flow using the API:

```javascript
// 1. Create payment request and get wallet address
const paymentRequest = await fetch('https://heysalad.cash/api/payments/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 50,
    currency: 'USDC',
    network: 'base'
  })
});

const { walletAddress, paymentId } = await paymentRequest.json();

// 2. Display QR code on terminal
await fetch('http://terminal-ip/api/display/qr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: walletAddress,
    label: `$50.00 USDC`
  })
});

// 3. Wait for payment confirmation
// (implement payment monitoring logic)

// 4. Return to idle mode
await fetch('http://terminal-ip/api/display/idle', {
  method: 'POST'
});
```

## Display Specifications

- **Screen**: GC9A01A 240x240 round display
- **QR Code Version**: Auto-adjusted based on data length (version 6 max)
- **Module Size**: Automatically calculated to fit display
- **Colors**: White background, black QR code
- **Label Position**: Top of screen
- **QR Position**: Center of screen
- **Instructions**: "Scan to Pay" at bottom

## Authentication

All API endpoints require authentication. Include your authentication credentials in the request headers as configured in your HeySalad Camera Server settings.

## Error Handling

**400 Bad Request**
```json
{
  "error": "missing_qr_data"
}
```

**401 Unauthorized**
```json
{
  "error": "unauthorized"
}
```

## Default Behavior

- On startup, the terminal displays the "HeySalad Initializing..." screen
- After initialization, it shows the SPEEDY BMP animation
- When a payment QR is displayed, it remains until manually changed back to idle mode
- The display automatically returns to SPEEDY BMP when streaming is enabled

## Assets

The following BMP assets are stored in `/data/assets/`:
- `HSK-SPEEDY.rgb565` - Animated speedy character (default idle screen)
- `HSK-STANDARD.rgb565` - Standard idle screen
- `HSK-SHOCKED.rgb565` - Error/alert screen
