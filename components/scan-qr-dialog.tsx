"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ScanQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanQRDialog({ open, onOpenChange }: ScanQRDialogProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      // Create a canvas to read the QR code
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.src = event.target?.result as string;
        img.onload = () => {
          // For now, we'll use a simple approach
          // In production, you'd use a QR code scanning library like jsQR
          toast.info("QR code scanning coming soon! Please enter address manually.");
          setScanning(false);
        };
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error scanning QR code:", error);
      toast.error("Failed to scan QR code");
      setScanning(false);
    }
  };

  const handleSend = () => {
    if (!address) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Navigate to send page with pre-filled data
    const params = new URLSearchParams({
      to: address,
      amount: amount,
    });
    
    router.push(`/dashboard/send?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Scan QR Code</DialogTitle>
          <DialogDescription className="text-center">
            Upload a QR code or enter address manually
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Upload QR Code */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-black transition-colors"
              disabled={scanning}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8" />
                <span className="font-semibold">
                  {scanning ? "Scanning..." : "Upload QR Code"}
                </span>
                <span className="text-xs text-gray-500">
                  Click to select an image
                </span>
              </div>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or enter manually</span>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Recipient Address</Label>
              <Input
                id="address"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            className="w-full h-12 bg-black text-white hover:bg-black/90"
            disabled={!address || !amount}
          >
            Continue to Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
