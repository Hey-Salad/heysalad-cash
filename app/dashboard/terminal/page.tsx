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
  Wifi,
  WifiOff,
  QrCode,
  Monitor,
  Settings,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle
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

interface TerminalStatus {
  mode: 'idle_bmp' | 'payment_qr';
  display_ready: boolean;
  connected?: boolean;
}

export default function TerminalPage() {
  const router = useRouter();
  const [terminalIP, setTerminalIP] = useState('');
  const [savedIP, setSavedIP] = useState('');
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [showQrDialog, setShowQrDialog] = useState(false);

  useEffect(() => {
    // Load saved terminal IP from localStorage
    const saved = localStorage.getItem('terminal_ip');
    if (saved) {
      setSavedIP(saved);
      setTerminalIP(saved);
      checkTerminalStatus(saved);
    }
  }, []);

  const checkTerminalStatus = async (ip: string) => {
    if (!ip) return;

    try {
      const response = await fetch(`http://${ip}/api/display/status`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:change-me')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTerminalStatus({ ...data, connected: true });
      } else {
        setTerminalStatus({ mode: 'idle_bmp', display_ready: false, connected: false });
      }
    } catch (error) {
      setTerminalStatus({ mode: 'idle_bmp', display_ready: false, connected: false });
    }
  };

  const connectToTerminal = async () => {
    if (!terminalIP) {
      toast.error('Please enter a terminal IP address');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch(`http://${terminalIP}/api/display/status`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:change-me')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTerminalStatus({ ...data, connected: true });
        localStorage.setItem('terminal_ip', terminalIP);
        setSavedIP(terminalIP);
        toast.success('Connected to terminal!');
      } else {
        throw new Error('Failed to connect');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect to terminal. Check IP and network.');
      setTerminalStatus({ mode: 'idle_bmp', display_ready: false, connected: false });
    } finally {
      setIsConnecting(false);
    }
  };

  const displayQRCode = async () => {
    if (!qrData) {
      toast.error('Please enter wallet address or payment data');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://${savedIP}/api/display/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('admin:change-me')
        },
        body: JSON.stringify({
          data: qrData,
          label: qrLabel || 'Payment Request'
        })
      });

      if (response.ok) {
        toast.success('QR code displayed on terminal!');
        setShowQrDialog(false);
        setQrData('');
        setQrLabel('');
        await checkTerminalStatus(savedIP);
      } else {
        throw new Error('Failed to display QR');
      }
    } catch (error) {
      console.error('Display error:', error);
      toast.error('Failed to display QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const returnToIdle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${savedIP}/api/display/idle`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:change-me')
        }
      });

      if (response.ok) {
        toast.success('Terminal returned to idle mode');
        await checkTerminalStatus(savedIP);
      } else {
        throw new Error('Failed to return to idle');
      }
    } catch (error) {
      console.error('Idle error:', error);
      toast.error('Failed to change display mode');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = () => {
    if (savedIP) {
      checkTerminalStatus(savedIP);
      toast.success('Status refreshed');
    }
  };

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
            Control your HeySalad Cash payment terminal
          </p>
        </div>

        {/* Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Terminal Connection</CardTitle>
              {terminalStatus?.connected ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
            <CardDescription>
              Connect to your ESP32 terminal device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terminal-ip">Terminal IP Address</Label>
              <div className="flex gap-2">
                <Input
                  id="terminal-ip"
                  placeholder="192.168.1.100"
                  value={terminalIP}
                  onChange={(e) => setTerminalIP(e.target.value)}
                  disabled={isConnecting}
                />
                <Button
                  onClick={connectToTerminal}
                  disabled={isConnecting || !terminalIP}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Find your terminal IP on the device display or in your router settings
              </p>
            </div>

            {savedIP && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {terminalStatus?.connected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{savedIP}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshStatus}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Terminal Status Card */}
        {terminalStatus?.connected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Status</CardTitle>
              <CardDescription>
                Current terminal display mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5" />
                  <div>
                    <p className="font-medium">
                      {terminalStatus.mode === 'payment_qr' ? 'Payment QR Code' : 'Idle Screen'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {terminalStatus.display_ready ? 'Display ready' : 'Display initializing'}
                    </p>
                  </div>
                </div>
                <Badge variant={terminalStatus.mode === 'payment_qr' ? 'default' : 'secondary'}>
                  {terminalStatus.mode === 'payment_qr' ? 'Active' : 'Idle'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terminal Controls */}
        {terminalStatus?.connected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Controls</CardTitle>
              <CardDescription>
                Control what appears on the terminal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
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
                disabled={isLoading || terminalStatus.mode === 'idle_bmp'}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Return to Idle Screen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        {!terminalStatus?.connected && (
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
                <p className="font-medium">2. Connect to terminal WiFi</p>
                <p className="text-muted-foreground pl-4">
                  Network: <code className="bg-muted px-1 py-0.5 rounded">HeySalad-Camera</code><br />
                  Password: <code className="bg-muted px-1 py-0.5 rounded">SET_ME_AP_PASSWORD</code>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">3. Configure WiFi (Optional)</p>
                <p className="text-muted-foreground pl-4">
                  Visit http://192.168.4.1 to connect the terminal to your WiFi network
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">4. Enter terminal IP above</p>
                <p className="text-muted-foreground pl-4">
                  Use 192.168.4.1 (AP mode) or find the IP from your router
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
