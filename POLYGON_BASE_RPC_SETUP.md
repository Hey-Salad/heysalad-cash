# Polygon and Base RPC Configuration

## What Was Fixed

The app now properly connects to Polygon and Base networks using dedicated RPC endpoints for reading blockchain data, while still using Circle's modular transport for smart account operations.

## Changes Made

### 1. Environment Variables (.env)
Added RPC URLs for both networks:
```
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

### 2. Web3 Provider (components/web3-provider.tsx)
- Added `http` import from `viem` for RPC transport
- Updated `initializeChain` to use dedicated RPC URLs for the public client
- Public client now reads blockchain data via standard RPC
- Bundler client still uses Circle's modular transport for smart account operations

## How It Works

1. **Public Client**: Uses standard RPC endpoints to read blockchain data (balances, contract calls)
2. **Bundler Client**: Uses Circle's modular transport for smart account transactions

This dual-transport approach ensures:
- Fast and reliable blockchain data reading
- Proper Circle smart account functionality
- Better error handling and fallbacks

## Alternative RPC Providers

You can use other RPC providers for better performance:

### Polygon
- Alchemy: `https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- Infura: `https://polygon-mainnet.infura.io/v3/YOUR_API_KEY`
- QuickNode: Your custom QuickNode endpoint

### Base
- Alchemy: `https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- Infura: `https://base-mainnet.infura.io/v3/YOUR_API_KEY`
- QuickNode: Your custom QuickNode endpoint

## Testing

After deploying, test:
1. Wallet balance display (should show USDC and native token balances)
2. Transaction sending (both native tokens and USDC)
3. Network switching between Polygon and Base

## Troubleshooting

If you see RPC errors:
1. Check that environment variables are set in Vercel
2. Consider using a paid RPC provider (Alchemy, Infura) for better rate limits
3. Check network status at https://status.polygon.technology/ or https://status.base.org/
