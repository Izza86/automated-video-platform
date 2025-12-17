"use server";

import { db } from "@/db/drizzle";
import { subscription, subscriptionPlan, usage, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get current user's subscription with plan details
 */
export async function getUserSubscription(userId?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserId = userId || session?.user?.id;

  if (!currentUserId) {
    return null;
  }

  const result = await db
    .select({
      subscription,
      plan: subscriptionPlan,
    })
    .from(subscription)
    .innerJoin(subscriptionPlan, eq(subscription.planId, subscriptionPlan.id))
    .where(eq(subscription.userId, currentUserId))
    .orderBy(desc(subscription.createdAt))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId?: string): Promise<boolean> {
  const userSub = await getUserSubscription(userId);
  
  if (!userSub) {
    return false;
  }

  const isActive = 
    userSub.subscription.status === "active" || 
    userSub.subscription.status === "trialing";

  const isNotExpired = new Date(userSub.subscription.currentPeriodEnd) > new Date();

  return isActive && isNotExpired;
}

/**
 * Get user's current usage for this month
 */
export async function getUserUsage(userId?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserId = userId || session?.user?.id;

  if (!currentUserId) {
    return null;
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await db
    .select()
    .from(usage)
    .where(
      and(
        eq(usage.userId, currentUserId),
        eq(usage.month, month),
        eq(usage.year, year)
      )
    )
    .limit(1);

  return result[0] || { videosCreated: 0 };
}

/**
 * Check if user can create more videos based on their plan
 */
export async function canCreateVideo(userId?: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserId = userId || session?.user?.id;

  if (!currentUserId) {
    return { allowed: false, reason: "Not authenticated" };
  }

  // Get user's subscription
  const userSub = await getUserSubscription(currentUserId);
  
  // If no subscription, default to free plan (5 videos)
  const videoLimit = userSub?.plan.videoLimit ?? 5;
  
  // null means unlimited
  if (videoLimit === null) {
    return { allowed: true };
  }

  // Get current usage
  const currentUsage = await getUserUsage(currentUserId);
  const videosCreated = currentUsage?.videosCreated || 0;

  if (videosCreated >= videoLimit) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${videoLimit} videos. Please upgrade your plan.`,
      limit: videoLimit,
      used: videosCreated,
    };
  }

  return {
    allowed: true,
    limit: videoLimit,
    used: videosCreated,
  };
}

/**
 * Increment user's video usage counter
 */
export async function incrementVideoUsage(userId?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserId = userId || session?.user?.id;

  if (!currentUserId) {
    throw new Error("Not authenticated");
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Try to update existing usage record
  const existing = await db
    .select()
    .from(usage)
    .where(
      and(
        eq(usage.userId, currentUserId),
        eq(usage.month, month),
        eq(usage.year, year)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(usage)
      .set({
        videosCreated: existing[0].videosCreated + 1,
        updatedAt: new Date(),
      })
      .where(eq(usage.id, existing[0].id));
  } else {
    // Create new record
    await db.insert(usage).values({
      id: crypto.randomUUID(),
      userId: currentUserId,
      month,
      year,
      videosCreated: 1,
    });
  }
}

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans() {
  return await db
    .select()
    .from(subscriptionPlan)
    .where(eq(subscriptionPlan.isActive, true))
    .orderBy(subscriptionPlan.price);
}
