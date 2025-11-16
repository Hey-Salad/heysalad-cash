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

    // Get user profile for company info (optional - use fallback if not found)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, company_name, email, username')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Use profile data if available, otherwise fallback to auth user data
    const companyName = profile?.company_name || profile?.full_name || profile?.username || user.email || 'Your Company';
    const companyEmail = profile?.email || user.email;

    // Get user's wallet addresses (use profile_id, not user_id)
    let wallets: Array<{ blockchain: string; wallet_address: string }> = [];
    if (profile?.id) {
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('blockchain, wallet_address')
        .eq('profile_id', profile.id);

      if (walletsError) {
        console.error('Error fetching wallets:', walletsError);
      } else {
        wallets = walletsData || [];
      }
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
      companyName,
      companyEmail,
      cryptoPayments: cryptoPayments.length > 0 ? cryptoPayments : undefined
    });

    // Upload PDF to Supabase Storage (optional - invoice will still work without it)
    const storagePath = `${user.id}/${invoiceNumber}-${Date.now()}.pdf`;
    let pdfUrl = null;

    try {
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.warn('Storage not available (optional):', uploadError.message);
      } else {
        // Create signed URL (valid for 1 hour)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('invoices')
          .createSignedUrl(storagePath, 3600);

        if (urlError) {
          console.warn('Could not create signed URL:', urlError.message);
        } else {
          pdfUrl = urlData?.signedUrl;
        }
      }
    } catch (storageError) {
      console.warn('Supabase Storage not configured (optional):', storageError);
    }

    // Store invoice metadata in database (optional - invoice will still download)
    let invoice: any = null;
    try {
      const { data: invoiceData, error: insertError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber,
          storage_path: pdfUrl ? storagePath : null,
          pdf_url: pdfUrl,
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
        console.warn('Could not save invoice to database:', insertError.message);
      } else {
        invoice = invoiceData;
      }
    } catch (dbError) {
      console.warn('Database insert failed (invoice will still download):', dbError);
    }

    // Store invoice line items (optional - only if invoice was saved)
    if (invoice?.id) {
      try {
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
          console.warn('Could not save invoice items:', itemsError.message);
        }
      } catch (itemsErr) {
        console.warn('Failed to insert invoice items (optional):', itemsErr);
      }
    }

    // Return PDF as blob
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
      'X-Invoice-Number': invoiceNumber
    };

    // Add invoice ID header if it was saved
    if (invoice?.id) {
      headers['X-Invoice-Id'] = invoice.id;
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
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
