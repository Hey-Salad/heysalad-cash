# Porting HeySalad Cash Features to Tron Wallet

This guide will help you port the improvements from the Circle-based HeySalad Cash app to your Tron hackathon wallet.

---

## 🎯 Key Features to Port

### 1. **QR Code Receive Dialog**
**File:** `components/receive-qr-dialog.tsx`

**What it does:**
- Shows wallet address as QR code
- Copy address to clipboard
- Network information display
- HeySalad branding

**Tron Adaptations:**
- Replace Circle wallet address with Tron wallet address
- Update network info to show "Tron Network"
- Keep the QR code generation logic (works with any address)

**Key Code:**
```typescript
// QR Code URL generation (works for any blockchain address)
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=10&data=${encodeURIComponent(walletAddress)}`;

// Copy to clipboard
await navigator.clipboard.writeText(walletAddress);
```

---

### 2. **QR Code Scanner Dialog**
**File:** `components/scan-qr-dialog.tsx`

**What it does:**
- Camera access for scanning QR codes
- Upload QR code image option
- Manual address entry
- Amount input

**Tron Adaptations:**
- No changes needed! Works with any blockchain
- Just ensure it navigates to your Tron send page

**Key Features:**
- Camera API: `navigator.mediaDevices.getUserMedia()`
- File upload with `<input type="file" accept="image/*" capture="environment" />`
- Pre-fills send form with scanned data

---

### 3. **Payment Provider Selection**
**File:** `components/payment-provider-dialog.tsx`

**What it does:**
- Shows multiple payment options (Stripe, MoonPay, Mercuryo)
- Recommended badges
- Fee information
- Coming soon states

**Tron Adaptations:**
- Update to show Tron-compatible on-ramps
- Consider adding: MoonPay (supports TRX/USDT-TRC20), Transak, Ramp Network
- Update currency codes for Tron tokens

**Example for Tron:**
```typescript
const providers = [
  {
    id: "moonpay",
    name: "MoonPay",
    description: "Buy TRX and USDT (TRC20)",
    currencyCode: "trx", // or "usdt_tron"
    recommended: true,
  },
  {
    id: "transak",
    name: "Transak",
    description: "Credit Card, Bank Transfer",
    recommended: false,
  },
];
```

---

### 4. **Wallet Actions Component**
**File:** `components/wallet-actions.tsx`

**What it does:**
- Clean button layout with icons
- Receive, Scan, Add Crypto buttons
- Opens respective dialogs

**Tron Adaptations:**
- Change "Add USDC" to "Add TRX" or "Add Crypto"
- Keep the same button structure and styling

**Button Structure:**
```
┌─────────────┬─────────────┐
│  Receive    │    Scan     │  (with icons)
├─────────────┴─────────────┤
│        Add TRX            │  (full width)
└───────────────────────────┘
```

---

### 5. **Improved UI/UX**
**Files:** Multiple components

**What was improved:**
- Black and white color scheme
- Consistent button styling
- Icons for all actions (lucide-react)
- HeySalad logo on dialogs
- Loading states with spinners
- Time-based greetings

**Tron Adaptations:**
- Copy the color scheme from `globals.css`
- Use same icon library (lucide-react)
- Add HeySalad logo to your dialogs

---

## 📦 Components to Copy

### Essential Components:
1. `components/receive-qr-dialog.tsx` - QR code display
2. `components/scan-qr-dialog.tsx` - QR code scanner
3. `components/payment-provider-dialog.tsx` - Payment options
4. `components/wallet-actions.tsx` - Action buttons

### Supporting Files:
- `components/ui/dialog.tsx` - Dialog component (if not already present)
- `components/ui/button.tsx` - Button component
- Logo files: `public/heysalad-logo-black.png`

---

## 🔧 Step-by-Step Porting Guide

### Step 1: Install Dependencies
```bash
cd /Users/chilumbam/heysalad-wallet
npm install lucide-react
```

### Step 2: Copy UI Components
Copy these files from heysalad-cash to heysalad-wallet:
- `components/receive-qr-dialog.tsx`
- `components/scan-qr-dialog.tsx`
- `components/payment-provider-dialog.tsx`
- `components/wallet-actions.tsx`

### Step 3: Update for Tron

**In `receive-qr-dialog.tsx`:**
```typescript
// Change from:
const { accounts, activeChain } = useWeb3();
const walletAddress = accounts[activeChain]?.address || "";

// To (for Tron):
const { tronAddress } = useTronWallet(); // Your Tron wallet hook
const walletAddress = tronAddress || "";

// Update network display:
<p className="text-sm text-center text-blue-900">
  <span className="font-semibold">Network:</span> Tron
