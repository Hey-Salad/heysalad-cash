# Mainnet vs Testnet Configuration

## Current Status: TESTNET ⚠️

Your app is currently running on **testnets** because you're using Circle TEST API keys.

### What You're Actually On:

| What UI Shows | What You're Actually On | Chain ID |
|---------------|------------------------|----------|
| "Arc Mainnet" | Arc Testnet (if exists) | TBD |
| "Base Mainnet" | Base Sepolia (testnet) | 84532 |
| "Polygon Mainnet" | Polygon Amoy (testnet) | 80002 |

### How to Verify:

Your wallet address: `0x4600436e0b8b0c02d8d138df59b541e3d0d5fdfc`

Check on explorers:
- Base Sepolia: https://sepolia.basescan.org/address/0x4600436e0b8b0c02d8d138df59b541e3d0d5fdfc ✅ (Shows activity)
- Base Mainnet: https://basescan.org/address/0x4600436e0b8b0c02d8d138df59b541e3d0d5fdfc ❌ (No activity)

## Why This Happens:

Circle's API keys determine which networks you use:

```
TEST_API_KEY → Testnets (Sepolia, Amoy, etc.)
LIVE_API_KEY → Mainnets (Base, Polygon, Arc)
```

Your current keys:
```env
CIRCLE_API_KEY=TEST_API_KEY:7ed313ac...
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=TEST_CLIENT_KEY:c6ce25e0...
```

## How to Get on Mainnet:

### Step 1: Get Production Circle API Keys

**For Hackathon Participants:**
1. Find Circle team members at the event
2. Explain you need production access for the hackathon
3. They can fast-track your approval
4. Mention you're building HeySalad Cash (restaurant payments)

**Online Process:**
1. Go to https://console.circle.com
2. Complete KYC/verification
3. Request production access
4. Wait for approval (can take days)

### Step 2: Update Your .env File

Once you get production keys:

```env
# Replace TEST with LIVE
CIRCLE_API_KEY=LIVE_API_KEY:xxxxx:xxxxx
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=LIVE_CLIENT_KEY:xxxxx:xxxxx
```

### Step 3: Update UI Labels (Optional)

If staying on testnet for demo, update the UI to be honest:

```typescript
// In components/wallet-information-dialog.tsx
const chainNames: Record<string, string> = {
  arc: 'Arc Testnet',
  base: 'Base Sepolia',
  polygon: 'Polygon Amoy'
};
```

## Hackathon Demo Strategy:

### If You Can't Get Production Keys in Time:

**Option A: Be Transparent**
- Update UI to say "Testnet" instead of "Mainnet"
- Explain to judges: "Demo on testnet, production-ready code"
- Show that switching to mainnet is just changing API keys

**Option B: Show Both**
- Demo on testnet (working now)
- Show the mainnet configuration in code
- Explain the architecture supports both

**Option C: Focus on Features**
- Emphasize the UX, not the network
- Restaurant payment flow works the same
- Passkey security is identical
- QR code payments function the same

### What to Tell Judges:

> "We're currently demoing on Circle's testnet for safety, but the app is production-ready. Switching to mainnet is just a matter of updating API keys - the entire architecture, smart contracts, and user experience remain identical. For a real restaurant deployment, we'd use production keys and mainnet USDC."

## The Good News:

✅ Your code is already configured for mainnet
✅ The UX works the same on testnet and mainnet
✅ Switching is just changing 2 environment variables
✅ All your features (passkeys, QR codes, multi-chain) work on both

## Quick Fix for Demo:

If you want to be accurate in the UI right now:

```bash
# Update chain names to reflect testnet
```

Or keep it as "mainnet" and explain verbally that it's testnet for demo purposes.

## After Hackathon:

1. Get production Circle API keys
2. Update .env with LIVE keys
3. Test wallet creation on mainnet
4. Deploy to production
5. Use real USDC for restaurant payments

## Important Notes:

- **Testnet USDC has no value** - it's for testing only
- **Mainnet USDC is real money** - $1 USDC = $1 USD
- **Same address works on both** - Circle smart accounts are deterministic
- **Funds don't transfer** - testnet and mainnet are separate

## For Your Specific Case:

Your wallet `0x4600436e0b8b0c02d8d138df59b541e3d0d5fdfc`:
- ✅ Exists on Base Sepolia (testnet)
- ❌ Doesn't exist on Base Mainnet yet
- 💰 Any funds sent to mainnet address are separate from testnet

If you sent real money to this address on Base mainnet, it's there waiting - but your app can't access it with TEST keys!

## Recommendation for Hackathon:

**Right now (next 24 hours):**
1. Find Circle team at the event
2. Request production access
3. If approved, switch keys and redeploy
4. If not approved, demo on testnet with transparency

**The judges will understand** - many hackathon projects demo on testnet. What matters is:
- ✅ Your innovative restaurant use case
- ✅ Clean UX with passkeys
- ✅ Multi-chain architecture
- ✅ Production-ready code

Good luck! 🚀
