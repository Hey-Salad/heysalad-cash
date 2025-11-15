import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

if (!process.env.CIRCLE_API_KEY) {
  throw new Error('CIRCLE_API_KEY is required');
}

if (!process.env.CIRCLE_ENTITY_SECRET) {
  throw new Error('CIRCLE_ENTITY_SECRET is required');
}

export const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});
