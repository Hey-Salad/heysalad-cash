'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Plus, Send, Eye, Loader2, Mail } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string;
  created_at: string;
  pdf_url: string | null;
  billing_info: {
    billTo: {
      name: string;
      email?: string;
    };
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendForm, setSendForm] = useState({
    to: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await fetch('/api/invoices/list');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPDF = (invoice: Invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('PDF not available');
    }
  };

  const openSendDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSendForm({
      to: invoice.billing_info?.billTo?.email || '',
      subject: `Invoice ${invoice.invoice_number} from HeySalad Cash`,
      message: `Hi ${invoice.billing_info?.billTo?.name || 'there'},\n\nPlease find attached invoice ${invoice.invoice_number} for ${invoice.total_amount} ${invoice.currency}.\n\nYou can pay via traditional methods or using cryptocurrency (USDC) on Base or Polygon networks. Payment details and QR codes are included in the attached PDF.\n\nThank you for your business!\n\nBest regards`
    });
    setShowSendDialog(true);
  };

  const handleSendInvoice = async () => {
    if (!selectedInvoice) return;

    if (!sendForm.to.trim()) {
      toast.error('Please enter at least one recipient email');
      return;
    }

    setIsSending(true);

    try {
      const emails = sendForm.to.split(',').map(email => email.trim()).filter(Boolean);

      const response = await fetch(`/api/invoices/${selectedInvoice.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: emails,
          subject: sendForm.subject,
          message: sendForm.message
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invoice');
      }

      toast.success('Invoice sent successfully!');
      setShowSendDialog(false);
      loadInvoices(); // Reload to update status
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'sent':
        return 'bg-blue-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices with crypto payment options
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/invoices/generate')}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Create your first invoice with built-in crypto payment options
            </p>
            <Button onClick={() => router.push('/dashboard/invoices/generate')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">To:</span>{' '}
                        {invoice.billing_info?.billTo?.name || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Amount:</span>{' '}
                        <span className="text-lg font-bold text-foreground">
                          {invoice.total_amount.toFixed(2)} {invoice.currency}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Issue Date:</span>{' '}
                        {dayjs(invoice.issue_date).format('MMM D, YYYY')}
                      </p>
                      <p>
                        <span className="font-medium">Due Date:</span>{' '}
                        {dayjs(invoice.due_date).format('MMM D, YYYY')}
                        {dayjs().isAfter(dayjs(invoice.due_date)) && invoice.status !== 'paid' && (
                          <Badge variant="destructive" className="ml-2">
                            Overdue
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs">
                        Created {dayjs(invoice.created_at).fromNow()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewPDF(invoice)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => openSendDialog(invoice)}
                      variant="default"
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send Invoice Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send {selectedInvoice?.invoice_number} via email with crypto payment options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="to">To (comma-separated for multiple)</Label>
              <Input
                id="to"
                type="email"
                value={sendForm.to}
                onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                placeholder="customer@example.com, another@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={sendForm.subject}
                onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                className="w-full min-h-[150px] p-3 text-sm border rounded-md"
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💎 The PDF will include crypto payment options with wallet addresses and QR codes for Base and Polygon networks.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendInvoice} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
