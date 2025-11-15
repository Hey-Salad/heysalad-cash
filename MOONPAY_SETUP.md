# MoonPay Integration Setup Guide

## Overview
MoonPay is integrated as the crypto onramp solution for HeySalad, allowing users to buy USDC with fiat currency (credit card, bank transfer, Apple Pay, Google Pay).

## Configuration

### Environment Variables
Add these to your `.env` file and Vercel:

```bash
NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
MOONPAY_SECRET_KEY=sk_live_your_secret_key_here
MOONPAY_WEBHOOK_SECRET=wk_live_your_webhook_secret_here
```

Get these from your MoonPay Dashboard → Settings → API Keys

### Webhook Setup

1. Go to MoonPay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://www.heysalad.cash/api/webhooks/moonpay`
3. Select events to receive:
   - `transaction_created`
   - `transaction_updated`
   - `transaction_completed`
   - `transaction_failed`
4. Copy the webhook secret (already added above)

## How It Works

### User Flow
1. User clicks "Buy USDC" button on the Balance tab
2. MoonPay widget opens in a popup window
3. User selects amount and payment method
4. User completes KYC (if first time)
5. User pays with their chosen method
6. USDC is sent directly to their wallet address
7. Transaction appears in the app via webhook

### Supported Networks
- **Polygon** - USDC on Polygon mainnet
- **Base** - USDC on Base mainnet

The button automatically uses the currently active chain in the wallet.

### Supported Payment Methods
- Credit/Debit Card
- Apple Pay
- Google Pay
- SEPA Bank Transfer (Europe)
- GBP Bank Transfer (UK)

## Transaction Tracking

Transactions are automatically tracked via webhooks:
- Created → Stored in database as PENDING
- Updated → Status updated
- Completed → Marked as COMPLETED
- Failed → Marked as FAILED

All transactions are visible in the Transactions tab.

## Testing

### Test Mode
MoonPay doesn't have a traditional test mode. Instead:
1. Use small amounts ($1-5) for testing
2. Test with your own wallet first
3. Verify transactions appear in the app

### Production Checklist
- [ ] Environment variables added to Vercel
- [ ] Webhook URL configured in MoonPay dashboard
- [ ] Webhook secret matches environment variable
- [ ] Test transaction completed successfully
- [ ] Transaction appears in app
- [ ] Funds received in wallet

## Troubleshooting

### Widget doesn't open
- Check that `NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY` is set
- Verify wallet is connected
- Check browser console for errors

### Transactions not appearing
- Verify webhook URL is correct
- Check webhook secret matches
- Look at Vercel function logs for webhook errors
- Verify wallet address matches in database

### Payment fails
- User may need to complete KYC
- Payment method may not be supported in user's country
- Check MoonPay dashboard for transaction details

## Limits & Fees

### Transaction Limits
- Minimum: Varies by country (typically $20-30)
- Maximum: Varies by payment method and KYC level
- Daily/Monthly limits apply

### Fees
- MoonPay charges a fee (typically 1-4.5%)
- Network gas fees may apply
- Fees are shown to user before payment

## Support

For MoonPay-specific issues:
- Dashboard: https://www.moonpay.com/dashboard
- Support: support@moonpay.com
- Docs: https://docs.moonpay.com

## Security Notes

- Never commit API keys to git
- Use environment variables for all secrets
- Webhook signature verification is implemented
- All transactions are logged for audit trail
