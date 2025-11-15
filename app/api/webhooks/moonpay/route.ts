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
      // Sell transactions (crypto to fiat)
      case "sell_transaction_created":
      case "sell_transaction_updated":
      case "sell_transaction_failed":
        console.log("Sell transaction event:", event.type, event.data.id);
        break;
      // Swap transactions
      case "swap_transaction_created":
      case "swap_transaction_completed":
      case "swap_transaction_failed":
        console.log("Swap transaction event:", event.type, event.data.id);
        break;
      // Account and identity events
      case "account_reviewed":
      case "identity_check_updated":
      case "business_identity_updated":
        console.log("Account/Identity event:", event.type);
        break;
      // Balance and payout events
      case "balance_transaction_created":
      case "balance_transaction_updated":
      case "balance_transaction_failed":
      case "preferred_payout_account_set":
        console.log("Balance/Payout event:", event.type);
        break;
      // Virtual account events
      case "virtual_account_status_updated":
      case "virtual_account_transaction_status_updated":
        console.log("Virtual account event:", event.type);
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
