# 💸 Invoice Generation with Crypto Payments - Setup Guide

## Overview

The HeySalad Cash invoice system allows you to generate professional invoices with **built-in cryptocurrency payment options**. Each invoice automatically includes:

- 💎 Wallet addresses for Base and Polygon networks
- 📱 QR codes for easy mobile payments
- 📄 Professional PDF generation
- 📧 Email delivery with attachments
- 📊 Invoice tracking and management

---

## ✨ Features

### Core Features
- **Professional PDF Invoices** with company branding
- **Multi-Chain Crypto Payments** (Base, Polygon, Arc)
- **QR Code Generation** for wallet addresses
- **Email Delivery** via SendGrid
- **Invoice Management** dashboard
- **Payment Tracking** (manual and automated)
- **Real-time Status Updates**

### What Makes It Special
- **Automatic Wallet Integration**: Your wallet addresses are automatically pulled from your profile
- **Crypto-Native**: USDC payments with no conversion needed
- **User-Friendly**: Clean, modern UI for invoice creation
- **Professional**: Enterprise-grade PDF generation

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd ~/heysalad-cash
npm install
```

This will install the new dependencies:
- `pdfkit` - PDF generation
- `qrcode` - QR code generation
- `dayjs` - Date formatting
- `@sendgrid/mail` - Email delivery

### Step 2: Run Database Migration

```bash
# Make sure Supabase is running
npx supabase db push

# Or if using remote Supabase:
npx supabase db push --db-url "postgresql://..."
```

This creates the following tables:
- `invoices` - Main invoice records
- `invoice_items` - Line items for each invoice
- `invoice_emails` - Email delivery tracking
- `invoice_clicks` - PDF view tracking

And the storage bucket:
- `invoices` - For PDF file storage

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# SendGrid (for email delivery)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@heysalad.io
```

**Note**: Email delivery is optional. Invoices can still be generated and downloaded without SendGrid configured.

### Step 4: Verify Setup

1. Start the development server:
```bash
npm run dev
```

2. Navigate to: http://localhost:3000/dashboard/invoices

3. You should see the invoice dashboard

---

## 📖 Usage Guide

### Creating an Invoice

1. **Navigate to Invoices**
   - Go to `/dashboard/invoices`
   - Click "New Invoice"

2. **Fill in Invoice Details**
   - Invoice number (auto-generated)
   - Issue date and due date
   - Currency (USDC by default)

3. **Add Customer Information**
   - Customer name (required)
   - Email address
   - Full billing address

4. **Add Line Items**
   - Description
   - Quantity
   - Unit price
   - Tax rate (optional)
   - Add multiple items as needed

5. **Add Notes and Terms**
   - Payment notes
   - Terms and conditions

6. **Generate PDF**
   - Click "Generate Invoice"
   - PDF downloads automatically
   - Invoice saved to database

### Sending an Invoice

1. **From Invoice List**
   - Click "Send" on any invoice

2. **Enter Email Details**
   - Recipient email(s) (comma-separated)
   - Subject line (pre-filled)
   - Custom message (pre-filled with crypto payment info)

3. **Send**
   - Invoice PDF attached to email
   - Crypto payment instructions included
   - Status updated to "sent"

### Viewing Invoices

- **Invoice List**: See all your invoices at `/dashboard/invoices`
- **View PDF**: Click "View" to open PDF in new tab
- **Status Badges**: pending, sent, paid, overdue
- **Quick Actions**: View and Send buttons

---

## 💰 Crypto Payment Flow

### How Customers Pay

1. **Receive Invoice Email** with PDF attachment
2. **Open PDF** to see payment options
3. **Choose Payment Method**:
   - Traditional (bank transfer, etc.)
   - **Crypto (USDC)** on Base or Polygon

4. **For Crypto Payments**:
   - Scan QR code with crypto wallet
   - Or copy wallet address
   - Send exact USDC amount
   - Payment appears on blockchain

