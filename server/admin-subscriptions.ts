"use server";

import { db } from "@/db/drizzle";
import { subscription, subscriptionPlan, user, payment } from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

/**
 * Get all subscriptions with user and plan details (Admin only)
 */
export async function getAllSubscriptions() {
  const result = await db
    .select({
      subscription,
      plan: subscriptionPlan,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
    .from(subscription)
    .innerJoin(subscriptionPlan, eq(subscription.planId, subscriptionPlan.id))
    .innerJoin(user, eq(subscription.userId, user.id))
    .orderBy(desc(subscription.createdAt));

  return result;
}

/**
 * Get subscription statistics (Admin only)
 */
export async function getSubscriptionStats() {
  // Total active subscriptions
  const activeSubscriptions = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscription)
    .where(eq(subscription.status, "active"));

  // Total subscriptions by status
  const subscriptionsByStatus = await db
    .select({
      status: subscription.status,
      count: sql<number>`count(*)`,
    })
    .from(subscription)
    .groupBy(subscription.status);

  // Total subscriptions by plan
  const subscriptionsByPlan = await db
    .select({
      planName: subscriptionPlan.name,
      count: sql<number>`count(*)`,
    })
    .from(subscription)
    .innerJoin(subscriptionPlan, eq(subscription.planId, subscriptionPlan.id))
    .groupBy(subscriptionPlan.name);

  // Monthly recurring revenue (MRR)
  const mrrResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE 
        WHEN ${subscriptionPlan.interval} = 'month' THEN CAST(${subscriptionPlan.price} AS DECIMAL)
        WHEN ${subscriptionPlan.interval} = 'year' THEN CAST(${subscriptionPlan.price} AS DECIMAL) / 12
        ELSE 0 
      END), 0)`,
    })
    .from(subscription)
    .innerJoin(subscriptionPlan, eq(subscription.planId, subscriptionPlan.id))
    .where(eq(subscription.status, "active"));

  // Annual recurring revenue (ARR)
  const arrResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE 
        WHEN ${subscriptionPlan.interval} = 'month' THEN CAST(${subscriptionPlan.price} AS DECIMAL) * 12
        WHEN ${subscriptionPlan.interval} = 'year' THEN CAST(${subscriptionPlan.price} AS DECIMAL)
        ELSE 0 
      END), 0)`,
    })
    .from(subscription)
    .innerJoin(subscriptionPlan, eq(subscription.planId, subscriptionPlan.id))
    .where(eq(subscription.status, "active"));

  // Total revenue (from payments)
  const totalRevenueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${payment.amount} AS DECIMAL)), 0)`,
    })
    .from(payment)
    .where(eq(payment.status, "succeeded"));

  // Revenue this month
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyRevenueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${payment.amount} AS DECIMAL)), 0)`,
    })
    .from(payment)
    .where(
      and(
        eq(payment.status, "succeeded"),
        gte(payment.createdAt, firstDayOfMonth)
      )
    );

  return {
    activeSubscriptions: Number(activeSubscriptions[0]?.count || 0),
    subscriptionsByStatus: subscriptionsByStatus.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    subscriptionsByPlan: subscriptionsByPlan.map((p) => ({
      planName: p.planName,
      count: Number(p.count),
    })),
    mrr: Number(mrrResult[0]?.total || 0),
    arr: Number(arrResult[0]?.total || 0),
    totalRevenue: Number(totalRevenueResult[0]?.total || 0),
    monthlyRevenue: Number(monthlyRevenueResult[0]?.total || 0),
  };
}

/**
 * Get recent payments (Admin only)
 */
export async function getRecentPayments(limit = 10) {
  const result = await db
    .select({
      payment,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(payment)
    .innerJoin(user, eq(payment.userId, user.id))
    .orderBy(desc(payment.createdAt))
    .limit(limit);

  return result;
}

/**
 * Get subscription growth data for the last 12 months (Admin only)
 */
export async function getSubscriptionGrowth() {
  const result = await db
    .select({
      month: sql<string>`TO_CHAR(${subscription.createdAt}, 'YYYY-MM')`,
      count: sql<number>`count(*)`,
    })
    .from(subscription)
    .where(
      gte(
        subscription.createdAt,
        new Date(new Date().setMonth(new Date().getMonth() - 12))
      )
    )
    .groupBy(sql`TO_CHAR(${subscription.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${subscription.createdAt}, 'YYYY-MM')`);

  return result.map((r) => ({
    month: r.month,
    count: Number(r.count),
  }));
}
