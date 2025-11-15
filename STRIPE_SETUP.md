# 🔵 Stripe Setup Guide for HeySalad

## Overview
This guide walks you through setting up Stripe for crypto onramp functionality.

---

## 📋 Prerequisites

- Stripe account for "HeySalad Payments Ltd"
- Test mode keys (already obtained)
- Deployed app URL: `https://www.heysalad.cash`

---

## 🔑 Step 1: Update Environment Variables

### Local (.env)
Add your Stripe keys:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### Vercel
Update these in: https://vercel.com/hey-salad/heysalad-cash/settings/environment-variables

---

## 🪝 Step 2: Set Up Stripe Webhook

### A. Go to Stripe Dashboard
1. Navigate to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**

### B. Configure Webhook Endpoint

**Endpoint URL:**
```
https://www.heysalad.cash/api/webhooks/stripe
```

**Description:**
```
HeySalad crypto onramp webhook
```

**Events to listen to:**
Select these events:
- ✅ `crypto_onramp_session.completed`
- ✅ `crypto_onramp_session.failed`
- ✅ `crypto_onramp_session.updated`

Or select **"Select all crypto_onramp_session events"**

### C. Get Webhook Signing Secret

After creating the webhook:
1. Click on the webhook you just created
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_`)

Example: `whsec_abc123xyz...`

### D. Update Environment Variables

**Local (.env):**
```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

**Vercel:**
1. Go to: https://vercel.com/hey-salad/heysalad-cash/settings/environment-variables
2. Find `STRIPE_WEBHOOK_SECRET`
3. Update with your actual webhook secret
4. Select: Production, Preview, Development
5. Save

### E. Redeploy
After updating the webhook secret in Vercel, redeploy your app.

---

## 🧪 Step 3: Test the Webhook

### Option A: Use Stripe CLI (Recommended for Local Testing)

1. **Install Stripe CLI:**
   ```bash
   brew install stripe/stripe-cli/stripe
   # or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Trigger test event:**
   ```bash
   stripe trigger crypto_onramp_session.completed
   ```

### Option B: Use Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook
3. Click **"Send test webhook"**
4. Select event: `crypto_onramp_session.completed`
5. Click **"Send test webhook"**

### Option C: Test with Real Onramp

1. Go to your app: https://www.heysalad.cash
2. Navigate to the Balance tab
3. Click "Add USDC"
4. Complete a test onramp transaction
5. Check webhook logs in Stripe Dashboard

---

## 📊 Step 4: Monitor Webhooks

### View Webhook Logs
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook
3. View the **"Attempts"** tab to see all webhook deliveries

### Check for Errors
- ✅ **200 OK** = Webhook processed successfully
- ❌ **4xx/5xx** = Error (check your server logs)

---

## 🔄 Step 5: Enable Crypto Onramp

### A. Enable Crypto Onramp in Stripe

1. Go to: https://dashboard.stripe.com/settings/crypto_onramp
2. Enable **Crypto Onramp**
3. Configure settings:
   - **Supported cryptocurrencies**: USDC
   - **Supported networks**: Polygon, Base
   - **Destination wallet**: User-provided

### B. Configure Onramp Settings

In your Stripe Dashboard:
1. Set minimum/maximum amounts
2. Configure supported payment methods
3. Set up compliance requirements

---

## ✅ Verification Checklist

- [ ] Stripe test keys added to local .env
- [ ] Stripe test keys added to Vercel
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to .env and Vercel
- [ ] App redeployed on Vercel
- [ ] Webhook tested and receiving events
- [ ] Crypto onramp enabled in Stripe
- [ ] Test transaction completed successfully

---

## 🐛 Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct: `https://www.heysalad.cash/api/webhooks/stripe`
- Verify webhook secret is correct
- Check Stripe Dashboard → Webhooks → Attempts for error messages
- Ensure app is deployed and accessible

### 401 Unauthorized
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check signature verification in webhook handler

### Events not processing
- Check server logs in Vercel
- Verify event types are handled in webhook route
- Test with Stripe CLI for detailed logs

---

## 📚 Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Crypto Onramp](https://stripe.com/docs/crypto/onramp)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

---

## 🚀 Going to Production

When ready to go live:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live Keys:**
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`
3. **Create Production Webhook:**
   - URL: `https://www.heysalad.cash/api/webhooks/stripe`
   - Get new webhook secret
4. **Update Environment Variables** with live keys
5. **Test thoroughly** before launching

---

Need help? Check the Stripe Dashboard or contact Stripe support!
