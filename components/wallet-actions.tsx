"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Scan, Plus } from "lucide-react";
import { ReceiveQRDialog } from "@/components/receive-qr-dialog";
import { ScanQRDialog } from "@/components/scan-qr-dialog";
import { PaymentProviderDialog } from "@/components/payment-provider-dialog";

export function WalletActions() {
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        {/* Top Row: Receive and Scan */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setReceiveDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2 h-12 border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <QrCode className="w-5 h-5" />
            <span className="font-semibold">Receive</span>
          </Button>

          <Button
            onClick={() => setScanDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2 h-12 border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <Scan className="w-5 h-5" />
            <span className="font-semibold">Scan</span>
          </Button>
        </div>

        {/* Bottom Row: Single Add USDC button */}
        <Button
          onClick={() => setPaymentDialogOpen(true)}
          className="flex items-center gap-2 h-12 bg-black text-white hover:bg-black/90 w-full"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add USDC</span>
        </Button>
      </div>

      {/* Dialogs */}
      <ReceiveQRDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen} />
      <ScanQRDialog open={scanDialogOpen} onOpenChange={setScanDialogOpen} />
      <PaymentProviderDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />
    </>
  );
}
