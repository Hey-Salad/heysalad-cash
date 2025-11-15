// Arc Network Configuration
// Circle's EVM-compatible Layer-1 blockchain
import { defineChain } from 'viem';

export const arc = defineChain({
  id: 1301,
  name: 'Arc',
  nativeCurrency: {
    decimals: 6,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.arc.network'],
    },
    public: {
      http: ['https://rpc.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.network',
    },
  },
  contracts: {
    // Add USDC contract address when available
  },
});
