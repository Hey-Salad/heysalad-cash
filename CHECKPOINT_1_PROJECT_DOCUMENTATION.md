# Checkpoint 1: Project & Team Creation

**Deadline:** Saturday, November 15, 2025 at 12:00 PM (Europe/London)

---

## 📋 Project Information

### Project Name
**HeySalad Cash**

### Team Members
- **Peter Machona** - Team Leader

---

## 🎯 Project Description

HeySalad Cash is a modern payment wallet solution designed specifically for restaurants, cafes, and food service businesses. The platform enables seamless, gasless cryptocurrency transactions with passkey security and instant top-ups, making it easy for businesses to accept digital payments without the complexity of traditional blockchain interactions.

### Key Value Proposition
- **Restaurant-Focused**: Purpose-built payment solution for food service businesses
- **Gasless Transactions**: Customers can send and receive payments without worrying about gas fees
- **Passkey Security**: Biometric authentication (Face ID, Touch ID, Windows Hello) for secure wallet access
- **Instant Top-ups**: Integration with Stripe and MoonPay for easy fiat-to-crypto conversion
- **Phone-Based Authentication**: Simple onboarding using phone number verification via Twilio
- **Smart Contract Wallets**: Each user gets a Circle smart account with advanced features
- **Business-Ready**: Designed for high-volume transaction environments like restaurants

---

## 🏗️ Technical Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 (React 18.2.0)
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **State Management**: React Context API
- **Authentication**: Supabase Auth with Twilio Verify

#### Backend
- **Runtime**: Node.js with Next.js API routes
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase with Row Level Security (RLS)
- **Webhooks**: Stripe, MoonPay, and Circle webhook handlers

#### Blockchain & Web3
- **Wallet Infrastructure**: Circle Modular Wallets
- **Smart Accounts**: Circle Smart Contract Platform
- **Passkey Integration**: WebAuthn with Circle SDK
- **Blockchain Libraries**: Viem, Web3.js, Ethers.js
- **Networks**: Polygon, Base (configurable)

#### Payment Integrations
- **Fiat On-Ramp**: Stripe, MoonPay
- **Cryptocurrency**: USDC (primary stablecoin)
- **Payment Processing**: Stripe for card payments

---

## ✨ Core Features

### 1. User Authentication & Onboarding
- Phone number verification using Twilio
- Passkey creation with biometric authentication
- Automatic Circle smart account creation
- Secure credential storage with encryption

### 2. Wallet Management
- View wallet balance (USDC)
- Display wallet address with QR code
- Transaction history
- Real-time balance updates

### 3. Payment Operations
- **Send Money**: P2P transfers to other users or wallet addresses (perfect for tipping staff)
- **Receive Money**: Generate payment requests with QR codes (table-side payments)
- **Request Money**: Create payment requests with custom amounts (bill splitting)
- **Gasless Transactions**: All transactions sponsored (no gas fees for customers or businesses)
- **QR Code Payments**: Quick scan-to-pay for in-restaurant transactions

### 4. Top-Up Options
- **Stripe Integration**: Credit/debit card purchases
- **MoonPay Integration**: Alternative fiat on-ramp
- Multiple payment methods supported
- Instant balance updates via webhooks

### 5. Security Features
- Passkey-based authentication (WebAuthn)
- Biometric verification (Face ID, Touch ID, fingerprint)
- Row Level Security (RLS) in database
- Secure webhook signature verification
- Environment variable protection

### 6. User Dashboard
- Balance overview
- Recent transactions
- Quick actions (Send, Receive, Top-up)
- Settings management
- Passkey management

---

## 🗄️ Database Schema

### Core Tables

#### `profiles`
- User profile information
- Phone number (unique identifier)
- Wallet address
- Created/updated timestamps

#### `passkey_credentials`
- WebAuthn credential storage
- Credential ID and public key
- User association
- Authenticator metadata

#### `transactions`
- Transaction history
- Sender/receiver information
- Amount and currency
- Status tracking
- Timestamps

#### `payment_requests`
- Pending payment requests
- Amount and description
- Requester/payer information
- Status (pending, completed, cancelled)

---

## 🔐 Security Implementation

### Authentication Flow
1. User enters phone number
2. Twilio sends OTP code
3. User verifies OTP
4. Session created in Supabase
5. Passkey created for future logins

### Passkey Security
- WebAuthn standard compliance
- Biometric authentication required
- Credentials stored securely in database
- Domain-bound (heysalad.cash)
- Apple App Site Association configured

### API Security
- Environment variables for sensitive keys
- Webhook signature verification (Stripe, Circle)
- Row Level Security (RLS) policies
- HTTPS-only in production
- CORS configuration

---

## 🚀 Deployment & Infrastructure

### Hosting
- **Platform**: Vercel (recommended)
- **Database**: Supabase (managed PostgreSQL)
- **Domain**: heysalad.cash

### Environment Configuration
- Production environment variables
- Webhook endpoints configured
- Circle API keys and client configuration
- Stripe and MoonPay API keys
- Supabase connection strings

### CI/CD
- Automatic deployments via Vercel
- Environment-specific configurations
- Database migrations via Supabase CLI

---

## 📱 User Experience

### Onboarding Flow
1. Customer/staff member visits application
2. Enters phone number
3. Receives and enters OTP
4. Creates passkey (biometric)
5. Wallet automatically created
6. Redirected to dashboard
7. Ready to make or receive payments at restaurant

