#!/bin/bash

# HeySalad Cash Terminal - Test Script
# Tests the terminal API endpoints

API_URL="https://heysalad.cash"
TERMINAL_ID="TERM_001"

echo "🧪 Testing HeySalad Cash Terminal API"
echo "======================================"
echo ""

# Test 1: Create Payment
echo "📝 Test 1: Creating payment request..."
RESPONSE=$(curl -s -X POST "$API_URL/api/terminal/create-payment" \
  -H "Content-Type: application/json" \
  -d "{
    \"terminalId\": \"$TERMINAL_ID\",
    \"amount\": \"10.50\",
    \"currency\": \"USDC\"
  }")

echo "Response: $RESPONSE"
echo ""

# Extract payment address
ADDRESS=$(echo $RESPONSE | grep -o '"address":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADDRESS" ]; then
  echo "❌ Failed to create payment"
  exit 1
fi

echo "✅ Payment created successfully"
echo "Address: $ADDRESS"
echo ""

# Test 2: Check Payment Status
echo "📊 Test 2: Checking payment status..."
STATUS_RESPONSE=$(curl -s "$API_URL/api/terminal/status?address=$ADDRESS")

echo "Response: $STATUS_RESPONSE"
echo ""

# Check if status is pending
if echo "$STATUS_RESPONSE" | grep -q "pending"; then
  echo "✅ Payment status check working"
else
  echo "⚠️  Unexpected status"
fi

echo ""
echo "======================================"
echo "🎉 Terminal API tests complete!"
echo ""
echo "Next steps:"
echo "1. Upload code to ESP32: pio run --target upload"
echo "2. Open serial monitor: pio device monitor"
echo "3. Send command: PAY:10.50"
echo "4. Scan QR code with HeySalad app"
