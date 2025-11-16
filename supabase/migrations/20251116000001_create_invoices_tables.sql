-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  pdf_url TEXT,
  billing_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount NUMERIC(20, 6),
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'sent', 'cancelled', 'overdue')),
  issue_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  terms TEXT,
  -- Crypto payment info
  payment_chain TEXT CHECK (payment_chain IN ('base', 'polygon', 'arc')),
  payment_wallet_address TEXT,
  payment_transaction_hash TEXT,
  payment_received_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

-- Create invoice_items table for line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(20, 6) NOT NULL,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  amount NUMERIC(20, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice_emails table for tracking sent emails
CREATE TABLE IF NOT EXISTS invoice_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  send_status TEXT DEFAULT 'pending' CHECK (send_status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice_clicks table for tracking PDF views
CREATE TABLE IF NOT EXISTS invoice_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  recipient TEXT,
  source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'email', 'ui')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_hash ON invoices(payment_transaction_hash) WHERE payment_transaction_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_invoice_id ON invoice_emails(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_clicks_invoice_id ON invoice_clicks(invoice_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoice_items
CREATE POLICY "Users can view items of their own invoices"
  ON invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can create items for their own invoices"
  ON invoice_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items of their own invoices"
  ON invoice_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items of their own invoices"
  ON invoice_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));

-- RLS Policies for invoice_emails
CREATE POLICY "Users can view emails of their own invoices"
  ON invoice_emails FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_emails.invoice_id AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can create emails for their own invoices"
  ON invoice_emails FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_emails.invoice_id AND invoices.user_id = auth.uid()
  ));

-- RLS Policies for invoice_clicks (public can insert for tracking)
CREATE POLICY "Anyone can view clicks"
  ON invoice_clicks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create clicks for tracking"
  ON invoice_clicks FOR INSERT
  WITH CHECK (true);

-- Enable realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;

-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoices bucket
CREATE POLICY "Users can upload their own invoice PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own invoice PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own invoice PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
