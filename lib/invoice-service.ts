import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import QRCode from 'qrcode';

export interface InvoiceBillTo {
  name: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CryptoPaymentInfo {
  walletAddress: string;
  chain: 'base' | 'polygon' | 'arc';
  chainName: string;
  qrCodeDataUrl?: string;
}

export interface InvoiceRenderPayload {
  invoiceNumber: string;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  billTo: InvoiceBillTo;
  items: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  // Company info
  companyName: string;
  companyEmail?: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyWebsite?: string;
  // Crypto payment options
  cryptoPayments?: CryptoPaymentInfo[];
}

const formatCurrency = (value: number, currency: string) => {
  try {
    // For crypto, just show USDC
    if (currency.toUpperCase() === 'USDC') {
      return `${value.toFixed(2)} USDC`;
    }
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    const parts = formatter.formatToParts(value);
    return parts
      .map((part) => (part.type === 'currency' ? `${part.value}\u00A0` : part.value))
      .join('');
  } catch (error) {
    console.warn('Currency formatter failed', error);
    return `${value.toFixed(2)} ${currency}`;
  }
};

const buildAddressLines = (segments: Array<string | null | undefined>) =>
  segments.filter(Boolean).join('\n');

/**
 * Generate QR code as PNG buffer for wallet address
 */
const generateQRCode = async (address: string): Promise<Buffer> => {
  try {
    const dataUrl = await QRCode.toDataURL(address, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    // Convert data URL to buffer
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw error;
  }
};

/**
 * Build invoice PDF with crypto payment information
 */
export const buildInvoicePdf = async (payload: InvoiceRenderPayload): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 60 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', (error) => reject(error));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const currency = payload.currency;
      const margin = 60;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - margin * 2;

      // Header Section
      const headerLeftX = margin;
      const headerTop = doc.y;
      const metaWidth = 180;
      const metaX = margin + contentWidth - metaWidth;
      let headerLeftWidth = metaX - headerLeftX - 10;
      if (headerLeftWidth <= 0) {
        headerLeftWidth = Math.max(contentWidth - metaWidth - 10, contentWidth * 0.5);
      }

      // Company info (left side)
      doc.font('Helvetica-Bold').fontSize(18);
      doc.text(payload.companyName, headerLeftX, headerTop, { width: headerLeftWidth });

      doc.font('Helvetica').fontSize(10);
      if (payload.companyAddress) {
        doc.text(payload.companyAddress, { width: headerLeftWidth, lineGap: 2 });
      }
      if (payload.companyTaxId) {
        doc.text(`Tax ID: ${payload.companyTaxId}`, { width: headerLeftWidth });
      }
      if (payload.companyWebsite) {
        doc.text(payload.companyWebsite, { width: headerLeftWidth });
      }
      if (payload.companyEmail) {
        doc.text(payload.companyEmail, { width: headerLeftWidth });
      }

      const leftBottom = doc.y;

      // Invoice meta (right side)
      doc.font('Helvetica-Bold').fontSize(32);
      doc.text('Invoice', metaX, headerTop, { width: metaWidth, align: 'right' });

      doc.font('Helvetica').fontSize(10);
      doc.text(`Invoice #: ${payload.invoiceNumber}`, metaX, doc.y, { width: metaWidth, align: 'right' });
      doc.text(`Issue Date: ${dayjs(payload.issueDate).format('MMMM D, YYYY')}`, {
        width: metaWidth,
        align: 'right'
      });
      doc.text(`Due Date: ${dayjs(payload.dueDate).format('MMMM D, YYYY')}`, {
        width: metaWidth,
        align: 'right'
      });
      doc.text(`Currency: ${currency}`, { width: metaWidth, align: 'right' });

      const metaBottom = doc.y;
      const headerBottom = Math.max(leftBottom, metaBottom);
      doc.y = headerBottom + 20;

      // Bill To Section
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Bill To:', margin, doc.y);
      doc.font('Helvetica').fontSize(10);
      doc.text(payload.billTo.name, margin, doc.y);

      const clientAddress = buildAddressLines([
        payload.billTo.addressLine1,
        payload.billTo.addressLine2,
        [payload.billTo.city, payload.billTo.postalCode].filter(Boolean).join(', '),
        payload.billTo.country
      ]);
      if (clientAddress) {
        doc.text(clientAddress, { lineGap: 2 });
      }
      if (payload.billTo.email) {
        doc.text(payload.billTo.email);
      }

      doc.moveDown(2);

      // Line Items Table
      const tableTop = doc.y;
      const colDesc = margin;
      const colQty = margin + contentWidth * 0.4;
      const colPrice = margin + contentWidth * 0.55;
      const colTax = margin + contentWidth * 0.70;
      const colTotal = margin + contentWidth * 0.85;

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Description', colDesc, tableTop);
      doc.text('Qty', colQty, tableTop, { width: 60, align: 'right' });
      doc.text('Unit Price', colPrice, tableTop, { width: 80, align: 'right' });
      doc.text('Tax', colTax, tableTop, { width: 70, align: 'right' });
      doc.text('Total', colTotal, tableTop, { width: 80, align: 'right' });

      doc.moveTo(margin, doc.y + 5).lineTo(margin + contentWidth, doc.y + 5).stroke();
      doc.moveDown(0.5);

      // Items
      doc.font('Helvetica').fontSize(9);
      payload.items.forEach((item) => {
        const itemY = doc.y;
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100;
        const itemTotal = itemSubtotal + itemTax;

        doc.text(item.description, colDesc, itemY, { width: colQty - colDesc - 10 });
        doc.text(item.quantity.toString(), colQty, itemY, { width: 60, align: 'right' });
        doc.text(formatCurrency(item.unitPrice, currency), colPrice, itemY, { width: 80, align: 'right' });
        doc.text(
          item.taxRate ? `${item.taxRate}%` : '-',
          colTax,
          itemY,
          { width: 70, align: 'right' }
        );
        doc.text(formatCurrency(itemTotal, currency), colTotal, itemY, { width: 80, align: 'right' });

        doc.moveDown(1);
      });

      doc.moveDown(1);
      doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxTotal = payload.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100,
        0
      );
      const total = subtotal + taxTotal;

