import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { subscription } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // ── Ownership check: verify this subscription belongs to the user ────
    const [owned] = await db
      .select({ id: subscription.id })
      .from(subscription)
      .where(
        and(
          eq(subscription.stripeSubscriptionId, subscriptionId),
          eq(subscription.userId, session.user.id)
        )
      )
      .limit(1);

    if (!owned) {
      return NextResponse.json(
        { error: "Subscription not found or does not belong to you" },
        { status: 403 }
      );
    }

    // Resume subscription
    const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return NextResponse.json({ success: true, subscription: stripeSubscription });
  } catch (error) {
    console.error("Resume subscription error:", error);
    return NextResponse.json(
      { error: "Failed to resume subscription" },
      { status: 500 }
    );
  }
}
