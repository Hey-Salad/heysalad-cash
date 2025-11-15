# Porting HeySalad Cash Features to Tron Wallet (React Native)

## 🎯 Overview

The **heysalad-cash** (Circle/Next.js web app) has several UI/UX improvements that can be ported to **heysalad-wallet** (Tron/React Native app).

---

## 📊 Key Differences

| Feature | HeySalad Cash (Web) | HeySalad Wallet (Mobile) |
|---------|---------------------|--------------------------|
| Framework | Next.js + React | React Native + Expo |
| Blockchain | Circle (Polygon/Base) | Tron |
| UI Library | Radix UI + Tailwind | React Native components |
| Icons | lucide-react | lucide-react-native ✅ |
| QR Codes | API-based | Already has expo-barcode-scanner ✅ |
| Camera | Web API | expo-camera ✅ |

---

## ✅ What's Already in Tron Wallet

Good news! The Tron wallet already has:
- ✅ QR code display in `ReceiveModal.tsx`
- ✅ Camera/QR scanner (`expo-barcode-scanner`, `expo-camera`)
- ✅ Biometric authentication
- ✅ Voice payment interface
- ✅ Payment provider (Mercuryo)
- ✅ lucide-react-native icons

---

## 🎨 UI Improvements to Port

### 1. **Enhanced Receive Modal** (Already Good!)

Your current `ReceiveModal.tsx` is actually better than the web version! It has:
- ✅ QR code generation
- ✅ Copy address
- ✅ Share functionality
- ✅ Optional amount and note
- ✅ Payment link generation

**Suggested Enhancement:**
Add HeySalad logo at the top:

```typescript
// In ReceiveModal.tsx header
<View style={styles.header}>
  <Image 
    source={require('@/assets/images/heysalad-logo.png')} 
    style={styles.logo}
  />
  <Text style={styles.title}>Receive TRON</Text>
  <TouchableOpacity onPress={onClose}>
    <X color={Colors.brand.cherryRed} size={24} />
  </TouchableOpacity>
</View>
```

### 2. **Payment Provider Selection**

Currently using Mercuryo. Add multi-provider selection like the web app:

**Create:** `components/PaymentProviderModal.tsx`

```typescript
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { CreditCard, Wallet, Building2 } from 'lucide-react-native';
import Colors from '@/constants/colors';

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fees: string;
  available: boolean;
  recommended?: boolean;
};

const providers: Provider[] = [
  {
    id: 'mercuryo',
    name: 'Mercuryo',
    description: 'Credit/Debit Card, Bank Transfer',
    icon: <CreditCard color={Colors.brand.cherryRed} size={24} />,
    fees: '~3-4% fees',
    available: true,
    recommended: true,
  },
  {
    id: 'moonpay',
    name: 'MoonPay',
    description: 'Buy TRX and USDT (TRC20)',
    icon: <Wallet color={Colors.brand.cherryRed} size={24} />,
    fees: '~4-5% fees',
    available: true,
  },
  {
    id: 'transak',
    name: 'Transak',
    description: 'Credit Card, Bank Transfer',
    icon: <Building2 color={Colors.brand.cherryRed} size={24} />,
    fees: '~3-5% fees',
    available: false, // Coming soon
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectProvider: (providerId: string) => void;
};

export default function PaymentProviderModal({ visible, onClose, onSelectProvider }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Logo */}
        <Image 
          source={require('@/assets/images/heysalad-logo.png')} 
          style={styles.logo}
        />
        
        <Text style={styles.title}>Add Crypto</Text>
        <Text style={styles.subtitle}>Choose your preferred payment method</Text>

        {/* Providers */}
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerCard,
              provider.recommended && styles.recommended,
              !provider.available && styles.disabled,
            ]}
            onPress={() => provider.available && onSelectProvider(provider.id)}
            disabled={!provider.available}
          >
            {provider.recommended && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Recommended</Text>
              </View>
            )}
            
            <View style={styles.iconContainer}>{provider.icon}</View>
            
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerDescription}>{provider.description}</Text>
              <Text style={styles.providerFees}>{provider.fees}</Text>
            </View>

            {!provider.available && (
              <View style={styles.comingSoon}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Quick Tip</Text>
          <Text style={styles.infoText}>
            All providers support instant TRX deposits. Choose based on your preferred payment method and fees.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.brand.white,
  },
  logo: {
    width: 120,
    height: 40,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.brand.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.brand.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.brand.lightPeach,
    marginBottom: 12,
    position: 'relative',
  },
  recommended: {
    borderColor: Colors.brand.cherryRed,
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: Colors.brand.cherryRed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: Colors.brand.white,
    fontSize: 10,
    fontWeight: '700',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.brand.lightPeach,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.ink,
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 12,
    color: Colors.brand.inkMuted,
    marginBottom: 2,
  },
  providerFees: {
    fontSize: 11,
    color: Colors.brand.inkMuted,
  },
  comingSoon: {
    backgroundColor: Colors.brand.lightPeach,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    color: Colors.brand.inkMuted,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
  },
});
```

