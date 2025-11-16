'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, FileText, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface InvoiceBillTo {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
}

const initialItem: InvoiceLineItem = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0
};

const initialBillTo: InvoiceBillTo = {
  name: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: ''
};

export default function InvoiceGeneratorPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [invoiceNumber] = useState(`INV-${dayjs().format('YYMMDDHHmmss')}`);
  const [issueDate, setIssueDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dueDate, setDueDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [currency] = useState('USDC');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<InvoiceLineItem[]>([initialItem]);
  const [billTo, setBillTo] = useState<InvoiceBillTo>(initialBillTo);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = items.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
      0
    );
    return {
      subtotal,
      taxTotal,
      total: subtotal + taxTotal
    };
  }, [items]);

  const handleGenerate = async () => {
    // Validation
    if (!billTo.name.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast.error('Please fill in all item descriptions');
      return;
    }

    if (totals.total === 0) {
      toast.error('Invoice total must be greater than 0');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceNumber,
          issueDate,
          dueDate,
          currency,
          notes,
          terms,
          billTo,
          items,
          paymentChains: ['base', 'polygon']
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.pdf`;
      anchor.rel = 'noopener noreferrer';
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success('Invoice generated! Check your downloads.');

      setTimeout(() => {
        router.push('/dashboard/invoices');
      }, 1500);
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceLineItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const existing = updated[index];
      const parsed =
        field === 'description'
          ? String(value)
          : Number.isFinite(Number(value))
          ? Number(value)
          : 0;
      updated[index] = {
        ...existing,
        [field]: field === 'description' ? parsed : Number(parsed)
      };
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...initialItem }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-32">
      <div className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Request Payment</h1>
          <p className="text-sm text-muted-foreground">
            Generate a crypto invoice in seconds
          </p>
        </div>

        {/* Amount Display */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-4xl font-bold tracking-tight">
                {totals.total.toFixed(2)}
              </p>
              <p className="text-lg font-medium text-primary">USDC</p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-base">Customer Information</h2>

            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                value={billTo.name}
                onChange={(e) => setBillTo({ ...billTo, name: e.target.value })}
                placeholder="Enter customer name"
                className="text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={billTo.email}
                onChange={(e) => setBillTo({ ...billTo, email: e.target.value })}
                placeholder="customer@example.com"
                className="text-base h-12"
              />
            </div>

            {/* Advanced Customer Details Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? 'Hide' : 'Add'} address details
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="address1">Street Address</Label>
                  <Input
                    id="address1"
                    value={billTo.addressLine1}
                    onChange={(e) => setBillTo({ ...billTo, addressLine1: e.target.value })}
                    placeholder="123 Main St"
                    className="text-base h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={billTo.city}
                      onChange={(e) => setBillTo({ ...billTo, city: e.target.value })}
                      placeholder="City"
                      className="text-base h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={billTo.postalCode}
                      onChange={(e) => setBillTo({ ...billTo, postalCode: e.target.value })}
                      placeholder="12345"
                      className="text-base h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={billTo.country}
                    onChange={(e) => setBillTo({ ...billTo, country: e.target.value })}
                    placeholder="United States"
                    className="text-base h-12"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">What are you charging for?</h2>
              {items.length < 5 && (
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  {items.length > 1 && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => removeItem(index)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="e.g., Web design services"
                      className="text-base h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Amount (USDC)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        placeholder="0.00"
                        className="text-base h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="text-base h-12"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Item Total</span>
                    <span className="font-semibold">
                      {(item.quantity * item.unitPrice).toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Payment Methods Included</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm">Base Network (USDC)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-sm">Polygon Network (USDC)</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Your wallet addresses and QR codes will be automatically included in the PDF invoice.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Optional Notes */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-base">Additional Notes (Optional)</h2>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs">Notes or Instructions</Label>
              <textarea
                id="notes"
                className="w-full min-h-[80px] p-3 text-base border rounded-md resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details (Collapsed) */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-base">Invoice Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate" className="text-xs">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="text-sm h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-xs">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-sm h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Invoice Number</Label>
              <Input
                value={invoiceNumber}
                disabled
                className="text-sm h-10 bg-muted"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg">
        <div className="container max-w-2xl">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-5 w-5" />
                Generate Invoice ({totals.total.toFixed(2)} USDC)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
