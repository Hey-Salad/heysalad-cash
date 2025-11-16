import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { buildInvoicePdf, InvoiceBillTo, InvoiceLineItem, CryptoPaymentInfo } from '@/lib/invoice-service';
import dayjs from 'dayjs';

// Validation schemas
const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRate: z.number().nonnegative('Tax rate must be non-negative').optional().default(0)
});

const InvoiceBillToSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().default('USDC'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  billTo: InvoiceBillToSchema,
  items: z.array(InvoiceLineItemSchema).min(1, 'At least one item is required'),
  // Optional: specify which chains to include for payment
  paymentChains: z.array(z.enum(['base', 'polygon', 'arc'])).optional()
});

type CreateInvoicePayload = z.infer<typeof CreateInvoiceSchema>;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = CreateInvoiceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: parseResult.error.format()
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;

    // Get user profile for company info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, company_name, email, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get user's wallet addresses
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('blockchain, wallet_address')
      .eq('user_id', user.id);

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
    }

    // Generate invoice number if not provided
    const invoiceNumber = payload.invoiceNumber || `INV-${dayjs().format('YYMMDDHHmmss')}`;

    // Parse dates
    const issueDate = payload.issueDate ? new Date(payload.issueDate) : new Date();
    const dueDate = payload.dueDate
      ? new Date(payload.dueDate)
      : dayjs().add(30, 'day').toDate();

    // Prepare crypto payment options
    const cryptoPayments: CryptoPaymentInfo[] = [];
    const chainNames: Record<string, string> = {
      BASE: 'Base Network',
      POLYGON: 'Polygon Network',
      ARC: 'Arc Network'
    };

    // Determine which chains to include
    const chainsToInclude = payload.paymentChains || ['base', 'polygon'];

    if (wallets && wallets.length > 0) {
      for (const chain of chainsToInclude) {
        const wallet = wallets.find(
          (w) => w.blockchain.toLowerCase() === chain.toLowerCase()
        );
        if (wallet && wallet.wallet_address) {
          cryptoPayments.push({
            walletAddress: wallet.wallet_address,
            chain: chain as 'base' | 'polygon' | 'arc',
            chainName: chainNames[wallet.blockchain] || wallet.blockchain
          });
        }
      }
    }

    // Calculate total amount
    const totalAmount = payload.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100;
      return sum + itemSubtotal + itemTax;
    }, 0);

    // Build PDF
    const pdfBuffer = await buildInvoicePdf({
      invoiceNumber,
      currency: payload.currency,
      issueDate,
      dueDate,
      billTo: payload.billTo,
      items: payload.items,
      notes: payload.notes,
      terms: payload.terms,
      companyName: profile.company_name || profile.full_name || profile.username || 'Your Company',
      companyEmail: profile.email,
      cryptoPayments: cryptoPayments.length > 0 ? cryptoPayments : undefined
    });

    // Upload PDF to Supabase Storage
    const storagePath = `${user.id}/${invoiceNumber}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return NextResponse.json(
        { error: 'Failed to store invoice PDF' },
        { status: 500 }
      );
    }

    // Create signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(storagePath, 3600);

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
    }

    // Store invoice metadata in database
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        storage_path: storagePath,
        pdf_url: urlData?.signedUrl,
        billing_info: {
          billTo: payload.billTo,
          issueDate: issueDate.toISOString(),
          dueDate: dueDate.toISOString()
        },
        total_amount: totalAmount,
        currency: payload.currency,
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        notes: payload.notes,
        terms: payload.terms,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting invoice:', insertError);
      return NextResponse.json(
        { error: 'Failed to save invoice metadata' },
        { status: 500 }
      );
    }

    // Store invoice line items
    const itemsToInsert = payload.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate || 0,
      amount: item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100)
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error inserting invoice items:', itemsError);
    }

    // Return PDF as blob
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
        'X-Invoice-Id': invoice.id,
        'X-Invoice-Number': invoiceNumber
      }
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
