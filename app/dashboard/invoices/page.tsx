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
import { FileText, Plus, Send, Eye, Loader2, Mail, ArrowLeft } from 'lucide-react';
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
    method: 'email' as 'email' | 'sms',
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
      method: 'email',
      to: invoice.billing_info?.billTo?.email || '',
      subject: `Invoice ${invoice.invoice_number} from HeySalad Cash`,
      message: `Hi ${invoice.billing_info?.billTo?.name || 'there'},\n\nPlease find attached invoice ${invoice.invoice_number} for ${invoice.total_amount} ${invoice.currency}.\n\nYou can pay via traditional methods or using cryptocurrency (USDC) on Base or Polygon networks. Payment details and QR codes are included in the attached PDF.\n\nThank you for your business!\n\nBest regards`
    });
    setShowSendDialog(true);
  };

  const handleSendInvoice = async () => {
    if (!selectedInvoice) return;

    if (!sendForm.to.trim()) {
      toast.error(sendForm.method === 'email' ? 'Please enter at least one recipient email' : 'Please enter at least one phone number');
      return;
    }

    setIsSending(true);

    try {
      const recipients = sendForm.to.split(',').map(r => r.trim()).filter(Boolean);

      const response = await fetch(`/api/invoices/${selectedInvoice.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: sendForm.method,
          to: recipients,
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
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-2xl px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

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

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Manage your invoices with crypto payment options
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/invoices/generate')} className="w-full h-12">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-semibold mb-2">No invoices yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Create your first invoice with crypto payments
            </p>
            <Button onClick={() => router.push('/dashboard/invoices/generate')} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold">{invoice.invoice_number}</h3>
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
                          <span className="text-base font-bold text-foreground">
                            {invoice.total_amount.toFixed(2)} {invoice.currency}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Issue:</span>{' '}
                          {dayjs(invoice.issue_date).format('MMM D, YYYY')}
                        </p>
                        <p>
                          <span className="font-medium">Due:</span>{' '}
                          {dayjs(invoice.due_date).format('MMM D, YYYY')}
                          {dayjs().isAfter(dayjs(invoice.due_date)) && invoice.status !== 'paid' && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Overdue
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs">
                          {dayjs(invoice.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleViewPDF(invoice)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => openSendDialog(invoice)}
                      variant="default"
                      size="sm"
                      className="w-full"
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
              Send {selectedInvoice?.invoice_number} via email or SMS
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Method Selection */}
            <div className="space-y-2">
              <Label>Send Method</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="method"
                    value="email"
                    checked={sendForm.method === 'email'}
                    onChange={(e) => setSendForm({ ...sendForm, method: 'email', to: selectedInvoice?.billing_info?.billTo?.email || '' })}
                    className="w-4 h-4"
                  />
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="method"
                    value="sms"
                    checked={sendForm.method === 'sms'}
                    onChange={(e) => setSendForm({ ...sendForm, method: 'sms', to: '' })}
                    className="w-4 h-4"
                  />
                  <Send className="h-4 w-4" />
                  <span className="text-sm">SMS</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to">
                {sendForm.method === 'email' ? 'Email Address(es)' : 'Phone Number(s)'} (comma-separated for multiple)
              </Label>
              <Input
                id="to"
                type={sendForm.method === 'email' ? 'email' : 'tel'}
                value={sendForm.to}
                onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                placeholder={sendForm.method === 'email' ? 'customer@example.com, another@example.com' : '+1234567890, +0987654321'}
              />
            </div>

            {sendForm.method === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={sendForm.subject}
                  onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Message {sendForm.method === 'sms' && '(160 chars max recommended)'}</Label>
              <textarea
                id="message"
                className="w-full min-h-[150px] p-3 text-sm border rounded-md"
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                placeholder={sendForm.method === 'email' ? 'Optional custom message...' : 'Optional custom SMS message (default includes invoice link)...'}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                {sendForm.method === 'email'
                  ? '💎 The PDF will be attached with crypto payment options including wallet addresses and QR codes for Base and Polygon networks.'
                  : '📱 An SMS will be sent with invoice details and a secure download link (valid for 7 days).'}
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
                  {sendForm.method === 'email' ? <Mail className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  Send {sendForm.method === 'email' ? 'Email' : 'SMS'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
