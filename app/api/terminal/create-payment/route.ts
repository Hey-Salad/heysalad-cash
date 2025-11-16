import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { z } from "zod";

const PaymentRequestSchema = z.object({
  terminalId: z.string(),
  amount: z.string(),
  currency: z.string().default("USDC"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { terminalId, amount, currency } = PaymentRequestSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    // Get terminal configuration
    const { data: terminal } = await supabase
      .from("terminals")
      .select("*")
      .eq("terminal_id", terminalId)
      .single();

    if (!terminal) {
      return NextResponse.json(
        { error: "Terminal not found" },
        { status: 404 }
      );
    }

    // Get merchant's wallet address
    const { data: wallet } = await supabase
      .from("wallets")
      .select("wallet_address")
      .eq("profile_id", terminal.merchant_id)
      .eq("blockchain", "BASE") // Default to Base for now
      .single();

    if (!wallet) {
      return NextResponse.json(
        { error: "Merchant wallet not found" },
        { status: 404 }
      );
    }

    // Create payment request
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: payment, error } = await supabase
      .from("terminal_payments")
      .insert({
        payment_id: paymentId,
        terminal_id: terminalId,
        merchant_id: terminal.merchant_id,
        amount: parseFloat(amount),
        currency: currency,
        status: "pending",
        wallet_address: wallet.wallet_address,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating payment:", error);
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    // Return payment details including wallet address for QR code
    return NextResponse.json({
      paymentId: payment.payment_id,
      address: wallet.wallet_address,
      amount: amount,
      currency: currency,
      status: "pending",
    });
  } catch (error) {
    console.error("Error in create-payment:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
