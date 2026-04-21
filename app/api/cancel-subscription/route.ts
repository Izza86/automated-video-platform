import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { subscription } from "@/db/schema";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

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

    // Cancel subscription at period end
    const stripeSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    return NextResponse.json({
      success: true,
      subscription: stripeSubscription,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