      const totalX = margin + contentWidth * 0.65;
      doc.font('Helvetica').fontSize(10);
      doc.text('Subtotal:', totalX, doc.y);
      doc.text(formatCurrency(subtotal, currency), colTotal, doc.y, { width: 80, align: 'right' });
      doc.moveDown(0.5);

      doc.text('Tax:', totalX, doc.y);
      doc.text(formatCurrency(taxTotal, currency), colTotal, doc.y, { width: 80, align: 'right' });
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', totalX, doc.y);
      doc.text(formatCurrency(total, currency), colTotal, doc.y, { width: 80, align: 'right' });

      doc.moveDown(2);

      // Crypto Payment Section
      if (payload.cryptoPayments && payload.cryptoPayments.length > 0) {
        doc.font('Helvetica-Bold').fontSize(12);
        doc.fillColor('#1a73e8');
        doc.text('💎 Crypto Payment Options', margin, doc.y);
        doc.fillColor('#000000');
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(9);
        doc.fillColor('#666666');
        doc.text('Scan QR code or send USDC to any of the wallet addresses below:', margin, doc.y, {
          width: contentWidth
        });
        doc.fillColor('#000000');
        doc.moveDown(1);

        for (const crypto of payload.cryptoPayments) {
          const cryptoY = doc.y;

          // Check if we need a new page
          if (cryptoY > doc.page.height - 200) {
            doc.addPage();
          }

          // Generate QR code
          let qrBuffer: Buffer | null = null;
          try {
            qrBuffer = await generateQRCode(crypto.walletAddress);
          } catch (error) {
            console.error('Failed to generate QR for', crypto.chain, error);
          }

          // Chain name with badge
          doc.font('Helvetica-Bold').fontSize(10);
          const chainColor = crypto.chain === 'base' ? '#0052FF' : crypto.chain === 'polygon' ? '#8247E5' : '#00C3FF';
          doc.fillColor(chainColor);
          doc.text(`⛓️ ${crypto.chainName}`, margin, cryptoY);
          doc.fillColor('#000000');

          // QR Code (left)
          if (qrBuffer) {
            try {
              doc.image(qrBuffer, margin, cryptoY + 20, { width: 80, height: 80 });
            } catch (error) {
              console.error('Failed to embed QR code:', error);
            }
          }

          // Wallet address (right of QR)
          doc.font('Helvetica').fontSize(8);
          doc.fillColor('#666666');
          doc.text('Wallet Address:', margin + 95, cryptoY + 20);
          doc.fillColor('#000000');
          doc.font('Courier').fontSize(7);
          doc.text(crypto.walletAddress, margin + 95, cryptoY + 35, {
            width: contentWidth - 100,
            lineBreak: true
          });

          doc.font('Helvetica').fontSize(8);
          doc.fillColor('#666666');
          doc.text(`Amount: ${formatCurrency(total, currency)}`, margin + 95, cryptoY + 55);
          doc.fillColor('#000000');

          doc.y = cryptoY + 110;
        }

        doc.moveDown(1);
      }

      // Notes Section
      if (payload.notes) {
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Notes:', margin, doc.y);
        doc.font('Helvetica').fontSize(9);
        doc.text(payload.notes, margin, doc.y, { width: contentWidth });
        doc.moveDown(1);
      }

      // Payment Terms
      if (payload.terms) {
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Payment Terms:', margin, doc.y);
        doc.font('Helvetica').fontSize(9);
        doc.text(payload.terms, margin, doc.y, { width: contentWidth });
        doc.moveDown(1);
      }

      // Footer
      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8);
      doc.fillColor('#999999');
      doc.text(
        'Generated by HeySalad® Cash - Web3 Payment Platform\nhttps://heysalad.cash',
        margin,
        doc.y,
        { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Calculate invoice totals
 */
export const calculateInvoiceTotals = (items: InvoiceLineItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100,
    0
  );
  return {
    subtotal,
    taxTotal,
    total: subtotal + taxTotal
  };
};
