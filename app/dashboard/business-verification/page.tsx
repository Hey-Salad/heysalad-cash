import { BusinessEnrichmentForm } from "@/components/business-enrichment-form";
import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server-client";

export default async function BusinessVerificationPage() {
  const supabase = await createSupabaseServerComponentClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Business Verification</h1>
        <p className="text-muted-foreground">
          Verify and enrich your business information using AI-powered data analysis
          and official registry verification.
        </p>
      </div>

      <BusinessEnrichmentForm />
    </div>
  );
}
