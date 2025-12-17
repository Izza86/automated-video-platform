import { NextRequest, NextResponse } from "next/server";
import { getUserSubscription, getUserUsage } from "@/server/subscriptions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getUserSubscription(session.user.id);
    const usage = await getUserUsage(session.user.id);

    if (!subscription) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      subscription: subscription.subscription,
      plan: subscription.plan,
      usage,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}
