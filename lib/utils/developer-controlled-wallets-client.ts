import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

if (!process.env.CIRCLE_API_KEY) {
  throw new Error('CIRCLE_API_KEY is required');
}

// Entity secret is only needed for developer-controlled wallets
// For modular wallets (passkeys), this is not used
const entitySecret = process.env.CIRCLE_ENTITY_SECRET || 'placeholder';

export const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: entitySecret,
});