### Invoice PDF Contents

Each invoice includes:

```
┌─────────────────────────────────────────┐
│  Your Company Info                       │
│  Invoice # INV-251116123045              │
│  Issue Date: Nov 16, 2025                │
│  Due Date: Dec 16, 2025                  │
├─────────────────────────────────────────┤
│  Bill To:                                │
│  Customer Name                           │
│  123 Main St, City, Country              │
├─────────────────────────────────────────┤
│  Line Items                              │
│  Description    Qty   Price   Total      │
│  Service A      1     $100    $100       │
├─────────────────────────────────────────┤
│  Subtotal:                      $100     │
│  Tax:                           $0       │
│  Total:                         $100     │
├─────────────────────────────────────────┤
│  💎 Crypto Payment Options               │
│                                          │
│  ⛓️ Base Network                         │
│  [QR CODE]  Wallet: 0x1234...5678        │
│             Amount: 100 USDC             │
│                                          │
│  ⛓️ Polygon Network                      │
│  [QR CODE]  Wallet: 0xabcd...ef01        │
│             Amount: 100 USDC             │
├─────────────────────────────────────────┤
│  Notes: Payment due within 30 days       │
│  Terms: Crypto payments accepted         │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### `invoices` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner of invoice |
| `invoice_number` | TEXT | Unique invoice number |
| `storage_path` | TEXT | PDF file path in storage |
| `pdf_url` | TEXT | Signed URL for PDF |
| `billing_info` | JSONB | Customer details |
| `total_amount` | NUMERIC | Total invoice amount |
| `currency` | TEXT | Currency (USDC) |
| `status` | TEXT | pending/sent/paid/cancelled/overdue |
| `issue_date` | TIMESTAMPTZ | Invoice issue date |
| `due_date` | TIMESTAMPTZ | Payment due date |
| `payment_chain` | TEXT | Chain used for payment |
| `payment_wallet_address` | TEXT | Wallet that received payment |
| `payment_transaction_hash` | TEXT | Blockchain transaction hash |
| `payment_received_at` | TIMESTAMPTZ | When payment received |

### `invoice_items` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `invoice_id` | UUID | Parent invoice |
| `description` | TEXT | Item description |
| `quantity` | NUMERIC | Quantity |
| `unit_price` | NUMERIC | Price per unit |
| `tax_rate` | NUMERIC | Tax percentage |
| `amount` | NUMERIC | Total amount |

### `invoice_emails` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `invoice_id` | UUID | Parent invoice |
| `to_email` | TEXT | Recipient email |
| `subject` | TEXT | Email subject |
| `body` | TEXT | Email body |
| `send_status` | TEXT | pending/sent/failed |
| `error_message` | TEXT | Error if failed |

---

## 🔧 API Endpoints

### Generate Invoice
```
POST /api/invoices/generate

Body:
{
  "invoiceNumber": "INV-251116123045",
  "issueDate": "2025-11-16",
  "dueDate": "2025-12-16",
  "currency": "USDC",
  "billTo": {
    "name": "John Doe",
    "email": "john@example.com",
    "addressLine1": "123 Main St",
    "city": "New York",
    "country": "USA"
  },
  "items": [
    {
      "description": "Web Design Service",
      "quantity": 1,
      "unitPrice": 1000,
      "taxRate": 0
    }
  ],
  "notes": "Payment due in 30 days",
  "terms": "Crypto payments accepted",
  "paymentChains": ["base", "polygon"]
}

Response: PDF file (application/pdf)
```

### List Invoices
```
GET /api/invoices/list

Response:
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-251116123045",
      "total_amount": 1000,
      "currency": "USDC",
      "status": "pending",
      "pdf_url": "https://..."
    }
  ]
}
```

### Send Invoice
```
POST /api/invoices/:id/send

Body:
{
  "to": ["customer@example.com"],
  "subject": "Invoice INV-251116123045",
  "message": "Please find attached..."
}

