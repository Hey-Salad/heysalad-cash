import { createClient } from "@/lib/utils/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// MoonPay webhook events we care about
type MoonPayEvent = {
  type: string;
  data: {
    id: string;
    status: string;
    walletAddress: string;
    cryptoCurrency: string;
    cryptoAmount: number;
    baseCurrencyAmount: number;
    baseCurrency: string;
    createdAt: string;
    updatedAt: string;
    externalTransactionId?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("moonpay-signature");

    if (!signature) {
      console.error("Missing MoonPay signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.MOONPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing MOONPAY_WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid MoonPay signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the event
    const event: MoonPayEvent = JSON.parse(body);
    console.log("MoonPay webhook event:", event.type, event.data.id);

    const supabase = await createClient();

    // Handle different event types
    switch (event.type) {
      case "transaction_created":
        await handleTransactionCreated(supabase, event.data);
        break;
      case "transaction_updated":
        await handleTransactionUpdated(supabase, event.data);
        break;
      case "transaction_completed":
        await handleTransactionCompleted(supabase, event.data);
        break;
      case "transaction_failed":
        await handleTransactionFailed(supabase, event.data);
        break;
      default:
        console.log("Unhandled MoonPay event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing MoonPay webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleTransactionCreated(supabase: any, data: any) {
  console.log("MoonPay transaction created:", data.id);

  // Find the wallet by address
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, profile_id")
    .eq("wallet_address", data.walletAddress.toLowerCase())
    .single();

  if (!wallet) {
    console.error("Wallet not found for address:", data.walletAddress);
    return;
  }

  // Create transaction record
  const { error } = await supabase.from("transactions").insert({
    wallet_id: wallet.id,
    profile_id: wallet.profile_id,
    circle_transaction_id: data.id,
    transaction_type: "MOONPAY_ONRAMP",
    amount: data.cryptoAmount,
    currency: data.cryptoCurrency.toUpperCase(),
    status: "PENDING",
    created_at: data.createdAt,
  });

  if (error) {
    console.error("Error creating transaction:", error);
  }
}

async function handleTransactionUpdated(supabase: any, data: any) {
  console.log("MoonPay transaction updated:", data.id, data.status);

  const { error } = await supabase
    .from("transactions")
    .update({
      status: data.status.toUpperCase(),
      amount: data.cryptoAmount,
    })
    .eq("circle_transaction_id", data.id);

  if (error) {
    console.error("Error updating transaction:", error);
  }
}

async function handleTransactionCompleted(supabase: any, data: any) {
  console.log("MoonPay transaction completed:", data.id);

  const { error } = await supabase
    .from("transactions")
    .update({
      status: "COMPLETED",
      amount: data.cryptoAmount,
    })
    .eq("circle_transaction_id", data.id);

  if (error) {
    console.error("Error completing transaction:", error);
  }
}

async function handleTransactionFailed(supabase: any, data: any) {
  console.log("MoonPay transaction failed:", data.id);

  const { error } = await supabase
    .from("transactions")
    .update({
      status: "FAILED",
    })
    .eq("circle_transaction_id", data.id);

  if (error) {
    console.error("Error marking transaction as failed:", error);
  }
}
