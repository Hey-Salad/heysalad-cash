// Explorer URLs for different chains (Mainnet)
export const getExplorerUrl = (chain: string, address: string) => {
  const explorers: Record<string, string> = {
    arc: `https://explorer.arc.network/address/${address}`,
    base: `https://basescan.org/address/${address}`,
    polygon: `https://polygonscan.com/address/${address}`
  };

  return explorers[chain] || '#';
};