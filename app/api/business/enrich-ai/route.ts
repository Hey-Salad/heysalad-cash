import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for business enrichment request
const EnrichmentRequestSchema = z.object({
  businessName: z.string().optional(),
  registrationNumber: z.string().optional(),
  country: z.string(),
  website: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  additionalInfo: z.string().optional(),
});

// Schema for enriched business data
const EnrichedBusinessSchema = z.object({
  businessName: z.string(),
  legalName: z.string(),
  registrationNumber: z.string().optional(),
  businessType: z.string(),
  industry: z.string(),
  description: z.string(),
  foundedYear: z.number().optional(),
  employeeCount: z.string().optional(),
  revenue: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string().optional(),
  }),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
  }),
  socialMedia: z.object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
  }).optional(),
  keyPeople: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).optional(),
  riskScore: z.number().min(0).max(100),
  riskFactors: z.array(z.string()),
  verificationStatus: z.enum(["verified", "needs_review", "suspicious"]),
  confidence: z.number().min(0).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedInput = EnrichmentRequestSchema.parse(body);

    // Step 1: Use OpenAI to enrich and validate business data
    const enrichmentPrompt = `You are a business data enrichment and verification expert. 
    
Given the following business information, enrich it with additional details and assess its legitimacy:

Business Name: ${validatedInput.businessName || "Not provided"}
Registration Number: ${validatedInput.registrationNumber || "Not provided"}
Country: ${validatedInput.country}
Website: ${validatedInput.website || "Not provided"}
Phone: ${validatedInput.phoneNumber || "Not provided"}
Address: ${validatedInput.address || "Not provided"}
Additional Info: ${validatedInput.additionalInfo || "None"}

Tasks:
1. Validate if this appears to be a legitimate business
2. Enrich the data with likely business details (industry, type, description)
3. Identify any red flags or suspicious elements
4. Provide a risk score (0-100, where 0 is lowest risk)
5. Suggest the business type (LLC, Corporation, Ltd, etc.)
6. Estimate company size and industry

Return ONLY a valid JSON object matching this exact structure (no markdown, no extra text):
{
  "businessName": "string",
  "legalName": "string",
  "registrationNumber": "string or null",
  "businessType": "string (LLC, Corporation, Ltd, etc.)",
  "industry": "string",
  "description": "string (2-3 sentences)",
  "foundedYear": number or null,
  "employeeCount": "string (e.g., '1-10', '11-50', '51-200')",
  "revenue": "string or null",
  "address": {
    "street": "string or null",
    "city": "string or null",
    "state": "string or null",
    "country": "string",
    "postalCode": "string or null"
  },
  "contact": {
    "phone": "string or null",
    "email": "string or null",
    "website": "string or null"
  },
  "socialMedia": {
    "linkedin": "string or null",
    "twitter": "string or null",
    "facebook": "string or null"
  },
  "keyPeople": [
    {
      "name": "string",
      "role": "string"
    }
  ] or null,
  "riskScore": number (0-100),
  "riskFactors": ["array of risk factors or empty array"],
  "verificationStatus": "verified" | "needs_review" | "suspicious",
  "confidence": number (0-100)
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a business verification and data enrichment expert. You analyze business information and return structured, validated data. Always return valid JSON only, no markdown formatting.",
        },
        {
          role: "user",
          content: enrichmentPrompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const enrichedDataRaw = completion.choices[0]?.message?.content;
    
    if (!enrichedDataRaw) {
      throw new Error("No response from OpenAI");
    }

    // Parse and validate the enriched data
    const enrichedData = JSON.parse(enrichedDataRaw);
    const validatedData = EnrichedBusinessSchema.parse(enrichedData);

    // Step 2: If website provided, optionally scrape for additional validation
    if (validatedInput.website) {
      // You could add web scraping here for additional validation
      console.log(`Website provided: ${validatedInput.website}`);
    }

    // Step 3: Cross-reference with official registries if registration number provided
    let officialData = null;
    if (validatedInput.registrationNumber && validatedInput.country) {
      try {
        // Call the appropriate registry API based on country
        if (validatedInput.country === "GB") {
          const ukResponse = await fetch(
            `${req.nextUrl.origin}/api/business/verify-uk`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyNumber: validatedInput.registrationNumber,
              }),
            }
          );
          if (ukResponse.ok) {
            officialData = await ukResponse.json();
          }
        }
        // Add more countries as needed
      } catch (error) {
        console.error("Error fetching official registry data:", error);
      }
    }

    // Step 4: Merge AI enrichment with official data (official data takes precedence)
    const finalData = {
      ...validatedData,
      ...(officialData && {
        businessName: officialData.businessName || validatedData.businessName,
        legalName: officialData.legalName || validatedData.legalName,
        registrationNumber: officialData.registrationNumber || validatedData.registrationNumber,
        businessType: officialData.businessType || validatedData.businessType,
        verificationStatus: officialData.verified ? "verified" : validatedData.verificationStatus,
        officiallyVerified: !!officialData,
      }),
    };

    return NextResponse.json({
      success: true,
      data: finalData,
      sources: {
        ai: true,
        officialRegistry: !!officialData,
      },
    });
  } catch (error) {
    console.error("Error enriching business data:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to enrich business data",
      },
      { status: 500 }
    );
  }
}