### Transaction Flow (Restaurant Use Case)
1. Customer finishes meal and requests to pay
2. Staff generates payment request with bill amount
3. Customer scans QR code or enters amount
4. Customer confirms with passkey (biometric)
5. Transaction processed (gasless)
6. Confirmation displayed to both parties
7. Balance updated in real-time
8. Receipt generated automatically

### Top-Up Flow
1. User clicks "Top Up"
2. Selects payment method (Stripe/MoonPay)
3. Enters amount
4. Completes payment
5. Webhook processes transaction
6. Balance updated automatically

---

## 🎨 Design & UI

### Design System
- Modern, clean interface
- Dark/light mode support
- Responsive design (mobile-first)
- Accessible components (WCAG compliant)
- Consistent color scheme and typography

### Key UI Components
- Dashboard with balance cards
- Transaction list with status indicators
- QR code generation for payments
- Modal dialogs for actions
- Toast notifications for feedback
- Loading states and error handling

---

## 📊 Project Status

### Completed Features ✅
- User authentication (phone + passkey)
- Wallet creation and management
- Send/receive transactions
- Top-up integrations (Stripe, MoonPay)
- Transaction history
- Settings page
- Webhook handlers
- Database schema and migrations
- Security implementation

### In Progress 🚧
- Passkey recovery flow
- Multiple passkey support
- Enhanced error handling
- Transaction filtering and search

### Planned Features 📋
- Passkey-only login (without phone)
- Multi-device passkey support
- Transaction categories (food, drinks, tips)
- Spending analytics for businesses
- Contact management (regular customers)
- Recurring payments (subscriptions)
- Split bill functionality
- Tip distribution for staff
- Business dashboard with sales reports
- Integration with restaurant POS systems
- Loyalty rewards program
- Multi-location support for restaurant chains

---

## 🧪 Testing & Quality Assurance

### Testing Approach
- Manual testing on multiple devices
- Webhook testing with ngrok
- Cross-browser compatibility
- Mobile responsiveness testing
- Security audit of authentication flow

### Tested Platforms
- iOS (Safari, Chrome)
- Android (Chrome, Firefox)
- macOS (Safari, Chrome, Firefox)
- Windows (Chrome, Edge)

---

## 📚 Documentation

### Available Documentation
- `README.md` - Setup and installation guide
- `PASSKEY_IMPLEMENTATION_GUIDE.md` - Passkey integration details
- `STRIPE_SETUP.md` - Stripe configuration guide
- `DEPLOYMENT_CHECKLIST.md` - Production deployment steps
- `CIRCLE_PASSKEY_CHECKLIST.md` - Circle integration checklist
- `SECURITY_CHECKLIST.md` - Security best practices

---

## 🎯 Project Goals & Vision

### Short-term Goals
- Complete passkey recovery implementation
- Enhance user onboarding experience for restaurant staff
- Improve error handling and user feedback
- Add transaction filtering and reporting
- Implement QR code payment system for in-restaurant use

### Long-term Vision
- Become the leading payment wallet for restaurants and food service businesses
- Support multiple cryptocurrencies and stablecoins
- International expansion to major food markets
- Business account features with multi-user access
- POS system integrations
- API for third-party restaurant management systems
- Loyalty and rewards programs for restaurants
- Split bill functionality for group dining

---

## 🤝 Team Structure

### Peter Machona - Team Leader
**Responsibilities:**
- Full-stack development
- Architecture and technical decisions
- Integration with third-party services
- Security implementation
- Database design
- Deployment and DevOps
- Documentation

**Skills:**
- Next.js / React
- TypeScript
- PostgreSQL / Supabase
- Web3 / Blockchain
- API Integration
- UI/UX Design

---

## 📞 Contact & Links

### Project Links
- **Production URL**: https://heysalad.cash
- **Repository**: [Private/To be shared]
- **Documentation**: Available in project repository

### External Services
- **Circle Console**: https://console.circle.com
- **Supabase Dashboard**: https://supabase.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Twilio Console**: https://console.twilio.com

---

## 🍽️ Restaurant Use Cases

### For Customers
- **Quick Payments**: Scan QR code at table to pay bill instantly
- **Split Bills**: Easy bill splitting with friends
- **Tip Staff**: Direct tips to servers using their wallet address
- **Loyalty Rewards**: Earn rewards for frequent visits
- **No Cash Needed**: Fully digital payment experience

### For Restaurant Staff
- **Accept Payments**: Generate payment requests for customer bills
- **Receive Tips**: Direct tip payments to personal wallet
- **Track Earnings**: View transaction history and tip totals
- **Fast Checkout**: Reduce payment processing time
- **Secure**: Biometric authentication for all transactions

### For Restaurant Owners
- **Lower Fees**: Reduced payment processing costs vs traditional cards
- **Instant Settlement**: Immediate access to funds
- **Transaction Reports**: Real-time sales analytics
- **Multi-Location**: Manage payments across multiple locations
- **Staff Management**: Track staff tips and payments
- **Integration Ready**: API for POS system integration

---

## 📝 Notes

This project demonstrates the integration of modern Web3 technologies with traditional payment systems to create a user-friendly cryptocurrency payment platform specifically designed for the restaurant industry. The focus is on removing barriers to entry (gas fees, complex wallet management) while maintaining security through passkey authentication.

The application is production-ready with comprehensive documentation, security measures, and scalable architecture tailored for high-volume restaurant environments.

---

**Document Version**: 1.0  
**Last Updated**: November 15, 2025  
**Prepared by**: Peter Machona
