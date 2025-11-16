-- Create terminals table
CREATE TABLE IF NOT EXISTS terminals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  terminal_id TEXT UNIQUE NOT NULL,
  merchant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  terminal_name TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create terminal_payments table
CREATE TABLE IF NOT EXISTS terminal_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id TEXT UNIQUE NOT NULL,
  terminal_id TEXT REFERENCES terminals(terminal_id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  currency TEXT DEFAULT 'USDC',
  status TEXT DEFAULT 'pending', -- pending, completed, failed, expired
  transaction_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- Create indexes
CREATE INDEX idx_terminals_merchant ON terminals(merchant_id);
CREATE INDEX idx_terminal_payments_terminal ON terminal_payments(terminal_id);
CREATE INDEX idx_terminal_payments_merchant ON terminal_payments(merchant_id);
CREATE INDEX idx_terminal_payments_wallet ON terminal_payments(wallet_address);
CREATE INDEX idx_terminal_payments_status ON terminal_payments(status);
CREATE INDEX idx_terminal_payments_created ON terminal_payments(created_at DESC);

-- Enable RLS
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for terminals
CREATE POLICY "Users can view their own terminals"
  ON terminals FOR SELECT
  USING (merchant_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own terminals"
  ON terminals FOR INSERT
  WITH CHECK (merchant_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own terminals"
  ON terminals FOR UPDATE
  USING (merchant_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for terminal_payments
CREATE POLICY "Users can view their terminal payments"
  ON terminal_payments FOR SELECT
  USING (merchant_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Service role can insert terminal payments"
  ON terminal_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update terminal payments"
  ON terminal_payments FOR UPDATE
  USING (true);

-- Function to auto-expire old payments
CREATE OR REPLACE FUNCTION expire_old_terminal_payments()
RETURNS void AS $$
BEGIN
  UPDATE terminal_payments
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run expiration (if pg_cron is available)
-- SELECT cron.schedule('expire-terminal-payments', '*/5 * * * *', 'SELECT expire_old_terminal_payments()');
