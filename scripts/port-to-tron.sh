#!/bin/bash

# HeySalad Cash to Tron Wallet Porting Script
# This script helps copy components from heysalad-cash to heysalad-wallet

echo "🚀 HeySalad Cash → Tron Wallet Porting Script"
echo "=============================================="
echo ""

# Set paths
SOURCE_DIR="$(pwd)"
TARGET_DIR="/Users/chilumbam/heysalad-wallet"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory not found: $TARGET_DIR"
    echo "Please update the TARGET_DIR variable in this script"
    exit 1
fi

echo "📂 Source: $SOURCE_DIR"
echo "📂 Target: $TARGET_DIR"
echo ""

# Create components directory if it doesn't exist
mkdir -p "$TARGET_DIR/components"
mkdir -p "$TARGET_DIR/public"

echo "📋 Files to copy:"
echo "  1. components/receive-qr-dialog.tsx"
echo "  2. components/scan-qr-dialog.tsx"
echo "  3. components/payment-provider-dialog.tsx"
echo "  4. components/wallet-actions.tsx"
echo "  5. public/heysalad-logo-black.png"
echo "  6. public/heysalad-logo-white.png"
echo ""

read -p "Do you want to proceed with copying? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "📦 Copying components..."

# Copy components
cp "$SOURCE_DIR/components/receive-qr-dialog.tsx" "$TARGET_DIR/components/" 2>/dev/null && echo "✅ receive-qr-dialog.tsx" || echo "⚠️  receive-qr-dialog.tsx (not found)"
cp "$SOURCE_DIR/components/scan-qr-dialog.tsx" "$TARGET_DIR/components/" 2>/dev/null && echo "✅ scan-qr-dialog.tsx" || echo "⚠️  scan-qr-dialog.tsx (not found)"
cp "$SOURCE_DIR/components/payment-provider-dialog.tsx" "$TARGET_DIR/components/" 2>/dev/null && echo "✅ payment-provider-dialog.tsx" || echo "⚠️  payment-provider-dialog.tsx (not found)"
cp "$SOURCE_DIR/components/wallet-actions.tsx" "$TARGET_DIR/components/" 2>/dev/null && echo "✅ wallet-actions.tsx" || echo "⚠️  wallet-actions.tsx (not found)"

echo ""
echo "🎨 Copying assets..."

# Copy logos
cp "$SOURCE_DIR/public/heysalad-logo-black.png" "$TARGET_DIR/public/" 2>/dev/null && echo "✅ heysalad-logo-black.png" || echo "⚠️  heysalad-logo-black.png (not found)"
cp "$SOURCE_DIR/public/heysalad-logo-white.png" "$TARGET_DIR/public/" 2>/dev/null && echo "✅ heysalad-logo-white.png" || echo "⚠️  heysalad-logo-white.png (not found)"

echo ""
echo "📝 Creating adaptation notes..."

# Create a notes file in the target directory
cat > "$TARGET_DIR/TRON_ADAPTATION_NOTES.md" << 'EOF'
# Tron Wallet Adaptation Notes

## Components Copied
- ✅ receive-qr-dialog.tsx
- ✅ scan-qr-dialog.tsx
- ✅ payment-provider-dialog.tsx
- ✅ wallet-actions.tsx

## Required Changes

### 1. Update Wallet Address Source
Replace Circle wallet logic with Tron wallet:

```typescript
// OLD (Circle):
const { accounts, activeChain } = useWeb3();
const walletAddress = accounts[activeChain]?.address || "";

// NEW (Tron):
const { address } = useTronWallet(); // Your Tron hook
const walletAddress = address || "";
```

### 2. Update Network Display
```typescript
// Change from Polygon/Base to Tron
<p>Network: Tron</p>
```

### 3. Update Payment Providers
```typescript
// Update MoonPay currency code
currencyCode: 'trx' // or 'usdt_tron'
```

### 4. Install Dependencies
```bash
npm install lucide-react
```

### 5. Update Imports
Make sure all imports point to correct paths in your project.

## Next Steps
1. Update wallet address logic in all copied components
2. Test QR code generation with Tron address
3. Test camera access for QR scanning
4. Configure payment providers for Tron
5. Update styling to match your theme

See TRON_WALLET_PORT_GUIDE.md for detailed instructions.
EOF

echo "✅ Created TRON_ADAPTATION_NOTES.md in target directory"

echo ""
echo "✨ Done!"
echo ""
echo "📖 Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Read TRON_ADAPTATION_NOTES.md"
echo "  3. npm install lucide-react"
echo "  4. Update wallet address logic in copied components"
echo "  5. Test the new features"
echo ""
echo "📚 For detailed guide, see: TRON_WALLET_PORT_GUIDE.md"
echo ""
