import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Find payment by wallet address
    const { data: payment } = await supabase
      .from("terminal_payments")
      .select("*")
      .eq("wallet_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!payment) {
      return NextResponse.json({
        status: "not_found",
        message: "Payment not found",
      });
    }

    return NextResponse.json({
      paymentId: payment.payment_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.created_at,
      completedAt: payment.completed_at,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
