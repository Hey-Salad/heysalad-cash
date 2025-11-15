"use client";

import { useWeb3 } from "@/components/web3-provider";

export function ActiveChainBadge() {
  const { activeChain } = useWeb3();

  const chainConfig = {
    arc: {
      name: "Arc Mainnet",
      color: "from-blue-500 to-purple-500",
      dotColor: "bg-gradient-to-r from-blue-500 to-purple-500",
      description: "USDC as Gas • Sub-second finality",
    },
    base: {
      name: "Base Mainnet",
      color: "from-blue-600 to-blue-400",
      dotColor: "bg-blue-500",
      description: "Coinbase L2 • Low fees",
    },
    polygon: {
      name: "Polygon Mainnet",
      color: "from-purple-600 to-purple-400",
      dotColor: "bg-purple-500",
      description: "Established network • Wide adoption",
    },
  };

  const config = chainConfig[activeChain as keyof typeof chainConfig] || chainConfig.arc;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
      <div className={`w-2 h-2 ${config.dotColor} rounded-full animate-pulse`}></div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-gray-900">{config.name}</span>
        <span className="text-[10px] text-gray-500">{config.description}</span>
      </div>
    </div>
  );
}
