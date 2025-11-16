'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  QrCode,
  Monitor,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TerminalDevice {
  terminal_id: string;
  last_seen: string;
  device_info: {
    ip?: string;
    rssi?: number;
    mode?: 'idle_bmp' | 'payment_qr';
  };
  status: 'online' | 'offline';
}

export default function TerminalPage() {
  const router = useRouter();
  const [terminals, setTerminals] = useState<TerminalDevice[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [showQrDialog, setShowQrDialog] = useState(false);

  useEffect(() => {
    // Load saved terminal ID
    const saved = localStorage.getItem('selected_terminal_id');
    if (saved) {
      setSelectedTerminal(saved);
    }

    // Poll for online terminals
    loadTerminals();
    const interval = setInterval(loadTerminals, 10000); // Every 10s
    return () => clearInterval(interval);
  }, []);

  const loadTerminals = async () => {
    try {
      const response = await fetch('/api/terminal/list');
      if (response.ok) {
        const data = await response.json();
        setTerminals(data.terminals || []);
      }
    } catch (error) {
      console.error('Failed to load terminals:', error);
    }
  };

  const sendCommand = async (commandType: string, commandData: any = {}) => {
    if (!selectedTerminal) {
      toast.error('Please select a terminal first');
      return false;
    }

    setIsLoading(true);
    try {
      // Create command
      const cmdResponse = await fetch('/api/terminal/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          terminalId: selectedTerminal,
          commandType,
          commandData
        })
      });

      if (!cmdResponse.ok) {
        throw new Error('Failed to send command');
      }

      const { commandId } = await cmdResponse.json();

      // Poll for response (max 15 seconds)
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const respResponse = await fetch(`/api/terminal/response?commandId=${commandId}`);
        if (respResponse.ok) {
          const data = await respResponse.json();
          if (data.status === 'completed') {
            return true;
          } else if (data.status === 'failed') {
            throw new Error(data.response?.error || 'Command failed');
          }
        }
      }

      throw new Error('Command timeout');
    } catch (error: any) {
      console.error('Command error:', error);
      toast.error(error.message || 'Failed to execute command');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const displayQRCode = async () => {
    if (!qrData) {
      toast.error('Please enter wallet address or payment data');
      return;
    }

    const success = await sendCommand('display_qr', {
      data: qrData,
      label: qrLabel || 'Payment Request'
    });

    if (success) {
      toast.success('QR code displayed on terminal!');
      setShowQrDialog(false);
      setQrData('');
      setQrLabel('');
      await loadTerminals();
    }
  };

  const returnToIdle = async () => {
    const success = await sendCommand('return_idle');
    if (success) {
      toast.success('Terminal returned to idle mode');
      await loadTerminals();
    }
  };

  const selectTerminal = (terminalId: string) => {
    setSelectedTerminal(terminalId);
    localStorage.setItem('selected_terminal_id', terminalId);
    toast.success('Terminal selected');
  };

  const selectedTerminalData = terminals.find(t => t.terminal_id === selectedTerminal);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl px-4 py-6 space-y-4">
        {/* Header with Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="gap-2 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-2xl font-bold">Payment Terminal</h1>
          <p className="text-sm text-muted-foreground">
            Control your HeySalad Cash payment terminal (no IP needed!)
          </p>
        </div>

        {/* Terminal Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Terminals</CardTitle>
            <CardDescription>
              Select a terminal to control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {terminals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No terminals found</p>
                <p className="text-xs mt-1">Make sure your device is powered on and connected to WiFi</p>
              </div>
            )}

            {terminals.map(terminal => {
              const isSelected = terminal.terminal_id === selectedTerminal;
              const isOnline = terminal.status === 'online';
              const lastSeen = new Date(terminal.last_seen);
              const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60000);

              return (
                <div
                  key={terminal.terminal_id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-accent'
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => selectTerminal(terminal.terminal_id)}
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">{terminal.terminal_id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {terminal.device_info?.ip || 'Unknown IP'}
                        </p>
                        {terminal.device_info?.rssi && (
                          <Badge variant="outline" className="text-xs">
                            <Wifi className="h-3 w-3 mr-1" />
                            {terminal.device_info.rssi} dBm
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isOnline ? 'default' : 'secondary'} className={isOnline ? 'bg-green-500' : ''}>
                      {isOnline ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                    {terminal.device_info?.mode && (
                      <Badge variant="outline">
                        {terminal.device_info.mode === 'payment_qr' ? 'QR Active' : 'Idle'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Terminal Controls */}
        {selectedTerminal && selectedTerminalData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Controls</CardTitle>
              <CardDescription>
                Control what appears on {selectedTerminalData.terminal_id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg" disabled={isLoading}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Display QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Display Payment QR Code</DialogTitle>
                    <DialogDescription>
                      Enter payment details to display on the terminal
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="qr-data">Wallet Address or Payment Data</Label>
                      <Input
                        id="qr-data"
                        placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
                        value={qrData}
                        onChange={(e) => setQrData(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qr-label">Label (Optional)</Label>
                      <Input
                        id="qr-label"
                        placeholder="$25.00 USDC"
                        value={qrLabel}
                        onChange={(e) => setQrLabel(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowQrDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={displayQRCode} disabled={isLoading || !qrData}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Displaying...
                        </>
                      ) : (
                        'Display QR'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={returnToIdle}
                disabled={isLoading || selectedTerminalData.device_info?.mode === 'idle_bmp'}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Return to Idle Screen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        {terminals.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <p className="font-medium">1. Power on your terminal</p>
                <p className="text-muted-foreground pl-4">
                  Connect your ESP32 device to power via USB
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">2. Terminal connects automatically</p>
                <p className="text-muted-foreground pl-4">
                  Your terminal will connect to WiFi and appear here within 30 seconds
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">3. Select and control</p>
                <p className="text-muted-foreground pl-4">
                  Click on your terminal to select it, then use the controls above
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