</p>
```

**In `scan-qr-dialog.tsx`:**
```typescript
// Update navigation to your Tron send page:
router.push(`/send?to=${address}&amount=${amount}`);
```

**In `payment-provider-dialog.tsx`:**
```typescript
// Update MoonPay for Tron:
const openMoonPay = () => {
  const moonpayUrl = new URL('https://buy.moonpay.com');
  moonpayUrl.searchParams.append('apiKey', process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY!);
  moonpayUrl.searchParams.append('currencyCode', 'trx'); // or 'usdt_tron'
  moonpayUrl.searchParams.append('walletAddress', tronAddress);
  // ... rest of the code
};
```

### Step 4: Update Wallet Balance Component
Replace your current balance display with the new `WalletActions` component:

```typescript
// In your balance/dashboard component:
import { WalletActions } from "@/components/wallet-actions";

// Replace old buttons with:
<WalletActions />
```

### Step 5: Update Styling
Copy the color scheme from `app/globals.css`:

```css
/* Black and white theme */
--background: 0 0% 100%;
--foreground: 0 0% 0%;
--primary: 0 0% 0%;
--primary-foreground: 0 0% 100%;
/* ... etc */
```

### Step 6: Add HeySalad Logo
Copy logo files to your public folder:
- `public/heysalad-logo-black.png`
- `public/heysalad-logo-white.png`

---

## 🔄 Tron-Specific Considerations

### 1. **Wallet Connection**
Tron uses different wallet providers (TronLink, WalletConnect):
```typescript
// You might need to adapt:
const { tronWeb, address } = useTronLink();
// or
const { address } = useWalletConnect();
```

### 2. **Token Support**
Tron has different tokens:
- TRX (native)
- USDT (TRC20)
- Other TRC20 tokens

Update the balance display to show Tron tokens instead of USDC.

### 3. **Transaction Format**
Tron transactions have different structure:
```typescript
// Tron transaction
const transaction = await tronWeb.transactionBuilder.sendTrx(
  toAddress,
  amount,
  fromAddress
);
```

### 4. **Network Selection**
If supporting multiple Tron networks:
- Mainnet
- Shasta Testnet
- Nile Testnet

---

## 🎨 UI Improvements to Port

### 1. **Time-Based Greeting**
```typescript
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};
```

### 2. **Loading States**
```typescript
{!qrLoaded && (
  <div className="animate-pulse">
    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm">Loading QR...</p>
  </div>
)}
```

### 3. **Icon Buttons**
```typescript
import { QrCode, Scan, Plus, Copy, Check } from "lucide-react";

<Button>
  <QrCode className="w-5 h-5" />
  <span>Receive</span>
</Button>
```

---

## 📱 Mobile Optimizations

All components are mobile-first:
- Responsive grid layouts
- Touch-friendly button sizes (h-12)
- Camera access for mobile QR scanning
- Proper viewport handling

---

## 🚀 Quick Start Commands

```bash
# Navigate to Tron wallet
cd /Users/chilumbam/heysalad-wallet

# Install dependencies
npm install lucide-react

# Copy components (you'll need to do this manually)
# Then update imports and Tron-specific logic

# Test locally
npm run dev
```

---

## ✅ Testing Checklist

After porting, test:
- [ ] QR code displays Tron address correctly
- [ ] QR code scanner opens camera
- [ ] QR code scanner can upload images
- [ ] Copy address to clipboard works
- [ ] Payment provider dialog opens
- [ ] MoonPay opens with Tron address
- [ ] All buttons have proper styling
- [ ] Mobile responsive design works
- [ ] HeySalad logo displays correctly

---

## 🆘 Common Issues

### Issue: QR Code Not Loading
**Solution:** Check wallet address is valid Tron format (starts with 'T')

### Issue: Camera Not Working
**Solution:** Ensure HTTPS in production, localhost for development

### Issue: MoonPay Not Opening
**Solution:** Check NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY is set

### Issue: Styling Looks Different
**Solution:** Copy entire `globals.css` color scheme

---

## 📞 Need Help?

If you encounter issues:
1. Check console for errors
2. Verify Tron wallet connection
3. Ensure all environment variables are set
4. Test on both desktop and mobile

---

## 🎯 Summary

**What You're Porting:**
- ✅ QR code receive functionality
- ✅ QR code scanner with camera
- ✅ Payment provider selection
- ✅ Improved button layout with icons
- ✅ Black and white theme
- ✅ HeySalad branding

**What Needs Adaptation:**
- Wallet address source (Circle → Tron)
- Network display (Polygon/Base → Tron)
- Token names (USDC → TRX/USDT)
- Payment providers (update for Tron support)

**Time Estimate:** 2-3 hours for full port

Good luck with the Tron hackathon! 🚀
