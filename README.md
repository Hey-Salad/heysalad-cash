# HeySalad® Cash 🥗💸

![HeySalad Banner](public/heysalad-logo-black.png)

> **Multi-chain Web3 payment platform with passkey security and gasless transactions**

A production-ready cryptocurrency payment application leveraging Circle's Modular Wallets for secure, user-friendly transactions across Base, Polygon, and Arc networks.

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Circle](https://img.shields.io/badge/Circle-Modular%20Wallets-green.svg)](https://www.circle.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](#license)

## 🌐 **Live Demo**

**🚀 [heysalad.cash](https://heysalad.cash)** - Try it now!

---

## ✨ **Key Features**

### 🔐 **Passkey Authentication**
- Biometric security (Face ID, Touch ID, Windows Hello)
- No seed phrases or private keys to manage
- FIDO2/WebAuthn standard compliance
- 30-second onboarding flow

### ⛓️ **Multi-Chain Support**
- **Base Mainnet** - Coinbase's Layer 2
- **Polygon Mainnet** - Low-fee transactions
- **Arc Mainnet** - USDC as gas
- Single passkey controls all chains

### ⛽ **Gasless Transactions**
- Circle paymaster integration
- Users never pay gas fees
- Seamless USDC transfers
- Account abstraction benefits

### 💰 **Fiat On-Ramps**
- **Stripe** - Credit/debit card purchases
- **MoonPay** - Alternative payment methods
- Instant USDC top-ups
- Webhook-based confirmations

### 🤖 **AI Business Verification**
- OpenAI-powered KYB (Know Your Business)
- Automatic data enrichment
- Risk scoring and fraud detection
- Support for 130+ countries

---

## 📱 **Screenshots**

| Sign In | Onboarding | Dashboard | Send Payment |
|---------|------------|-----------|--------------|
| ![Sign In](docs/screenshots/signin.png) | ![Onboarding](docs/screenshots/onboarding.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![Send](docs/screenshots/send.png) |

| Multi-Chain | Transaction History | Settings | Business Verification |
|-------------|-------------------|----------|---------------------|
| ![Chains](docs/screenshots/chains.png) | ![History](docs/screenshots/history.png) | ![Settings](docs/screenshots/settings.png) | ![Business](docs/screenshots/business.png) |

---

## 🏗️ **Architecture**

### **Tech Stack**
- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Web3:** viem, Circle Modular Wallets SDK
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + Twilio (SMS)
- **Payments:** Circle, Stripe, MoonPay
- **Email:** SendGrid
- **Deployment:** Vercel (Production), Cloudflare (RPC)

### **Key Components**
```
heysalad-cash/
├── app/
│   ├── (auth-pages)/          # Authentication flows
│   │   ├── sign-in/           # Phone number entry
│   │   ├── code-confirmation/ # OTP verification
│   │   └── onboarding/        # Profile creation
│   ├── dashboard/             # Main application
│   │   ├── page.tsx           # Balance & transactions
│   │   ├── settings/          # User settings
│   │   └── setup-wallet/      # Passkey setup
│   └── api/                   # Backend endpoints
│       ├── wallet/            # Balance & transactions
│       ├── business/          # AI verification
│       └── webhooks/          # Payment processing
├── components/
│   ├── web3-provider.tsx      # Circle integration
│   ├── balance-tab.tsx        # Multi-chain balances
│   ├── transactions.tsx       # Transaction history
│   └── passkey-setup.tsx      # Wallet creation
├── hooks/
│   └── use-wallet-balances.ts # Real-time balance updates
└── supabase/
    └── migrations/            # Database schema
```

---

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ with npm
- Supabase account
- Circle API keys (production)
- Twilio account (SMS verification)
- Stripe account (optional, for fiat on-ramp)

### **Quick Start**

```bash
# Clone repository
git clone https://github.com/Hey-Salad/heysalad-cash.git
cd heysalad-cash

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment Setup below)

# Set up database
npx supabase link --project-ref your-project-id
npx supabase db push

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## ⚙️ **Environment Setup**

Create `.env` file with your credentials:

```env
# Deployment
NEXT_PUBLIC_VERCEL_URL=https://heysalad.cash

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Circle (Production Keys)
CIRCLE_API_KEY=LIVE_API_KEY:xxx:xxx
NEXT_PUBLIC_CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=LIVE_CLIENT_KEY:xxx:xxx

# RPC Endpoints (Mainnet)
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.arc.network

# Twilio (SMS Authentication)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Stripe (Optional - Fiat On-Ramp)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# MoonPay (Optional - Alternative On-Ramp)
NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY=pk_live_xxx
MOONPAY_SECRET_KEY=sk_live_xxx

# SendGrid (Email Notifications)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@heysalad.io

# OpenAI (Optional - Business Verification)
OPENAI_API_KEY=sk-xxx

# Blockchain Explorers (Optional - Higher Rate Limits)
POLYGONSCAN_API_KEY=your_key
BASESCAN_API_KEY=your_key
```

**⚠️ Security Notice:** Never commit real API keys to version control. Use environment variables in production.

---

## 🔧 **Circle Modular Wallets Integration**

### **Passkey Setup**
```typescript
import { toWebAuthnCredential, toCircleSmartAccount } from '@circle-fin/modular-wallets-core';

// Create passkey credential
const credential = await toWebAuthnCredential({
  transport: passkeyTransport,
  mode: WebAuthnMode.Register,
  username: userEmail,
});

// Create smart account
const smartAccount = await toCircleSmartAccount({
  client: publicClient,
  owner: webAuthnAccount,
});
```

### **Gasless Transactions**
```typescript
// Send USDC with paymaster
const userOpHash = await bundlerClient.sendUserOperation({
  calls: [
    encodeTransfer(
      recipientAddress,
      usdcTokenAddress,
      amount
    )
  ],
  paymaster: true, // Circle pays gas
});
```

### **Multi-Chain Wallets**
```typescript
// Same passkey, different chains
const chains = ['polygon', 'base', 'arc'];

for (const chain of chains) {
  const smartAccount = await toCircleSmartAccount({
    client: publicClient,
    owner: webAuthnAccount,
  });
  
  // Each chain gets its own wallet address
  console.log(`${chain}: ${smartAccount.address}`);
}
```

---

## 📊 **Features Deep Dive**

### **Real-Time Balances**
- Direct blockchain queries via viem
- Supabase real-time subscriptions
- Hybrid caching for speed
- Works with any wallet address

### **Transaction History**
- Basescan & Polygonscan integration
- Multi-chain unified view
- Search and filter capabilities
- Real-time updates

### **Business Verification**
- AI-powered data enrichment
- Official registry cross-reference
- Risk scoring (0-100)
- Support for US, UK, Estonia, global

### **Payment Methods**
- QR code scanning
- Address book
- Username-based payments
- Manual address entry

---

## 🧪 **Testing**

### **Local Development**
```bash
# Start dev server
npm run dev

# Run type checking
npm run type-check

# Build for production
npm run build
```

### **Test Flows**

1. **Sign Up**
   - Enter phone number
   - Verify OTP
   - Create profile
   - Set up passkey
   - Wallets created automatically

2. **Send Payment**
   - Click "Send"
   - Enter amount
   - Scan QR or enter address
   - Confirm with biometric
   - Transaction sent (gasless)

3. **Receive Payment**
   - Share QR code
   - Or share username
   - Receive notification
   - Balance updates instantly

---

## 🚧 **Current Status**

### **Production Ready** ✅
- Live on mainnet (Base, Polygon, Arc)
- Real USDC transactions
- Passkey authentication working
- Fiat on-ramps integrated
- Multi-chain support active

### **Known Limitations**
- Transaction history limited to USDC transfers
- No NFT support yet
- Single token (USDC) only
- Arc chain: balance display only (no transactions yet)

### **Roadmap**
- [ ] Multi-token support
- [ ] NFT gallery and transfers
- [ ] DEX integration (token swaps)
- [ ] Recurring payments
- [ ] Hardware payment terminal (ESP32 + NFC)
- [ ] Mobile app (React Native)
- [ ] Social recovery
- [ ] Multi-sig wallets

---

## 🤝 **Contributing**

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Maintain security standards
- Test on multiple chains

---

## 📚 **Documentation**

### **Guides**
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Passkey Implementation](PASSKEY_IMPLEMENTATION_GUIDE.md)
- [Multi-Chain Setup](MULTI_CHAIN_SETUP.md)
- [Business Verification](BUSINESS_VERIFICATION_GUIDE.md)
- [Cloudflare Web3 Setup](CLOUDFLARE_WEB3_SETUP.md)
- [Stripe Integration](STRIPE_SETUP.md)
- [React Native Port](REACT_NATIVE_PORT_GUIDE.md)

### **API Documentation**
- [Circle Modular Wallets](https://developers.circle.com/w3s/docs)
- [Supabase](https://supabase.com/docs)
- [viem](https://viem.sh/)
- [Next.js](https://nextjs.org/docs)

---

## 🏆 **Hackathon Submission**

This project was built for the Circle Modular Wallets hackathon, demonstrating:
- Complete passkey wallet implementation
- Multi-chain architecture
- Gasless transaction flow
- Real-world payment use cases
- AI-powered business features
- Hardware terminal innovation

See [HACKATHON_SUBMISSION.md](HACKATHON_SUBMISSION.md) for full details.

---

## 🔒 **Security**

### **Best Practices**
- ✅ Passkey authentication (FIDO2/WebAuthn)
- ✅ No private keys stored
- ✅ Smart contract wallets
- ✅ Environment variable protection
- ✅ HTTPS everywhere
- ✅ Rate limiting on APIs
- ✅ Input validation and sanitization

### **Audits**
- Internal security review completed
- Third-party audit: Planned
- Bug bounty program: Coming soon

### **Reporting Issues**
Found a security vulnerability? Email: security@heysalad.io

---

## ⚖️ **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

**HeySalad®** (UK Trademark Registration No. **UK00004063403**) is a registered trademark of **SALADHR TECHNOLOGY LTD**.

---

## 🙏 **Acknowledgments**

- **Circle** for the amazing Modular Wallets SDK
- **Supabase** for backend infrastructure
- **Vercel** for seamless deployment
- **Coinbase** for Base network
- **Polygon** for low-fee transactions
- **Arc** for USDC-as-gas innovation
- **Open Source Community** for countless libraries

---

## 📞 **Contact & Support**

- **Website:** [heysalad.cash](https://heysalad.cash)
- **Email:** [peter@heysalad.io](mailto:peter@heysalad.io)
- **Issues:** [GitHub Issues](https://github.com/Hey-Salad/heysalad-cash/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Hey-Salad/heysalad-cash/discussions)
- **Twitter:** [@HeySaladCash](https://twitter.com/HeySaladCash)

---

## ⚠️ **Disclaimer**

This software is provided "as is" without warranties. While we use production mainnet and real USDC, users should:
- Start with small amounts
- Understand blockchain transactions are irreversible
- Keep passkey devices secure
- Never share authentication credentials

**Not financial advice.** **Use at your own risk.**

---

<div align="center">

**Built with ❤️ using Circle Modular Wallets**

*Making Web3 payments as easy as Venmo*

[⭐ Star this repo](https://github.com/Hey-Salad/heysalad-cash) • [🐛 Report Issues](https://github.com/Hey-Salad/heysalad-cash/issues) • [💬 Discussions](https://github.com/Hey-Salad/heysalad-cash/discussions) • [🚀 Live Demo](https://heysalad.cash)

</div>
