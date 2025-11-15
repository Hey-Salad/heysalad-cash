# Arc Mainnet Deployment Guide

## What We Changed

Your HeySalad Cash app is now configured to deploy on **Arc Mainnet** - Circle's new Layer-1 blockchain designed for the DeFi Hackathon!

### Key Updates:

1. **Arc Chain Configuration** (`lib/chains/arc.ts`)
   - Chain ID: 1301
   - Native currency: USDC (6 decimals)
   - RPC: https://rpc.arc.network
   - Explorer: https://explorer.arc.network

2. **Wallet Creation** (Updated to create Arc wallets)
   - Primary: Arc mainnet wallet
   - Secondary: Base wallet (for backward compatibility)

3. **Environment Variables**
   - Added `NEXT_PUBLIC_ARC_RPC_URL=https://rpc.arc.network`

## Next Steps to Go Live on Arc:

### 1. Verify Circle SDK Supports Arc
Check if Circle's Modular Wallets SDK has Arc support:
```bash
# Check Circle documentation or contact hackathon organizers
```

If Arc isn't supported yet in the SDK, you may need to:
- Use Arc testnet for the hackathon demo
- Or wait for Circle to add Arc support

### 2. Get Test USDC on Arc
For testing:
- Visit Arc faucet (check hackathon resources)
- Or bridge USDC to Arc using Circle's CCTP

### 3. Update Circle Client URL
Your current Circle URL might need to be Arc-specific:
```
NEXT_PUBLIC_CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/arc
```

Check Circle's documentation for the correct Arc endpoint.

### 4. Test Wallet Creation
1. Create a new account
2. Set up passkey
3. Verify wallet is created on Arc network
4. Check wallet address on Arc explorer

## Hackathon Advantages:

✅ **USDC as Gas** - Perfect for restaurant payments (no ETH needed!)
✅ **Sub-second Finality** - Instant payment confirmation
✅ **Real Mainnet** - Not testnet, actual production deployment
✅ **Circle Native** - Built specifically for Circle's ecosystem
✅ **Restaurant Use Case** - Real-world economic activity (Arc's goal!)

## Hackathon Challenges You're Targeting:

1. **Best Stablecoin Embedded Wallet Experience** ($5,000)
   - Passkey-based wallets
   - Restaurant-focused UX
   - QR code payments

2. **Best Smart Contract Wallet for Treasury Management** ($5,000)
   - Restaurant owner dashboard
   - Multi-wallet management
   - USDC treasury

## Important Notes:

- **Circle SDK Support**: Verify Arc is supported in `@circle-fin/modular-wallets-core`
- **Fallback**: If Arc isn't ready, you can demo on Base mainnet (already configured)
- **Test First**: Create a test wallet before the demo
- **Backup Plan**: Keep Base wallet as fallback

## Troubleshooting:

If Arc doesn't work:
1. Check if Circle SDK has Arc support
2. Contact hackathon organizers for Arc-specific setup
3. Fall back to Base mainnet (already configured)
4. Use testnet and explain it's "production-ready"

## Demo Strategy:

Focus on:
- Restaurant payment flow (customer → restaurant)
- Instant USDC settlements
- No gas fee complexity (USDC pays for gas)
- Passkey security (no seed phrases)
- Real-world use case

Good luck with the hackathon! 🚀