### 3. **Improved Action Buttons**

Update your home screen buttons to match the web app style:

**In your main wallet screen:**

```typescript
// Replace current buttons with:
<View style={styles.actionButtons}>
  <View style={styles.buttonRow}>
    <HSButton
      title="Receive"
      variant="secondary"
      leftIcon={<QrCode color={Colors.brand.cherryRed} size={20} />}
      onPress={() => setReceiveModalVisible(true)}
      style={styles.halfButton}
    />
    
    <HSButton
      title="Scan"
      variant="secondary"
      leftIcon={<Scan color={Colors.brand.cherryRed} size={20} />}
      onPress={() => setQRScannerVisible(true)}
      style={styles.halfButton}
    />
  </View>
  
  <HSButton
    title="Add Crypto"
    variant="primary"
    leftIcon={<Plus color={Colors.brand.white} size={20} />}
    onPress={() => setPaymentProviderVisible(true)}
    style={styles.fullButton}
  />
</View>

const styles = StyleSheet.create({
  actionButtons: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  fullButton: {
    width: '100%',
  },
});
```

### 4. **Time-Based Greeting**

Add to your home screen:

```typescript
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// In your render:
<Text style={styles.greeting}>{getGreeting()}</Text>
```

### 5. **Loading States**

Add loading spinner for QR code:

```typescript
const [qrLoading, setQrLoading] = useState(true);

<Image
  source={{ uri: generateQRCode() }}
  style={styles.qrImage}
  onLoadStart={() => setQrLoading(true)}
  onLoadEnd={() => setQrLoading(false)}
/>

{qrLoading && (
  <ActivityIndicator 
    size="large" 
    color={Colors.brand.cherryRed}
    style={styles.qrLoader}
  />
)}
```

---

## 🔧 Implementation Steps

### Step 1: Add HeySalad Logo
```bash
# Copy logo to assets
cp public/heysalad-logo-black.png tron-wallet/assets/images/
```

### Step 2: Create Payment Provider Modal
```bash
# Create new component
touch tron-wallet/components/PaymentProviderModal.tsx
# Copy code from above
```

### Step 3: Update Home Screen
```typescript
// In app/(tabs)/index.tsx or your main screen
import { QrCode, Scan, Plus } from 'lucide-react-native';
import PaymentProviderModal from '@/components/PaymentProviderModal';

// Add state
const [paymentProviderVisible, setPaymentProviderVisible] = useState(false);

// Add handler
const handleProviderSelect = (providerId: string) => {
  setPaymentProviderVisible(false);
  
  if (providerId === 'mercuryo') {
    // Open existing Mercuryo widget
    setMercuryoVisible(true);
  } else if (providerId === 'moonpay') {
    // Implement MoonPay
    openMoonPay();
  }
};
```

### Step 4: Enhance Existing Components
- Add logo to ReceiveModal
- Add time-based greeting
- Add loading states

---

## 📱 Mobile-Specific Considerations

### Camera Permissions
Already handled with expo-camera ✅

### QR Code Scanner
Already implemented ✅

### Biometric Auth
Already implemented ✅

### Deep Links
Consider adding for payment requests:
```typescript
// tron://[address]?amount=100&note=Payment
```

---

## 🎨 Design Consistency

### Colors
Your current color scheme is great! Keep:
- Cherry Red: `#FF4757`
- Light Peach: `#FFF5F0`
- Ink: `#2C3E50`

### Typography
- Titles: 24px, weight 900
- Body: 16px, weight 400
- Labels: 14px, weight 700

### Spacing
- Card padding: 16px
- Gap between elements: 12px
- Border radius: 12px

---

## ✅ Testing Checklist

- [ ] Payment provider modal opens
- [ ] All providers display correctly
- [ ] Recommended badge shows
- [ ] Coming soon state works
- [ ] Mercuryo integration still works
- [ ] Receive modal has logo
- [ ] QR code loads with spinner
- [ ] Time-based greeting updates
- [ ] All buttons have icons
- [ ] Mobile responsive on all devices

---

## 🚀 Quick Implementation

**Estimated Time:** 2-3 hours

**Priority Order:**
1. Add payment provider modal (30 min)
2. Update button layout with icons (20 min)
3. Add HeySalad logo to modals (15 min)
4. Add time-based greeting (10 min)
5. Add loading states (15 min)
6. Testing (30 min)

---

## 📞 Need Help?

The Tron wallet is already well-structured! Most improvements are UI enhancements rather than new functionality. The existing code quality is excellent.

**Key Advantages of Tron Wallet:**
- ✅ Better QR implementation
- ✅ Voice payments (unique!)
- ✅ AI assistant (unique!)
- ✅ Biometric auth
- ✅ Clean architecture

**What to Port from Web:**
- Multi-provider selection UI
- Consistent button styling
- Loading states
- Branding consistency

Good luck! 🚀
