# 🥗 HeySalad - Multi-Chain Web3 Payment Platform

## Project Overview

**HeySalad** is a comprehensive Web3 payment platform that makes cryptocurrency payments as simple as traditional payment apps, while leveraging Circle's Modular Wallets for secure, gasless transactions across multiple blockchains.

**Live Demo**: https://heysalad.cash  
**GitHub (Web App)**: https://github.com/Hey-Salad/heysalad-cash  
**GitHub (Mobile App)**: /Users/chilumbam/heysalad-wallet

---

## 🎯 Challenge Incorporation

### Circle Modular Wallets Integration

We've built a complete payment ecosystem using Circle's Modular Wallets SDK, incorporating:

1. **Passkey Authentication**
   - Biometric authentication (Face ID, Touch ID, Windows Hello)
   - No seed phrases or private keys to manage
   - Secure, user-friendly onboarding

2. **Multi-Chain Smart Accounts**
   - Base Mainnet
   - Polygon Mainnet
   - Arc Mainnet
   - Single passkey controls wallets across all chains

3. **Gasless Transactions**
   - Circle's paymaster integration
   - Users never pay gas fees
   - Seamless USDC transfers

4. **Account Abstraction**
   - Smart contract wallets
   - Enhanced security features
   - Future-proof for advanced features (social recovery, spending limits, etc.)

---

## 🏗️ What We Built

### 1. **Web Application** (heysalad-cash)

A full-featured Web3 payment platform with:

#### Core Features
- **Phone-based Authentication**: Twilio integration for SMS verification
- **Passkey Wallet Creation**: Circle Modular Wallets with biometric auth
- **Multi-Chain Support**: Unified interface for Base, Polygon, and Arc
- **Real-time Balances**: Direct blockchain queries via viem
- **Transaction History**: Blockchain explorer integration (Basescan, Polygonscan)
- **Send/Receive USDC**: QR code scanning, address book
- **Fiat On-Ramps**: Stripe and MoonPay integration

#### Advanced Features
- **AI-Powered Business Verification**: OpenAI integration for KYB
- **Real-time Updates**: Supabase subscriptions for instant balance updates
- **Transaction Receipts**: Email notifications via SendGrid
- **Multi-wallet Management**: Separate wallets per chain with unified UX

#### Technical Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Web3**: viem, Circle Modular Wallets SDK
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Twilio
- **Payments**: Circle, Stripe, MoonPay
- **Email**: SendGrid
- **Deployment**: Vercel

### 2. **Mobile Application** (heysalad-wallet)

React Native mobile app with:
- Native iOS and Android support
- Biometric authentication
- Push notifications
- Camera for QR code scanning
- NFC support (planned for payment terminal)

### 3. **Hardware Payment Terminal** (In Development)

ESP32-based payment terminal with:
- **NFC Card Reader**: Tap-to-pay functionality
- **Display**: Transaction confirmation screen
- **Connectivity**: WiFi/Bluetooth for API communication
- **Security**: Secure element for key storage
- **Use Cases**: 
  - Point-of-sale payments
  - Vending machines
  - Event ticketing
  - Access control

---

## 🔧 Technical Implementation

### Circle Modular Wallets Integration

#### 1. Passkey Setup
```typescript
// Create passkey credential
const credential = await toWebAuthnCredential({
  transport: passkeyTransport,
  mode: WebAuthnMode.Register,
  username: userEmail,
});

// Create WebAuthn account
const webAuthnAccount = toWebAuthnAccount({
  credential: credential
});

// Create Circle smart account
const circleAccount = await toCircleSmartAccount({
  client: publicClient,
  owner: webAuthnAccount,
});
```

#### 2. Multi-Chain Wallet Creation
```typescript
// Initialize wallets for each chain
const chains = ['polygon', 'base', 'arc'];

for (const chain of chains) {
  const publicClient = createPublicClient({
    chain: chainConfig[chain],
    transport: http(rpcUrl),
  });

  const smartAccount = await toCircleSmartAccount({
    client: publicClient,
    owner: webAuthnAccount,
  });

  // Store wallet address in database
  await saveWallet(smartAccount.address, chain);
}
```

#### 3. Gasless Transactions
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
  paymaster: true, // Circle paymaster pays gas
});

