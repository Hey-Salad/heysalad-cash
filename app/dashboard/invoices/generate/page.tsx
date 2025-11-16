'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, FileText } from 'lucide-react';

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
  const [invoiceNumber] = useState(`INV-${dayjs().format('YYMMDDHHmmss')}`);
  const [issueDate, setIssueDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dueDate, setDueDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [currency] = useState('USDC');
  const [notes, setNotes] = useState('Payment due within 30 days. Crypto payments accepted.');
  const [terms, setTerms] = useState('Thank you for your business! Pay via USDC on Base, Polygon, or Arc networks.');
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
      toast.error('Please enter a bill-to name');
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast.error('Please fill in all item descriptions');
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
          paymentChains: ['base', 'polygon'] // Include Base and Polygon wallets
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate invoice');
      }

      // Get the PDF blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Download the PDF
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.pdf`;
      anchor.rel = 'noopener noreferrer';
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success('Invoice generated successfully!');

      // Redirect to invoices list after a delay
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
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Generate Invoice</h1>
        <p className="text-muted-foreground">
          Create professional invoices with crypto payment options
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Basic invoice information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input id="invoiceNumber" value={invoiceNumber} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" value={currency} disabled />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill To */}
          <Card>
            <CardHeader>
              <CardTitle>Bill To</CardTitle>
              <CardDescription>Customer/client information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billToName">Name *</Label>
                <Input
                  id="billToName"
                  value={billTo.name}
                  onChange={(e) => setBillTo({ ...billTo, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billToEmail">Email</Label>
                <Input
                  id="billToEmail"
                  type="email"
                  value={billTo.email}
                  onChange={(e) => setBillTo({ ...billTo, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={billTo.addressLine1}
                  onChange={(e) => setBillTo({ ...billTo, addressLine1: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={billTo.addressLine2}
                  onChange={(e) => setBillTo({ ...billTo, addressLine2: e.target.value })}
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={billTo.city}
                    onChange={(e) => setBillTo({ ...billTo, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={billTo.postalCode}
                    onChange={(e) => setBillTo({ ...billTo, postalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={billTo.country}
                    onChange={(e) => setBillTo({ ...billTo, country: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>Products or services</CardDescription>
                </div>
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg relative">
                  {items.length > 1 && (
                    <Button
                      onClick={() => removeItem(index)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Total: {((item.quantity * item.unitPrice) * (1 + item.taxRate / 100)).toFixed(2)} {currency}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[80px] p-3 text-sm border rounded-md"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Payment Terms</Label>
                <textarea
                  id="terms"
                  className="w-full min-h-[80px] p-3 text-sm border rounded-md"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Payment terms and conditions..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">{totals.taxTotal.toFixed(2)} {currency}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold">{totals.total.toFixed(2)} {currency}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  💎 This invoice will include crypto payment options for:
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Base Network (USDC)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Polygon Network (USDC)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Wallet addresses and QR codes will be automatically included in the PDF.
                </p>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
