# Cloudflare Web3 Gateway Setup Guide

## Why Use Cloudflare Web3 Gateways?

- **Free**: No cost for up to 15 gateways
- **Fast**: Cloudflare's global CDN network
- **Reliable**: Better uptime than public RPCs
- **No API keys needed**: Simple URL-based access
- **Rate limits**: Much higher than public RPCs

## Setup Steps

### 1. Access Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select your account
3. Navigate to **Web3** in the left sidebar

### 2. Create Ethereum Gateway (for Base)

1. Click **Create Gateway**
2. Select **Ethereum**
3. Choose **Mainnet**
4. Optional: Add a custom hostname (e.g., `eth.yourdomain.com`)
5. Click **Create**
6. Copy the gateway URL

### 3. Create Polygon Gateway

1. Click **Create Gateway** again
2. Select **Polygon**
3. Choose **Mainnet**
4. Optional: Add a custom hostname (e.g., `polygon.yourdomain.com`)
5. Click **Create**
6. Copy the gateway URL

### 4. Update Environment Variables

#### Local Development (.env.local)

```bash
# Cloudflare Web3 Gateways
NEXT_PUBLIC_BASE_RPC_URL=https://cloudflare-eth.com/v1/mainnet
NEXT_PUBLIC_POLYGON_RPC_URL=https://cloudflare-eth.com/v1/polygon-mainnet
```

Or if using custom hostnames:

```bash
NEXT_PUBLIC_BASE_RPC_URL=https://eth.yourdomain.com
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon.yourdomain.com
```

#### Production (Vercel)

1. Go to https://vercel.com/your-project/settings/environment-variables
2. Update these variables:
   - `NEXT_PUBLIC_BASE_RPC_URL`
   - `NEXT_PUBLIC_POLYGON_RPC_URL`
3. Select: Production, Preview, Development
4. Click **Save**
5. Redeploy your app

### 5. Test Your Gateways

You can test your gateway URLs with curl:

```bash
# Test Ethereum/Base gateway
curl -X POST https://your-gateway-url \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test Polygon gateway
curl -X POST https://your-polygon-gateway-url \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

You should get a response with the current block number.

## Benefits for Your App

### Current Setup (Public RPCs)
- ❌ Rate limited (often 1-5 requests/second)
- ❌ Slower response times
- ❌ Less reliable (frequent downtime)
- ❌ No analytics

### With Cloudflare Gateways
- ✅ Higher rate limits
- ✅ Faster response times (Cloudflare CDN)
- ✅ Better reliability
- ✅ Analytics dashboard
- ✅ DDoS protection
- ✅ Free for up to 15 gateways

## Supported Networks

Cloudflare Web3 Gateways support:
- Ethereum Mainnet (use for Base L2)
- Polygon Mainnet
- And many others

## Custom Hostnames (Optional)

If you want branded URLs like `eth.yourdomain.com`:

1. Your domain must be on Cloudflare
2. When creating a gateway, add a custom hostname
3. Cloudflare automatically creates the DNS records
4. SSL certificates are auto-provisioned

## Monitoring

View your gateway usage:
1. Go to Cloudflare Dashboard > Web3
2. Click on a gateway
3. View analytics:
   - Request count
   - Response times
   - Error rates
   - Geographic distribution

## Troubleshooting

### Gateway not working?
- Check the URL is correct
- Verify DNS records are set (if using custom hostname)
- Wait a few minutes for DNS propagation

### Rate limits?
- Cloudflare gateways have generous limits
- If you hit limits, consider upgrading or using multiple gateways

### Need more networks?
- You can create up to 15 gateways for free
- Mix and match different networks as needed

## Next Steps

After setting up:
1. Update your environment variables
2. Redeploy your app
3. Test balance fetching and transactions
4. Monitor usage in Cloudflare dashboard

Your app will now use Cloudflare's infrastructure for all blockchain queries!
