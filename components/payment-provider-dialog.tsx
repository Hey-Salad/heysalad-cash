"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, Building2, ArrowRight } from "lucide-react";
import Image from "next/image";
import StripeOnrampDialog from "@/components/stripe-onramp-dialog";
import { useWeb3 } from "@/components/web3-provider";

interface PaymentProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentProviderDialog({ open, onOpenChange }: PaymentProviderDialogProps) {
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const { accounts, activeChain } = useWeb3();

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    
    if (provider === "stripe") {
      onOpenChange(false);
      setStripeDialogOpen(true);
    } else if (provider === "moonpay") {
      onOpenChange(false);
      openMoonPay();
    } else if (provider === "mercuryo") {
      // Coming soon
      alert("Mercuryo integration coming soon!");
    }
  };

  const openMoonPay = () => {
    const walletAddress = accounts[activeChain]?.address;
    
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // Get the currency code based on active chain
    const currencyCode = activeChain === 'polygon' ? 'usdc_polygon' : 'usdc_base';

    // Build MoonPay widget URL
    const moonpayUrl = new URL('https://buy.moonpay.com');
    moonpayUrl.searchParams.append('apiKey', process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY!);
    moonpayUrl.searchParams.append('currencyCode', currencyCode);
    moonpayUrl.searchParams.append('walletAddress', walletAddress);
    moonpayUrl.searchParams.append('colorCode', '#000000');
    moonpayUrl.searchParams.append('showWalletAddressForm', 'false');
    moonpayUrl.searchParams.append('enabledPaymentMethods', 'credit_debit_card,apple_pay,google_pay,sepa_bank_transfer,gbp_bank_transfer');

    // Open MoonPay in a new window
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      moonpayUrl.toString(),
      'MoonPay',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const providers = [
    {
      id: "stripe",
      name: "Stripe",
      description: "Credit/Debit Card, Apple Pay, Google Pay",
      icon: <CreditCard className="w-6 h-6" />,
      fees: "~3-5% fees",
      available: true,
      recommended: true,
    },
    {
      id: "moonpay",
      name: "MoonPay",
      description: "Credit/Debit Card, Bank Transfer",
      icon: <Wallet className="w-6 h-6" />,
      fees: "~4-5% fees",
      available: true,
      recommended: false,
    },
    {
      id: "mercuryo",
      name: "Mercuryo",
      description: "Credit/Debit Card, Bank Transfer",
      icon: <Building2 className="w-6 h-6" />,
      fees: "~3-4% fees",
      available: false,
      recommended: false,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {/* HeySalad Logo */}
            <div className="flex justify-center mb-2">
              <Image
                src="/heysalad-logo-black.png"
                alt="HeySalad"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </div>
            <DialogTitle className="text-center text-2xl">Add USDC</DialogTitle>
            <DialogDescription className="text-center">
              Choose your preferred payment method
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => provider.available && handleProviderSelect(provider.id)}
                disabled={!provider.available}
                className={`
                  relative p-4 rounded-lg border-2 text-left transition-all
                  ${provider.available 
                    ? 'border-gray-200 hover:border-black hover:shadow-md cursor-pointer' 
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  }
                  ${provider.recommended ? 'ring-2 ring-black ring-offset-2' : ''}
                `}
              >
                {provider.recommended && (
                  <div className="absolute -top-2 left-4 bg-black text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    Recommended
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {provider.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      {!provider.available && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{provider.description}</p>
                    <p className="text-xs text-gray-500">{provider.fees}</p>
                  </div>

                  {/* Arrow */}
                  {provider.available && (
                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 self-center" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">💡 Quick Tip</p>
            <p className="text-xs">
              All providers support instant USDC deposits. Choose based on your preferred payment method and fees.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Dialog */}
      <StripeOnrampDialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen} />
    </>
  );
}
