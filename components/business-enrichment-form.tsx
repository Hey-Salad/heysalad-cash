"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface EnrichedBusinessData {
  businessName: string;
  legalName: string;
  registrationNumber?: string;
  businessType: string;
  industry: string;
  description: string;
  foundedYear?: number;
  employeeCount?: string;
  revenue?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  keyPeople?: Array<{
    name: string;
    role: string;
  }>;
  riskScore: number;
  riskFactors: string[];
  verificationStatus: "verified" | "needs_review" | "suspicious";
  confidence: number;
  officiallyVerified?: boolean;
}

export function BusinessEnrichmentForm() {
  const [formData, setFormData] = useState({
    businessName: "",
    registrationNumber: "",
    country: "US",
    website: "",
    phoneNumber: "",
    address: "",
    additionalInfo: "",
  });

  const [loading, setLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedBusinessData | null>(null);
  const [sources, setSources] = useState<{ ai: boolean; officialRegistry: boolean } | null>(null);

  const handleEnrich = async () => {
    if (!formData.businessName && !formData.registrationNumber) {
      toast.error("Please provide at least a business name or registration number");
      return;
    }

    setLoading(true);
    setEnrichedData(null);

    try {
      const response = await fetch("/api/business/enrich-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to enrich business data");
      }

      const result = await response.json();
      
      if (result.success) {
        setEnrichedData(result.data);
        setSources(result.sources);
        toast.success("Business data enriched successfully!");
      } else {
        toast.error(result.error || "Failed to enrich business data");
      }
    } catch (error) {
      console.error("Error enriching business:", error);
      toast.error("Failed to enrich business data");
    } finally {
      setLoading(false);
    }
  };

  const getVerificationBadge = () => {
    if (!enrichedData) return null;

    const { verificationStatus, officiallyVerified } = enrichedData;

    if (officiallyVerified) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Officially Verified
        </Badge>
      );
    }

    if (verificationStatus === "verified") {
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          AI Verified
        </Badge>
      );
    }

    if (verificationStatus === "needs_review") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Needs Review
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Suspicious
      </Badge>
    );
  };

  const getRiskBadge = (score: number) => {
    if (score < 30) {
      return <Badge className="bg-green-100 text-green-800">Low Risk ({score})</Badge>;
    }
    if (score < 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk ({score})</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">High Risk ({score})</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Verification & Enrichment</CardTitle>
          <CardDescription>
            Enter business details to verify and enrich with AI-powered data analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Acme Corporation"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                placeholder="12345678"
                value={formData.registrationNumber}
                onChange={(e) =>
                  setFormData({ ...formData, registrationNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="EE">Estonia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                placeholder="+1234567890"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
            <Input
              id="additionalInfo"
              placeholder="Any other relevant details..."
              value={formData.additionalInfo}
              onChange={(e) =>
                setFormData({ ...formData, additionalInfo: e.target.value })
              }
            />
          </div>

          <Button onClick={handleEnrich} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enriching Business Data...
              </>
            ) : (
              "Verify & Enrich Business"
            )}
          </Button>
        </CardContent>
      </Card>

      {enrichedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Enriched Business Data</CardTitle>
              <div className="flex gap-2">
                {getVerificationBadge()}
                {sources?.officialRegistry && (
                  <Badge className="bg-purple-100 text-purple-800">
                    Official Registry
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="font-semibold mb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Business Name:</span>
                  <p className="font-medium">{enrichedData.businessName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Legal Name:</span>
                  <p className="font-medium">{enrichedData.legalName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Business Type:</span>
                  <p className="font-medium">{enrichedData.businessType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Industry:</span>
                  <p className="font-medium">{enrichedData.industry}</p>
                </div>
                {enrichedData.registrationNumber && (
                  <div>
                    <span className="text-muted-foreground">Registration #:</span>
                    <p className="font-medium">{enrichedData.registrationNumber}</p>
                  </div>
                )}
                {enrichedData.foundedYear && (
                  <div>
                    <span className="text-muted-foreground">Founded:</span>
                    <p className="font-medium">{enrichedData.foundedYear}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{enrichedData.description}</p>
            </div>

            {/* Risk Assessment */}
            <div>
              <h3 className="font-semibold mb-2">Risk Assessment</h3>
              <div className="flex items-center gap-4">
                {getRiskBadge(enrichedData.riskScore)}
                <span className="text-sm text-muted-foreground">
                  Confidence: {enrichedData.confidence}%
                </span>
              </div>
              {enrichedData.riskFactors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Risk Factors:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {enrichedData.riskFactors.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Contact Information */}
            {(enrichedData.contact.phone || enrichedData.contact.email || enrichedData.contact.website) && (
              <div>
                <h3 className="font-semibold mb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {enrichedData.contact.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{enrichedData.contact.phone}</p>
                    </div>
                  )}
                  {enrichedData.contact.email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{enrichedData.contact.email}</p>
                    </div>
                  )}
                  {enrichedData.contact.website && (
                    <div>
                      <span className="text-muted-foreground">Website:</span>
                      <p className="font-medium">
                        <a
                          href={enrichedData.contact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {enrichedData.contact.website}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Key People */}
            {enrichedData.keyPeople && enrichedData.keyPeople.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Key People</h3>
                <div className="space-y-2">
                  {enrichedData.keyPeople.map((person, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{person.name}</span>
                      <span className="text-muted-foreground"> - {person.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