Response:
{
  "success": true,
  "message": "Invoice sent to 1 recipient(s)"
}
```

---

## 🎨 Customization

### Company Information

The invoice automatically uses your profile information:
- Company name (from `profiles.company_name`)
- Email (from `profiles.email`)
- Full name (fallback if no company name)

To customize, update your profile in the database or UI.

### Invoice Styling

To customize the PDF appearance, edit `/lib/invoice-service.ts`:

```typescript
// Change fonts
doc.font('Helvetica-Bold').fontSize(18);

// Change colors
doc.fillColor('#667eea'); // Custom brand color

// Change layout
const margin = 60; // Adjust margins
```

### Email Templates

To customize email styling, edit `/app/api/invoices/[id]/send/route.ts`:

```typescript
const mailOptions = {
  // Customize HTML template
  html: `Your custom HTML template here`,
  // ...
};
```

---

## 🔐 Security Notes

### PDF Storage
- PDFs stored in Supabase Storage bucket `invoices`
- Row-level security (RLS) enabled
- Users can only access their own invoices
- Signed URLs expire after 1 hour

### Email Security
- SendGrid API for email delivery
- API key stored in environment variables
- Rate limiting recommended (not included)

### Payment Verification
- Currently manual verification
- Future: Automatic blockchain monitoring
- Transaction hash can be manually added to invoice

---

## 🚀 Future Enhancements

### Short-term
- [ ] Automatic payment detection from blockchain
- [ ] Payment status webhook integration
- [ ] Recurring invoices
- [ ] Invoice templates
- [ ] Multi-currency support

### Long-term
- [ ] Partial payments tracking
- [ ] Invoice reminders
- [ ] Analytics dashboard
- [ ] API for third-party integrations
- [ ] Mobile app support

---

## 📊 Testing

### Manual Testing Checklist

- [ ] Generate invoice with all fields filled
- [ ] Generate invoice with minimal fields
- [ ] View generated PDF
- [ ] Verify QR codes work (scan with wallet)
- [ ] Send invoice via email (if configured)
- [ ] List all invoices
- [ ] Check invoice status updates
- [ ] Verify PDF storage and retrieval

### Test Invoice Data

```json
{
  "billTo": {
    "name": "Test Customer",
    "email": "test@example.com",
    "addressLine1": "123 Test St",
    "city": "Test City",
    "country": "Test Country"
  },
  "items": [
    {
      "description": "Test Service",
      "quantity": 1,
      "unitPrice": 100,
      "taxRate": 0
    }
  ]
}
```

---

## 🐛 Troubleshooting

### PDF Generation Fails

**Error**: "Failed to generate PDF"

**Solution**:
1. Check if `pdfkit` is installed: `npm list pdfkit`
2. Verify wallet addresses exist in database
3. Check console for detailed error logs

### QR Codes Not Showing

**Error**: QR codes missing from PDF

**Solution**:
1. Verify `qrcode` package installed
2. Check wallet addresses are valid (0x...)
3. Ensure buffer conversion working

### Email Not Sending

**Error**: "Email service not configured"

**Solution**:
1. Add `SENDGRID_API_KEY` to `.env`
2. Add `SENDGRID_FROM_EMAIL` to `.env`
3. Verify SendGrid account is active
4. Check API key permissions

### Storage Upload Fails

**Error**: "Failed to store invoice PDF"

**Solution**:
1. Verify Supabase storage bucket exists
2. Check storage policies allow user uploads
3. Ensure storage path is correct
4. Check Supabase quota limits

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review console logs for errors
3. Check Supabase dashboard for data
4. Verify environment variables are set

---

## 📝 Changelog

### v1.0.0 (2025-11-16)
- Initial release
- PDF generation with crypto payments
- Email delivery via SendGrid
- Invoice management dashboard
- Base and Polygon network support
- QR code generation

---

**Built with ❤️ for HeySalad Cash**
