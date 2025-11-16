import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletInformationDialog } from "@/components/wallet-information-dialog";
import { WalletBalance } from "@/components/wallet-balance";
import { WalletActions } from "@/components/wallet-actions";
import { ActiveChainBadge } from "@/components/active-chain-badge";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, Monitor } from "lucide-react";
import { signOutAction } from "@/app/actions";
import Link from "next/link";

interface Props {
  walletModels: Array<{  
    wallet_address: string;
    blockchain: string;
    chain: string;
  }>;
}

export default async function BalanceTab({ walletModels }: Props) {
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <>
      <form className="flex items-center justify-between w-full pb-4" action={signOutAction}>
        <p className="text-2xl font-semibold">{getGreeting()}</p>
        <Button variant="ghost" size="icon">
          <LogOut />
        </Button>
      </form>
      <div className="flex flex-col gap-4 mb-4">
        {/* Wallet Card */}
        <Card className="w-full break-inside-avoid">
          <CardHeader className="flex-row items-center">
            <CardTitle className="mr-auto">USDC balance</CardTitle>
            <WalletInformationDialog
              wallets={walletModels}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Active Chain Indicator */}
            <ActiveChainBadge />
            <WalletBalance />
            <WalletActions />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/invoices/generate">
            <Card className="w-full cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Invoices</p>
                  <p className="text-xs text-muted-foreground">Request payment</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/terminal">
            <Card className="w-full cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Monitor className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Terminal</p>
                  <p className="text-xs text-muted-foreground">Control display</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  )
}