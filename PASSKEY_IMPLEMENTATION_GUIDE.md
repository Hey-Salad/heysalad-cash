# 🔐 Circle Passkey Implementation Guide

Based on Circle's official documentation for Modular Wallets with Passkeys.

## 📚 Documentation References
- [Create Wallet & Send Gasless Transaction](https://developers.circle.com/wallets/modular/create-a-wallet-and-send-gasless-txn)
- [Passkey Overview](https://developers.circle.com/wallets/modular/passkeys)
- [Recover Passkey](https://developers.circle.com/wallets/modular/recover-passkey)

---

## ✅ Current Implementation Status

### What You Have ✅
1. **Passkey Creation** - Working in `components/passkey-setup.tsx`
2. **WebAuthn Integration** - Using Circle's SDK
3. **Smart Account Creation** - Creating Circle smart accounts
4. **Credential Storage** - Storing in Supabase database
5. **Settings Page** - Users can add/update passkeys

### What's Missing ⚠️
1. **Passkey Recovery Flow** - Not implemented yet
2. **Multiple Passkey Support** - Only one passkey per user
3. **Passkey Login** - Users can't sign in with passkey alone
4. **Passkey Management** - Can't view/delete existing passkeys

---

## 🔑 Passkey Implementation Best Practices

### 1. Passkey Registration (Current Implementation)

Your current flow in `components/passkey-setup.tsx`:

```typescript
// ✅ CORRECT - This matches Circle's documentation
const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Register,
    username,
});

const webAuthnAccount = toWebAuthnAccount({ credential });

const circleAccount = await toCircleSmartAccount({
    client: publicClient,
    owner: webAuthnAccount,
});
```

**Status**: ✅ Implemented correctly

---

### 2. Passkey Authentication (Login)

**What Circle Recommends:**

```typescript
// User clicks "Sign in with Passkey"
const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login, // Use Login mode
    username, // Optional - can auto-discover
});

// Create account from credential
const webAuthnAccount = toWebAuthnAccount({ credential });

// Get smart account
const circleAccount = await toCircleSmartAccount({
    client: publicClient,
    owner: webAuthnAccount,
});
```

**Status**: ⚠️ Not implemented - Users must use phone auth

**Recommendation**: Add passkey login as alternative to phone OTP

---

### 3. Passkey Recovery

**Circle's Recovery Flow:**

When a user loses their device or passkey:

1. **User initiates recovery** (e.g., "I lost my passkey")
2. **Verify identity** (phone OTP, email, etc.)
3. **Create new passkey** on new device
4. **Update wallet ownership** to new passkey

**Implementation Needed:**

```typescript
// 1. Verify user identity (already have phone auth)
// 2. Create new passkey
const newCredential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Register,
    username,
});

// 3. Update wallet with new passkey
// Store new credential in database
// Old passkey becomes invalid
```

**Status**: ⚠️ Not implemented

**Recommendation**: Add "Recover Passkey" flow in Settings

---

### 4. Multiple Passkeys (Recommended)

**Circle Best Practice**: Allow users to register multiple passkeys

**Benefits**:
- Backup if one device is lost
- Use different devices (phone, laptop, tablet)
- Share access (family members)

**Implementation**:
```typescript
// Store multiple credentials per user
// Each credential can control the same wallet
// User can choose which passkey to use at login
```

**Status**: ⚠️ Not implemented - Only one passkey per user

**Recommendation**: Support multiple passkeys per user

---

## 🛠️ Recommended Improvements

### Priority 1: Passkey Recovery Flow

**Add to Settings Page:**

```typescript
// New component: PasskeyRecovery.tsx
export function PasskeyRecovery() {
  const recoverPasskey = async () => {
    // 1. Verify user identity (already authenticated)
    // 2. Show warning about old passkey becoming invalid
    // 3. Create new passkey
    // 4. Update database
    // 5. Show success message
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lost Your Passkey?</CardTitle>
        <CardDescription>
          Create a new passkey if you lost access to your device
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={recoverPasskey}>
          Recover Passkey
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Priority 2: Passkey Login

**Add to Sign-In Page:**

```typescript
// Add button: "Sign in with Passkey"
const signInWithPasskey = async () => {
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login,
  });

  // Get wallet address from credential
  // Look up user in database
  // Create session
  // Redirect to dashboard
};
```

### Priority 3: Multiple Passkeys

**Database Schema Update:**

```sql
-- Current: One credential per user
-- Recommended: Multiple credentials per user

ALTER TABLE passkey_credentials 
ADD COLUMN passkey_name TEXT; -- e.g., "iPhone 15", "MacBook Pro"

ALTER TABLE passkey_credentials 
ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE passkey_credentials 
ADD COLUMN last_used_at TIMESTAMP;
```

**UI Update:**

```typescript
// Show list of passkeys in Settings
<Card>
  <CardHeader>
    <CardTitle>Your Passkeys</CardTitle>
  </CardHeader>
  <CardContent>
    {passkeys.map(passkey => (
      <div key={passkey.id}>
        <p>{passkey.name}</p>
        <p>Created: {passkey.created_at}</p>
        <Button onClick={() => deletePasskey(passkey.id)}>
          Remove
        </Button>
      </div>
    ))}
    <Button onClick={addNewPasskey}>
      Add Another Passkey
    </Button>
  </CardContent>
</Card>
```

---

## 🔒 Security Best Practices

### 1. Credential Storage

**Current**: ✅ Storing in Supabase with RLS policies

**Recommendation**: ✅ Keep current approach

### 2. Passkey Domain

**Current**: Set to `www.heysalad.cash`

**Recommendation**: 
- ✅ Keep `www.heysalad.cash`
- ✅ Also add `heysalad.cash` (without www)
- ✅ Add `localhost` for development

### 3. User Verification

**Circle Recommendation**: Always require user verification (biometrics)

**Current**: ✅ Implemented - WebAuthn requires biometrics by default

### 4. Credential Backup

**Circle Recommendation**: Encourage users to:
- Register multiple passkeys
- Use passkey sync (iCloud Keychain, Google Password Manager)
- Have recovery method (phone auth)

**Current**: ⚠️ Only phone auth as recovery

**Recommendation**: Add explicit recovery flow

---

## 📋 Implementation Checklist

### Phase 1: Current State (Completed)
- [x] Basic passkey creation
- [x] Credential storage in database
- [x] Settings page for passkey management
- [x] Phone auth as primary authentication

### Phase 2: Recovery (Recommended Next)
- [ ] Add "Recover Passkey" button in Settings
- [ ] Implement recovery flow
- [ ] Show warning about old passkey invalidation
- [ ] Test recovery on different devices

### Phase 3: Enhanced Features
- [ ] Passkey login (alternative to phone)
- [ ] Multiple passkeys per user
- [ ] Passkey naming ("iPhone", "MacBook")
- [ ] Last used timestamp
- [ ] Delete individual passkeys

### Phase 4: Advanced
- [ ] Passkey sync detection
- [ ] Cross-device passkey usage
- [ ] Passkey health check
- [ ] Usage analytics

---

## 🧪 Testing Checklist

### Passkey Creation
- [ ] Create passkey on iOS (Face ID)
- [ ] Create passkey on Android (Fingerprint)
- [ ] Create passkey on macOS (Touch ID)
- [ ] Create passkey on Windows (Windows Hello)

### Passkey Recovery
- [ ] Recover passkey after device loss
- [ ] Verify old passkey no longer works
- [ ] Verify new passkey works correctly

### Multiple Devices
- [ ] Create passkey on device A
- [ ] Create second passkey on device B
- [ ] Use passkey from device A
- [ ] Use passkey from device B
- [ ] Both should work independently

---

## 🚀 Quick Wins

### 1. Add Recovery Button (30 minutes)

In `app/dashboard/settings/page.tsx`, add:

```typescript
<Button 
  variant="outline"
  onClick={() => {
    // Reuse existing PasskeySetup component
    // It will create a new passkey and replace the old one
  }}
>
  Lost Your Passkey? Create New One
</Button>
```

### 2. Improve Error Messages (15 minutes)

Add user-friendly error messages:
- "Passkey creation cancelled"
- "Biometric authentication failed"
- "Device not supported"

### 3. Add Passkey Status Indicator (20 minutes)

Show passkey status in dashboard:
- ✅ "Passkey Active"
- ⚠️ "No Passkey - Add one for better security"

---

## 📖 Additional Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [Passkeys.dev](https://passkeys.dev/)
- [Circle SDK Documentation](https://developers.circle.com/wallets/modular)
- [FIDO Alliance](https://fidoalliance.org/passkeys/)

---

## ✅ Summary

**Your Current Implementation**: Solid foundation! ✅

**What Works Well**:
- Passkey creation flow
- Credential storage
- Settings page integration
- Phone auth fallback

**Recommended Next Steps**:
1. Add passkey recovery flow (highest priority)
2. Support multiple passkeys per user
3. Add passkey login option
4. Improve error handling and user feedback

Your implementation follows Circle's best practices. The main gap is the recovery flow, which is important for production use!
