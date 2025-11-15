/**
 * Script to help register entity secret with Circle
 * 
 * Follow these steps:
 * 1. Go to https://console.circle.com/wallets/dev-controlled/configurator
 * 2. Click "Register Entity Secret"
 * 3. Generate a new entity secret or use an existing one
 * 4. Copy the entity secret ciphertext
 * 5. Update your .env with CIRCLE_ENTITY_SECRET
 */

const crypto = require('crypto');

// Generate a random 32-byte entity secret
function generateEntitySecret() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('='.repeat(60));
console.log('Circle Entity Secret Registration Helper');
console.log('='.repeat(60));
console.log('');
console.log('IMPORTANT: For Modular Wallets (Passkeys), you do NOT need');
console.log('to register an entity secret. Entity secrets are only for');
console.log('Developer-Controlled Wallets.');
console.log('');
console.log('For your Modular Wallet setup with passkeys:');
console.log('');
console.log('1. You only need the CLIENT KEY (not entity secret)');
console.log('2. The CLIENT KEY should be in 3-part format:');
console.log('   TEST_CLIENT_KEY:xxx:xxx');
console.log('');
console.log('3. In your .env, you should have:');
console.log('   NEXT_PUBLIC_CIRCLE_CLIENT_KEY=TEST_CLIENT_KEY:xxx:xxx');
console.log('   NEXT_PUBLIC_CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl');
console.log('');
console.log('4. For the API KEY (server-side operations):');
console.log('   CIRCLE_API_KEY=TEST_API_KEY:xxx:xxx');
console.log('');
console.log('='.repeat(60));
console.log('');
console.log('If you need entity secret for developer-controlled wallets:');
console.log('Generated Entity Secret:', generateEntitySecret());
console.log('');
console.log('Register it at:');
console.log('https://console.circle.com/wallets/dev-controlled/configurator');
console.log('');
