# 🚀 Deployment Checklist for heysalad.cash

## ✅ Completed
- [x] Code pushed to GitHub
- [x] Vercel deployment active
- [x] Domain connected (heysalad.cash)
- [x] Supabase database migrated
- [x] CORS issues fixed

## ⚠️ CRITICAL - Must Do Now

### 1. Update Circle API Keys in Vercel (REQUIRED FOR PASSKEYS)

**Go to**: https://vercel.com/hey-salad/heysalad-cash/settings/environment-variables

**Update these 3 variables** (click Edit on each):

#### CIRCLE_API_KEY
```
TEST_API_KEY:7ed313ac270cfe7eb101973be0da3c47:03da320c29902eb35b2dd22fcaa253c3
```

#### NEXT_PUBLIC_CIRCLE_CLIENT_KEY
```
TEST_CLIENT_KEY:c6ce25e01b708412d343b9853462283b:45918f6ce81e710d86d9802faf3acd1e
```

#### CIRCLE_ENTITY_SECRET
```
TEST_CLIENT_KEY:c6ce25e01b708412d343b9853462283b:45918f6ce81e710d86d9802faf3acd1e
```

**Make sure to select**: Production, Preview, AND Development for each variable

### 2. Update Vercel URL

#### NEXT_PUBLIC_VERCEL_URL
```
https://heysalad.cash
```

#### VERCEL_URL
```
https://heysalad.cash
```

### 3. Configure Circle Passkey Domains

**Go to**: https://console.circle.com/wallets/modular/configurator

**Add these domains**:
- `heysalad.cash`
- `www.heysalad.cash`
- `heysalad-cash.vercel.app` (your Vercel preview URL)
- `localhost` (for local testing)

### 4. Redeploy on Vercel

After updating environment variables:
1. Go to: https://vercel.com/hey-salad/heysalad-cash/deployments
2. Click the three dots (...) on the latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete

---

## 🐛 Current Errors (Will be fixed after above steps)

### Error 1: 401 Unauthorized from Circle
**Cause**: Old 2-part API keys in Vercel
**Fix**: Update to 3-part format (see step 1 above)

### Error 2: Stripe 500 Error
**Cause**: Missing or incorrect Stripe configuration
**Fix**: Verify Stripe keys are set in Vercel

---

## 📝 How to Verify It's Working

After redeploying:

1. **Go to**: https://heysalad.cash
2. **Sign in** with your phone number
3. **Go to Settings** (gear icon in bottom nav)
4. **Click "Set up with passkey"**
5. **Should see** biometric prompt (Face ID/Touch ID/Windows Hello)
6. **Success!** Passkey is created

---

## 🔍 Troubleshooting

### If you still see 401 errors:
- Double-check the API keys have the 3-part format (TEST_API_KEY:xxx:xxx)
- Make sure you clicked "Save" on each variable
- Verify you selected all 3 environments (Production, Preview, Development)
- Redeploy after saving

### If passkey creation fails:
- Check Circle Console that domains are added
- Clear browser cache and try again
- Check browser console for specific error messages

### If Stripe errors persist:
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Verify `STRIPE_SECRET_KEY` is set
- Check Stripe dashboard for API key status

---

## 📞 Need Help?

The main issue right now is the Circle API keys. Once you update those 3 variables in Vercel and redeploy, the passkey feature should work!
