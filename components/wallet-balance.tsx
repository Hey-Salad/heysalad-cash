"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useWeb3 } from "@/components/web3-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance } from "@/contexts/balanceContext";

export function WalletBalance() {
  const { activeChain, setActiveChain } = useWeb3();
  const { balances, isRefreshing, refreshBalances } = useBalance();

  const handleRefreshBalances = useCallback(async () => {
    try {
      await refreshBalances();
      toast.success("Balances refreshed");
    } catch (error) {
      console.error("Error refreshing balances:", error);
      toast.error("Failed to refresh balances");
    }
  }, [refreshBalances]);

  // Format balance for display
  interface BalanceFormatProps {
    value: number;
    loading: boolean;
  }

  const formatBalance = ({ value, loading }: BalanceFormatProps): React.ReactNode => {
    if (loading) {
      return <Skeleton className="h-8 w-24" />;
    }

    // Make sure we have a valid number
    // Show more decimals for small amounts
    let formattedBalance: string;
    if (isNaN(value) || value === 0) {
      formattedBalance = "0";
    } else if (value < 0.01) {
      formattedBalance = value.toFixed(6); // Show 6 decimals for very small amounts
    } else {
      formattedBalance = value.toFixed(2);
    }

    return `${formattedBalance} USDC`;
  };

  return (
    <>
      <Tabs
        defaultValue={activeChain}
        onValueChange={value => setActiveChain(value as "arc" | "base" | "polygon")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="arc">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className="hidden sm:inline">Arc</span>
              <span className="sm:hidden">ARC</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="base">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="hidden sm:inline">Base</span>
              <span className="sm:hidden">BSE</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="polygon">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="hidden sm:inline">Polygon</span>
              <span className="sm:hidden">POL</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arc" className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            <span>Arc Mainnet • USDC as Gas</span>
          </div>
          <div className="text-3xl font-bold">
            {formatBalance({ value: balances.arc?.token || 0, loading: balances.arc?.loading || false })}
          </div>
        </TabsContent>

        <TabsContent value="base" className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Base Mainnet • Coinbase L2</span>
          </div>
          <div className="text-3xl font-bold">
            {formatBalance({ value: balances.base.token, loading: balances.base.loading })}
          </div>
        </TabsContent>

        <TabsContent value="polygon" className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Polygon Mainnet • Low Fees</span>
          </div>
          <div className="text-3xl font-bold">
            {formatBalance({ value: balances.polygon.token, loading: balances.polygon.loading })}
          </div>
        </TabsContent>
      </Tabs>

      <button
        onClick={handleRefreshBalances}
        disabled={isRefreshing}
        className={`text-sm ${isRefreshing ? 'text-gray-400' : 'text-black hover:text-black/70'} flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isRefreshing ? 'animate-spin' : ''}
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        {isRefreshing ? 'Refreshing...' : 'Refresh Balances'}
      </button>
    </>
  );
}