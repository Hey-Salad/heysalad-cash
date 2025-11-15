import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select()
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profileData) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Create placeholder wallets without passkey credentials
    const placeholderAddress = "0x0000000000000000000000000000000000000000";

    // Check if wallets already exist
    const { data: existingWallets } = await supabase
      .from("wallets")
      .select()
      .eq("profile_id", profileData.id);

    if (!existingWallets || existingWallets.length === 0) {
      // Create placeholder wallet records
      const { error: insertError } = await supabase.from("wallets").insert([
        {
          profile_id: profileData.id,
          wallet_address: placeholderAddress,
          wallet_type: "modular",
          blockchain: "POLYGON",
          account_type: "SCA",
          currency: "USDC",
          passkey_credential: null,
          circle_wallet_id: "skipped-setup",
        },
        {
          profile_id: profileData.id,
          wallet_address: placeholderAddress,
          wallet_type: "modular",
          blockchain: "BASE",
          account_type: "SCA",
          currency: "USDC",
          passkey_credential: null,
          circle_wallet_id: "skipped-setup",
        },
      ]);

      if (insertError) {
        console.error("Error inserting placeholder wallets:", insertError);
        return NextResponse.json(
          { error: "Could not create placeholder wallets" },
          { status: 500 }
        );
      }
    }

    // Update user metadata to mark wallet setup as complete (skipped)
    const { error: updateUserError } = await supabase.auth.updateUser({
      data: {
        wallet_setup_complete: true,
        wallet_setup_skipped: true,
      },
    });

    if (updateUserError) {
      console.error("Error updating user metadata:", updateUserError);
    }

    return NextResponse.json({
      message: "Passkey setup skipped successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error skipping passkey setup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to skip passkey setup: ${message}` },
      { status: 500 }
    );
  }
}
