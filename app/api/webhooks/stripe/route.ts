import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 400 }
      );
    }

    // Handle the event
    console.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case "crypto_onramp_session.completed":
        // Handle successful crypto onramp
        const session = event.data.object;
        console.log("Crypto onramp completed:", session.id);
        // TODO: Update user balance or trigger notification
        break;

      case "crypto_onramp_session.failed":
        // Handle failed crypto onramp
        const failedSession = event.data.object;
        console.log("Crypto onramp failed:", failedSession.id);
        // TODO: Notify user of failure
        break;

      case "crypto_onramp_session.updated":
        // Handle onramp session updates
        const updatedSession = event.data.object;
        console.log("Crypto onramp updated:", updatedSession.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
