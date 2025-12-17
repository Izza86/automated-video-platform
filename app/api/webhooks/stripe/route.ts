import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db/drizzle";
import { subscription, payment, subscriptionPlan } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    console.error("Missing userId or planId in checkout session");
    return;
  }

  // Subscription will be handled by subscription.created event
  console.log(`Checkout completed for user ${userId}`);
}

async function handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
  const userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  const priceId = stripeSubscription.items.data[0]?.price.id;

  // Find matching plan
  const [plan] = await db
    .select()
    .from(subscriptionPlan)
    .where(eq(subscriptionPlan.stripePriceId, priceId))
    .limit(1);

  if (!plan) {
    console.error(`No plan found for price ID: ${priceId}`);
    return;
  }

  // Check if subscription exists
  const [existing] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscription.id))
    .limit(1);

  const subscriptionData = {
    userId,
    planId: plan.id,
    stripeSubscriptionId: stripeSubscription.id,
    status: stripeSubscription.status as any,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    canceledAt: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null,
    trialStart: stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000)
      : null,
    trialEnd: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null,
    updatedAt: new Date(),
  };

  if (existing) {
    // Update existing subscription
    await db
      .update(subscription)
      .set(subscriptionData)
      .where(eq(subscription.id, existing.id));
  } else {
    // Create new subscription
    await db.insert(subscription).values({
      id: crypto.randomUUID(),
      ...subscriptionData,
    });
  }
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  await db
    .update(subscription)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscription.id));
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId;

  if (!userId) {
    return;
  }

  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, invoice.subscription as string))
    .limit(1);

  if (!sub) {
    return;
  }

  // Record payment
  await db.insert(payment).values({
    id: crypto.randomUUID(),
    userId,
    subscriptionId: sub.id,
    stripePaymentIntentId: invoice.payment_intent as string,
    amount: (invoice.amount_paid / 100).toString(),
    currency: invoice.currency,
    status: "succeeded",
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId;

  if (!userId) {
    return;
  }

  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, invoice.subscription as string))
    .limit(1);

  if (!sub) {
    return;
  }

  // Update subscription status
  await db
    .update(subscription)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscription.id, sub.id));

  // Record failed payment
  await db.insert(payment).values({
    id: crypto.randomUUID(),
    userId,
    subscriptionId: sub.id,
    stripePaymentIntentId: invoice.payment_intent as string,
    amount: (invoice.amount_due / 100).toString(),
    currency: invoice.currency,
    status: "failed",
  });
}
