# Business Verification & Data Enrichment Guide

## Overview

Add business verification to allow companies to sign up with their registered business information, automatically enriching their profile with official registry data.

## Supported Registries

### 1. United States
- **SEC EDGAR API** (Free)
- **OpenCorporates API** (Freemium)
- Data: Company name, EIN, address, officers, filing status

### 2. United Kingdom  
- **Companies House API** (Free)
- Data: Company name, number, address, directors, SIC codes, filing status

### 3. Estonia
- **e-Business Register via X-Road** (Free for registered users)
- Data: Company name, registry code, address, board members

### 4. Global
- **OpenCorporates API** (Covers 130+ jurisdictions)
- Freemium: 500 requests/month free

## Implementation Plan

### Phase 1: Database Schema

Add business profile table:

```sql
-- Add to your Supabase migrations
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Business identifiers
  business_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  country_code TEXT NOT NULL, -- US, GB, EE, etc.
  jurisdiction TEXT, -- State/region
  
  -- Enriched data
  legal_name TEXT,
  business_type TEXT, -- LLC, Corporation, Ltd, etc.
  registration_date DATE,
  status TEXT, -- Active, Dissolved, etc.
  
  -- Address
  registered_address JSONB,
  
  -- Officers/Directors
  officers JSONB, -- Array of officer data
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verification_source TEXT, -- 'companies_house', 'sec_edgar', etc.
  
  -- Metadata
  raw_data JSONB, -- Store full API response
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_business_profiles_registration ON business_profiles(registration_number, country_code);
CREATE INDEX idx_business_profiles_profile_id ON business_profiles(profile_id);
```

### Phase 2: API Integrations

#### UK Companies House API

```typescript
// app/api/business/verify-uk/route.ts
import { NextRequest, NextResponse } from "next/server";

const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

export async function POST(req: NextRequest) {
  const { companyNumber } = await req.json();
  
  // Fetch company data
  const response = await fetch(
    `https://api.company-information.service.gov.uk/company/${companyNumber}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`,
      },
    }
  );
  
  if (!response.ok) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }
  
  const data = await response.json();
  
  return NextResponse.json({
    businessName: data.company_name,
    registrationNumber: data.company_number,
    legalName: data.company_name,
    businessType: data.type,
    registrationDate: data.date_of_creation,
    status: data.company_status,
    registeredAddress: data.registered_office_address,
    verified: true,
    verificationSource: 'companies_house',
    rawData: data,
  });
}
```

#### US SEC EDGAR API

```typescript
// app/api/business/verify-us/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { cik } = await req.json(); // Central Index Key
  
  // Fetch company data from SEC EDGAR
  const response = await fetch(
    `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`,
    {
      headers: {
        'User-Agent': 'YourApp contact@yourdomain.com', // Required by SEC
      },
    }
  );
  
  if (!response.ok) {
    return NextResponse.json(
      { error: "Company not found in SEC database" },
      { status: 404 }
    );
  }
  
  const data = await response.json();
  
  return NextResponse.json({
    businessName: data.name,
    registrationNumber: data.cik,
    legalName: data.name,
    businessType: data.entityType,
    status: 'Active',
    registeredAddress: {
      street: data.addresses?.business?.street1,
      city: data.addresses?.business?.city,
      state: data.addresses?.business?.stateOrCountry,
      zip: data.addresses?.business?.zipCode,
    },
    verified: true,
    verificationSource: 'sec_edgar',
    rawData: data,
  });
}
```

#### OpenCorporates API (Global)

```typescript
// app/api/business/verify-global/route.ts
import { NextRequest, NextResponse } from "next/server";

const OPENCORPORATES_API_KEY = process.env.OPENCORPORATES_API_KEY;

export async function POST(req: NextRequest) {
  const { companyNumber, jurisdiction } = await req.json();
  
  const response = await fetch(
    `https://api.opencorporates.com/v0.4/companies/${jurisdiction}/${companyNumber}`,
    {
      headers: {
        'X-API-Key': OPENCORPORATES_API_KEY || '',
      },
    }
  );
  
  if (!response.ok) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }
  
  const data = await response.json();
  const company = data.results.company;
  
  return NextResponse.json({
    businessName: company.name,
    registrationNumber: company.company_number,
    legalName: company.name,
    businessType: company.company_type,
    registrationDate: company.incorporation_date,
    status: company.current_status,
    registeredAddress: company.registered_address,
    verified: true,
    verificationSource: 'opencorporates',
    rawData: company,
  });
}
```

### Phase 3: UI Components

#### Business Verification Form

```typescript
// components/business-verification-form.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function BusinessVerificationForm() {
  const [country, setCountry] = useState("US");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    
    let endpoint = "/api/business/verify-global";
    if (country === "GB") endpoint = "/api/business/verify-uk";
    if (country === "US") endpoint = "/api/business/verify-us";
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyNumber: registrationNumber,
        jurisdiction: country.toLowerCase(),
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setBusinessData(data);
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Select value={country} onValueChange={setCountry}>
        <option value="US">United States</option>
        <option value="GB">United Kingdom</option>
        <option value="EE">Estonia</option>
      </Select>
      
      <Input
        placeholder={
          country === "GB" ? "Company Number (e.g., 12345678)" :
          country === "US" ? "CIK or EIN" :
          "Registration Number"
        }
        value={registrationNumber}
        onChange={(e) => setRegistrationNumber(e.target.value)}
      />
      
      <Button onClick={handleVerify} disabled={loading}>
        {loading ? "Verifying..." : "Verify Business"}
      </Button>
      
      {businessData && (
        <div className="p-4 border rounded">
          <h3 className="font-bold">{businessData.businessName}</h3>
          <p>Status: {businessData.status}</p>
          <p>Type: {businessData.businessType}</p>
          {/* Display more enriched data */}
        </div>
      )}
    </div>
  );
}
```

### Phase 4: Twilio Test Number Integration

For business accounts, you can use a Twilio test number for verification:

```typescript
// app/api/business/send-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: NextRequest) {
  const { phoneNumber, isBusinessAccount } = await req.json();
  
  // Use test number for business accounts
  const fromNumber = isBusinessAccount
    ? process.env.TWILIO_TEST_NUMBER // Test number for businesses
    : process.env.TWILIO_PHONE_NUMBER; // Regular number for individuals
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  await client.messages.create({
    body: `Your verification code is: ${code}`,
    from: fromNumber,
    to: phoneNumber,
  });
  
  return NextResponse.json({ success: true });
}
```

## Environment Variables

Add to `.env`:

```bash
# Business Verification APIs
COMPANIES_HOUSE_API_KEY=your_key_here
OPENCORPORATES_API_KEY=your_key_here

# Twilio
TWILIO_TEST_NUMBER=+15005550006  # Twilio test number
```

## API Keys Setup

### UK Companies House
1. Go to https://developer.company-information.service.gov.uk/
2. Register for an API key (free)
3. Add to environment variables

### OpenCorporates
1. Go to https://opencorporates.com/api_accounts/new
2. Free tier: 500 requests/month
3. Paid plans for higher volume

### US SEC EDGAR
- No API key required
- Just need a User-Agent header with contact info

## Benefits

1. **Automatic KYB** (Know Your Business)
2. **Reduced fraud** - Verify against official registries
3. **Data enrichment** - Auto-fill business details
4. **Compliance** - Meet regulatory requirements
5. **Better UX** - Users don't manually enter all data

## Next Steps

1. Add business_profiles table to Supabase
2. Create verification API endpoints
3. Build UI for business signup flow
4. Integrate with existing auth flow
5. Add business badge/indicator in UI

Would you like me to implement any of these components?
