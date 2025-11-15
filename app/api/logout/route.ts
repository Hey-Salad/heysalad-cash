import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Sign out the user
  await supabase.auth.signOut();
  
  // Redirect to sign-in page
  return NextResponse.redirect(new URL("/sign-in", req.url));
}