// Wait for confirmation
const { receipt } = await bundlerClient.waitForUserOperationReceipt({
  hash: userOpHash,
});
```

### Direct Blockchain Integration

#### Balance Queries
```typescript
// Read USDC balance directly from blockchain
const balance = await publicClient.readContract({
  address: USDC_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [walletAddress]
});
```

#### Transaction History
```typescript
// Query blockchain explorer for transactions
const response = await axios.get(
  `https://api.basescan.org/api`,
  {
    params: {
      module: 'account',
      action: 'tokentx',
      contractaddress: USDC_ADDRESS,
      address: walletAddress,
    }
  }
);
```

---

## 🎨 User Experience Flow

### 1. Onboarding (30 seconds)
1. Enter phone number
2. Verify OTP code
3. Create profile (name, username)
4. Set up passkey (biometric)
5. Wallets created automatically across all chains

### 2. Sending Money
1. Click "Send"
2. Enter amount or scan QR code
3. Confirm with biometric
4. Transaction sent (gasless)
5. Instant confirmation

### 3. Receiving Money
1. Share QR code or username
2. Receive notification
3. Balance updates in real-time

---

## 🚀 Innovation & Unique Features

### 1. **True Multi-Chain UX**
- Single passkey controls wallets on multiple chains
- Unified balance view
- Automatic chain selection based on recipient

### 2. **Zero Gas Fees**
- Users never see or pay gas fees
- Circle's paymaster handles all gas
- Makes crypto accessible to everyone

### 3. **AI-Powered Business Verification**
- OpenAI integration for KYB (Know Your Business)
- Automatic data enrichment from company registries
- Risk scoring and fraud detection
- Supports US, UK, Estonia, and 130+ countries

### 4. **Hybrid Balance System**
- Direct blockchain queries for accuracy
- Database caching for speed
- Real-time Supabase subscriptions
- Works with any wallet (not just Circle-managed)

### 5. **Hardware Payment Terminal**
- ESP32-based NFC terminal
- Tap-to-pay with physical cards
- Bridge between physical and digital payments
- Perfect for retail, events, vending

---

## 📊 Technical Achievements

### Performance
- **Balance Load Time**: < 1 second (direct blockchain queries)
- **Transaction Confirmation**: 2-5 seconds (depending on chain)
- **App Load Time**: < 2 seconds (optimized Next.js)

### Security
- ✅ Passkey authentication (FIDO2/WebAuthn)
- ✅ No private keys stored
- ✅ Smart contract wallets (account abstraction)
- ✅ Secure API endpoints
- ✅ Environment variable protection
- ✅ HTTPS everywhere

### Scalability
- ✅ Serverless architecture (Vercel)
- ✅ PostgreSQL database (Supabase)
- ✅ Real-time subscriptions
- ✅ CDN-optimized assets
- ✅ Multi-region deployment

---

## 🔮 Future Enhancements

### Short Term
1. **NFC Payment Cards**: Physical cards linked to wallets
2. **Recurring Payments**: Subscription support
3. **Multi-token Support**: Beyond USDC
4. **Social Recovery**: Trusted contacts for account recovery

### Medium Term
1. **ESP32 Payment Terminal**: Production-ready hardware
2. **Merchant Dashboard**: Business analytics
3. **Invoice System**: Request payments
4. **Multi-sig Wallets**: Team accounts

### Long Term
1. **DeFi Integration**: Yield farming, staking
2. **NFT Support**: Display and transfer NFTs
3. **Cross-chain Swaps**: Automatic token bridging
4. **White-label Solution**: Platform for other businesses

---

## 🛠️ Development Process

### Phase 1: Foundation (Week 1)
- Set up Next.js project
- Integrate Supabase
- Implement phone authentication
- Basic UI/UX

### Phase 2: Circle Integration (Week 2)
- Integrate Circle Modular Wallets SDK
- Implement passkey authentication
- Create multi-chain wallet system
- Test gasless transactions

### Phase 3: Blockchain Integration (Week 3)
- Direct blockchain queries for balances
- Transaction history from explorers
- Real-time updates
- Multi-wallet support

### Phase 4: Enhancements (Week 4)
- Fiat on-ramps (Stripe, MoonPay)
- AI business verification
- Email notifications
- Performance optimization

### Phase 5: Hardware (Ongoing)
- ESP32 terminal design
- NFC integration
- API communication
- Security implementation

---

## 📱 Mobile App Features

The React Native mobile app (`heysalad-wallet`) includes:

### Core Features
- Native biometric authentication
- Push notifications for transactions
- Camera for QR code scanning
- Contact integration
- Offline mode support

### Platform-Specific
- **iOS**: Face ID, Touch ID, Apple Pay integration
- **Android**: Fingerprint, Face unlock, Google Pay integration

### Planned
- NFC card reading/writing
- Bluetooth terminal pairing
- Widget support
- Apple Watch/Wear OS apps

---

## 🔌 Hardware Terminal Specifications

### ESP32 Payment Terminal

#### Hardware Components
- **Microcontroller**: ESP32-WROOM-32
- **NFC Reader**: PN532 module
- **Display**: 2.4" TFT LCD (320x240)
- **Connectivity**: WiFi 802.11 b/g/n
- **Power**: USB-C or battery
- **Security**: Secure element (ATECC608A)

#### Features
- Tap-to-pay with NFC cards
- QR code display for receiving
- Transaction confirmation screen
- Offline transaction queuing
- Encrypted communication

#### Use Cases
1. **Retail POS**: Replace traditional card terminals
2. **Vending Machines**: Cashless payments
3. **Events**: Ticket validation and payments
4. **Transportation**: Tap-to-ride systems
5. **Access Control**: Building entry with payment

#### Technical Flow
```
1. Customer taps NFC card
2. Terminal reads card ID
3. Sends payment request to API
4. API processes via Circle
5. Terminal shows confirmation
6. Receipt sent via email/SMS
```

---

## 🌟 Why HeySalad Stands Out

### 1. **Complete Ecosystem**
Not just a wallet - it's a full payment platform with web, mobile, and hardware components.

### 2. **Real-World Ready**
- Production deployment on mainnet
- Real USDC transactions
- Fiat on-ramps integrated
- Business verification system

### 3. **User-First Design**
- No crypto jargon
- Familiar payment app UX
- Biometric security
- Zero gas fees

### 4. **Technical Excellence**
- Direct blockchain integration
- Multi-chain architecture
- Real-time updates
- AI-powered features

### 5. **Innovation**
- Hardware payment terminal
- AI business verification
- Hybrid balance system
- Multi-chain passkey wallets

---

## 📈 Impact & Use Cases

### For Individuals
- Send money globally instantly
- No bank account needed
- Lower fees than traditional remittance
- Earn yield on savings (future)

### For Businesses
- Accept crypto payments easily
- Lower transaction fees
- Instant settlement
- Global customer base
- Business verification for trust

### For Developers
- Open API for integrations
- White-label solution (future)
- Hardware terminal SDK
- Webhook support

---

## 🎓 What We Learned

### Technical Learnings
1. **Account Abstraction**: Deep understanding of smart contract wallets
2. **Multi-Chain Architecture**: Challenges and solutions for cross-chain UX
3. **Passkey Implementation**: WebAuthn/FIDO2 integration
4. **Blockchain Queries**: Direct RPC vs API tradeoffs
5. **Real-time Systems**: Supabase subscriptions and WebSockets

### Product Learnings
1. **UX Simplification**: Hiding blockchain complexity
2. **Onboarding Flow**: Reducing friction to 30 seconds
3. **Trust Building**: Verification and security indicators
4. **Performance**: Balance between speed and accuracy

### Business Learnings
1. **Regulatory Compliance**: KYB/KYC requirements
2. **Payment Processing**: Fiat on-ramp integration
3. **Hardware Manufacturing**: Terminal production challenges
4. **Go-to-Market**: Target markets and use cases

---

## 🔗 Links & Resources

### Live Platforms
- **Web App**: https://heysalad.cash
- **API Docs**: https://heysalad.cash/api/docs (coming soon)

### Repositories
- **Web App**: https://github.com/Hey-Salad/heysalad-cash
- **Mobile App**: /Users/chilumbam/heysalad-wallet
- **Hardware Terminal**: (coming soon)

### Documentation
- Setup guides in repository
- API documentation
- Hardware schematics (coming soon)

### Demo Videos
- Onboarding flow
- Sending payment
- Receiving payment
- Multi-chain transactions
- Business verification
- Hardware terminal prototype

---

## 👥 Team & Contact

**Project Lead**: Peter Chilumba  
**Email**: peter@heysalad.io  
**Website**: https://heysalad.cash

---

## 🙏 Acknowledgments

- **Circle**: For the amazing Modular Wallets SDK
- **Supabase**: For the backend infrastructure
- **Vercel**: For seamless deployment
- **Community**: For feedback and support

---

## 📄 License

MIT License - See LICENSE.md for details

---

## 🎯 Conclusion

HeySalad demonstrates the full potential of Circle's Modular Wallets by creating a complete payment ecosystem that's:
- **Secure**: Passkey authentication and smart contract wallets
- **Simple**: 30-second onboarding, familiar UX
- **Scalable**: Multi-chain, real-time, production-ready
- **Innovative**: AI verification, hardware terminals, hybrid architecture

We've not just integrated Circle's SDK - we've built a comprehensive platform that shows how Web3 payments can be as easy as Venmo or Cash App, while maintaining the security and decentralization of blockchain technology.

**HeySalad is ready for real-world use today, with exciting hardware innovations coming soon.**

---

*Built with ❤️ using Circle Modular Wallets*
