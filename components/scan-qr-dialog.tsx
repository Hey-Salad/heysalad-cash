"use client";

import { useState, useRef, useEffect } from "react";
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
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BrowserMultiFormatReader } from "@zxing/library";

interface ScanQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanQRDialog({ open, onOpenChange }: ScanQRDialogProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const router = useRouter();

  // Cleanup camera stream when dialog closes
  useEffect(() => {
    if (!open && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    }
  }, [open, stream]);

  const startCamera = async () => {
    try {
      setScanning(true);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera not supported on this device. Please use upload instead.");
        setScanning(false);
        return;
      }

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;
      
      // Request camera with multiple fallback options
      let mediaStream: MediaStream;
      try {
        // Try back camera first (for mobile)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (err) {
        // Fallback to any available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute("playsinline", "true"); // Important for iOS
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.setAttribute("muted", "true");
        
        // Wait for video to start playing
        await videoRef.current.play();
        
        // Start continuous scanning
        const scanFromVideo = async () => {
          if (!videoRef.current || !stream) return;
          
          try {
            const result = await codeReader.decodeFromVideoElement(videoRef.current);
            if (result) {
              const scannedText = result.getText();
              handleScannedQR(scannedText);
              stopCamera();
              return;
            }
          } catch (error) {
            // No QR code found yet, continue scanning
          }
          
          // Continue scanning
          if (stream && videoRef.current) {
            setTimeout(scanFromVideo, 100); // Scan every 100ms
          }
        };
        
        // Start scanning after a short delay
        setTimeout(scanFromVideo, 500);
      }
      
      setScanning(false);
      toast.success("Camera ready! Point at a QR code to scan.");
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      
      let errorMessage = "Could not access camera. ";
      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera permissions in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera found on this device.";
      } else {
        errorMessage += "Please use upload instead.";
      }
      
      toast.error(errorMessage);
      setScanning(false);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setShowCamera(false);
  };

  const handleScannedQR = (scannedText: string) => {
    // Parse QR code data
    // Could be: plain address, or ethereum:address?amount=X format
    try {
      if (scannedText.includes(':')) {
        // Parse URI format (e.g., ethereum:0x123?amount=10)
        const [, addressPart] = scannedText.split(':');
        const [addr, params] = addressPart.split('?');
        setAddress(addr);
        
        if (params) {
          const urlParams = new URLSearchParams(params);
          const amt = urlParams.get('amount');
          if (amt) setAmount(amt);
        }
      } else {
        // Plain address
        setAddress(scannedText);
      }
      
      toast.success("QR code scanned successfully!");
    } catch (error) {
      console.error("Error parsing QR code:", error);
      setAddress(scannedText); // Fallback to raw text
      toast.success("QR code scanned!");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const codeReader = new BrowserMultiFormatReader();
      const imageUrl = URL.createObjectURL(file);
      
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      const scannedText = result.getText();
      
      handleScannedQR(scannedText);
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error("Error scanning QR code:", error);
      toast.error("Could not read QR code from image. Please try again or enter manually.");
    } finally {
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
          <DialogTitle className="text-center text-2xl">Scan QR Code</DialogTitle>
          <DialogDescription className="text-center">
            Use camera or upload a QR code image
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Camera View or Upload Options */}
          {showCamera ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <Button
                  onClick={stopCamera}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-center text-gray-600">
                Position QR code in the camera view
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Camera Button */}
              <Button
                onClick={startCamera}
                variant="outline"
                className="h-32 border-2 border-dashed border-gray-300 hover:border-black transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8" />
                  <span className="font-semibold text-sm">Use Camera</span>
                </div>
              </Button>

              {/* Upload Button */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="h-32 border-2 border-dashed border-gray-300 hover:border-black transition-colors"
                disabled={scanning}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" />
                  <span className="font-semibold text-sm">
                    {scanning ? "Scanning..." : "Upload Image"}
                  </span>
                </div>
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

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
