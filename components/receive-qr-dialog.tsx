"use client";

import { useState } from "react";
import { useWeb3 } from "@/components/web3-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ReceiveQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiveQRDialog({ open, onOpenChange }: ReceiveQRDialogProps) {
  const { accounts, activeChain } = useWeb3();
  const [copied, setCopied] = useState(false);
  const walletAddress = accounts[activeChain]?.address || "";

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  // Generate QR code URL using a QR code API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(walletAddress)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Receive USDC</DialogTitle>
          <DialogDescription className="text-center">
            Scan this QR code or share your wallet address
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-black">
            {walletAddress ? (
              <img
                src={qrCodeUrl}
                alt="Wallet QR Code"
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500">No wallet address</p>
              </div>
            )}
          </div>

          {/* Wallet Address */}
          <div className="w-full space-y-2">
            <p className="text-sm font-medium text-center">Your Wallet Address</p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <code className="flex-1 text-xs break-all font-mono">
                {walletAddress || "No address available"}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyAddress}
                disabled={!walletAddress}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Network Info */}
          <div className="w-full p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-center text-blue-900">
              <span className="font-semibold">Network:</span>{" "}
              {activeChain === "polygon" ? "Polygon" : "Base"}
            </p>
            <p className="text-xs text-center text-blue-700 mt-1">
              Make sure the sender uses the same network
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
