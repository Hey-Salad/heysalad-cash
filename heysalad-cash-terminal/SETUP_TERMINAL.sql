-- HeySalad Cash Terminal Setup
-- Run these queries in Supabase SQL Editor

-- Step 1: Find your profile ID
-- Copy the ID from the result
SELECT id, name, username 
FROM profiles 
WHERE auth_user_id = auth.uid();

-- Step 2: Register your terminal
-- Replace 'YOUR_PROFILE_ID' with the ID from Step 1
INSERT INTO terminals (
  terminal_id, 
  merchant_id, 
  terminal_name, 
  location,
  status
) VALUES (
  'TERM_001',                    -- Terminal ID (must match code)
  'YOUR_PROFILE_ID',             -- Replace with your profile ID
  'Main Counter',                -- Terminal name
  'Store Location',              -- Location description
  'active'                       -- Status
)
RETURNING *;

-- Step 3: Verify terminal was created
SELECT * FROM terminals WHERE terminal_id = 'TERM_001';

-- Step 4: Check your wallet address (for QR code)
SELECT wallet_address, blockchain 
FROM wallets 
WHERE profile_id = 'YOUR_PROFILE_ID';

-- Optional: Create additional terminals
INSERT INTO terminals (terminal_id, merchant_id, terminal_name, location)
VALUES 
  ('TERM_002', 'YOUR_PROFILE_ID', 'Side Counter', 'Store Location'),
  ('TERM_003', 'YOUR_PROFILE_ID', 'Mobile Terminal', 'Events');

-- View all your terminals
SELECT 
  t.terminal_id,
  t.terminal_name,
  t.location,
  t.status,
  t.created_at,
  p.name as merchant_name
FROM terminals t
JOIN profiles p ON t.merchant_id = p.id
WHERE t.merchant_id = 'YOUR_PROFILE_ID';

-- View terminal payments (after testing)
SELECT 
  payment_id,
  terminal_id,
  amount,
  currency,
  status,
  created_at,
  completed_at
FROM terminal_payments
WHERE merchant_id = 'YOUR_PROFILE_ID'
ORDER BY created_at DESC
LIMIT 10;
