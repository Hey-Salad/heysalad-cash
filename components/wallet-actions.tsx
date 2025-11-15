"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Scan, Plus, ShoppingCart } from "lucide-react";
import { ReceiveQRDialog } from "@/components/receive-qr-dialog";
import { ScanQRDialog } from "@/components/scan-qr-dialog";
import { MoonPayButton } from "@/components/moonpay-button";
import StripeOnrampDialog from "@/components/stripe-onramp-dialog";

export function WalletActions() {
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Receive with QR Code */}
        <Button
          onClick={() => setReceiveDialogOpen(true)}
          variant="outline"
          className="flex items-center gap-2 h-12 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <QrCode className="w-5 h-5" />
          <span className="font-semibold">Receive</span>
        </Button>

        {/* Scan QR Code */}
        <Button
          onClick={() => setScanDialogOpen(true)}
          variant="outline"
          className="flex items-center gap-2 h-12 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <Scan className="w-5 h-5" />
          <span className="font-semibold">Scan</span>
        </Button>

        {/* Add USDC (Stripe) */}
        <Button
          onClick={() => setStripeDialogOpen(true)}
          className="flex items-center gap-2 h-12 bg-black text-white hover:bg-black/90"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add USDC</span>
        </Button>

        {/* Buy USDC (MoonPay) - Hidden by default */}
        <MoonPayButton className="hidden" />
      </div>

      {/* Dialogs */}
      <ReceiveQRDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen} />
      <ScanQRDialog open={scanDialogOpen} onOpenChange={setScanDialogOpen} />
      <StripeOnrampDialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen} />
    </>
  );
}
