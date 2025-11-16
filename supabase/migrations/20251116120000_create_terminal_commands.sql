-- Create terminal_commands table for reverse polling
CREATE TABLE IF NOT EXISTS terminal_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  terminal_id TEXT NOT NULL,
  command_type TEXT NOT NULL, -- 'display_qr', 'return_idle', 'get_status'
  command_data JSONB,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 minute')
);

-- Create indexes
CREATE INDEX idx_terminal_commands_terminal ON terminal_commands(terminal_id);
CREATE INDEX idx_terminal_commands_status ON terminal_commands(status);
CREATE INDEX idx_terminal_commands_created ON terminal_commands(created_at DESC);

-- Enable RLS
ALTER TABLE terminal_commands ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow service role and authenticated users
CREATE POLICY "Service role can manage commands"
  ON terminal_commands FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-expire old commands
CREATE OR REPLACE FUNCTION expire_old_terminal_commands()
RETURNS void AS $$
BEGIN
  UPDATE terminal_commands
  SET status = 'expired'
  WHERE status IN ('pending', 'processing')
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add last_seen column to terminals table
ALTER TABLE terminals ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;
ALTER TABLE terminals ADD COLUMN IF NOT EXISTS device_info JSONB;
