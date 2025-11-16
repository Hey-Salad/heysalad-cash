import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in first." },
        { status: 401 }
      );
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { 
          error: "Profile not found",
          user_id: user.id,
          message: "You're authenticated but don't have a profile yet. Complete onboarding first."
        },
        { status: 404 }
      );
    }
    
    // Get user's wallets
    const { data: wallets } = await supabase
      .from("wallets")
      .select("wallet_address, blockchain, balance")
      .eq("profile_id", profile.id);
    
    // Return user info
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      profile: {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        created_at: profile.created_at,
      },
      wallets: wallets || [],
      message: "✅ Copy the profile.id above to use in your terminal setup!"
    });
  } catch (error) {
    console.error("Error in /api/me:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
