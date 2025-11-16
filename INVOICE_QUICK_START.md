# 📄 Invoice System - Quick Start

## 🚀 Setup (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Run database migration
npx supabase db push

# 3. (Optional) Configure email
echo "SENDGRID_API_KEY=your_key" >> .env
echo "SENDGRID_FROM_EMAIL=noreply@heysalad.io" >> .env

# 4. Start server
npm run dev
```

## 📍 Routes

| Page | URL | Description |
|------|-----|-------------|
| **Invoice List** | `/dashboard/invoices` | View all invoices |
| **Create Invoice** | `/dashboard/invoices/generate` | Generate new invoice |

## 🎯 Quick Actions

### Create an Invoice
1. Go to `/dashboard/invoices/generate`
2. Fill in customer details
3. Add line items
4. Click "Generate Invoice"
5. PDF downloads automatically

### Send an Invoice
1. Go to `/dashboard/invoices`
2. Click "Send" on any invoice
3. Enter recipient email(s)
4. Customize message (optional)
5. Click "Send Email"

### View PDF
1. Go to `/dashboard/invoices`
2. Click "View" on any invoice
3. PDF opens in new tab

## 💎 What's Included in PDFs

- ✅ Professional invoice layout
- ✅ Your company/profile info
- ✅ Customer billing details
- ✅ Line items with totals
- ✅ Tax calculations
- ✅ **Base Network wallet + QR code**
- ✅ **Polygon Network wallet + QR code**
- ✅ Payment amount in USDC
- ✅ Notes and terms

## 🔧 API Endpoints

```bash
# Generate invoice
POST /api/invoices/generate

# List invoices
GET /api/invoices/list

# Send invoice via email
POST /api/invoices/:id/send
```

## 📦 What Was Installed

- `pdfkit` - PDF generation
- `qrcode` - QR code creation
- `dayjs` - Date formatting
- `@sendgrid/mail` - Email delivery

## 💡 Tips

- **Invoice numbers** auto-generate (format: INV-YYMMDDHHmmss)
- **Due dates** default to 30 days from issue
- **Currency** is fixed to USDC
- **QR codes** automatically generated from your wallet addresses
- **Email** is optional - PDFs work without it

## ⚠️ Requirements

- User must have wallet addresses in database
- SendGrid API key needed for email (optional)
- Supabase storage bucket must exist

## 🐛 Troubleshooting

**No QR codes in PDF?**
→ Check wallet addresses exist in database

**Email not sending?**
→ Verify SENDGRID_API_KEY in .env

**PDF download fails?**
→ Check browser pop-up blocker

**Storage error?**
→ Verify invoices bucket exists in Supabase

## 📚 Full Docs

- See `INVOICE_FEATURE_GUIDE.md` for complete documentation
- See `INVOICE_IMPLEMENTATION_SUMMARY.md` for technical details

---

**That's it! You're ready to create crypto invoices.** 🎉
