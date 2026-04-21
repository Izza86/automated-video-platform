"use server";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";
/**
 * Dashboard data fetching — real DB queries replacing hardcoded fake data.
 */
import { db } from "@/db/drizzle";
import {
  payment,
  project,
  session,
  subscription,
  usage,
  user,
} from "@/db/schema";

// ── Admin Dashboard Stats ─────────────────────────────────────────────────
export async function getAdminDashboardStats() {
  try {
    // Total users
    const [userCount] = await db.select({ count: count() }).from(user);

    // Total projects
    const [projectCount] = await db.select({ count: count() }).from(project);

    // Active subscriptions (status = active or trialing)
    const [activeSubCount] = await db
      .select({ count: count() })
      .from(subscription)
      .where(sql`${subscription.status} IN ('active', 'trialing')`);

    // Videos created this month
    const now = new Date();
    const [monthlyUsage] = await db
      .select({ total: sql<number>`COALESCE(SUM(${usage.videosCreated}), 0)` })
      .from(usage)
      .where(
        and(
          eq(usage.month, now.getMonth() + 1),
          eq(usage.year, now.getFullYear())
        )
      );

    // Revenue this month (from payments table)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthlyRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${payment.amount} AS NUMERIC)), 0)`,
      })
      .from(payment)
      .where(
        and(
          eq(payment.status, "succeeded"),
          gte(payment.createdAt, startOfMonth)
        )
      );

    // Active sessions (sessions that haven't expired)
    const [activeSessions] = await db
      .select({ count: count() })
      .from(session)
      .where(gte(session.expiresAt, now));

    // New users this month
    const [newUsersThisMonth] = await db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, startOfMonth));

    return {
      totalUsers: userCount.count,
      totalProjects: projectCount.count,
      activeSubscriptions: activeSubCount.count,
      videosThisMonth: Number(monthlyUsage.total) || 0,
      monthlyRevenue: Number(monthlyRevenue.total) || 0,
      activeSessions: activeSessions.count,
      newUsersThisMonth: newUsersThisMonth.count,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      totalUsers: 0,
      totalProjects: 0,
      activeSubscriptions: 0,
      videosThisMonth: 0,
      monthlyRevenue: 0,
      activeSessions: 0,
      newUsersThisMonth: 0,
    };
  }
}

// ── User Dashboard Stats ──────────────────────────────────────────────────
export async function getUserDashboardStats(userId: string) {
  try {
    // User's total projects
    const [projectCount] = await db
      .select({ count: count() })
      .from(project)
      .where(eq(project.userId, userId));

    // User's projects (recent 5)
    const recentProjects = await db
      .select()
      .from(project)
      .where(eq(project.userId, userId))
      .orderBy(desc(project.createdAt))
      .limit(5);

    // User's current month usage
    const now = new Date();
    const [currentUsage] = await db
      .select()
      .from(usage)
      .where(
        and(
          eq(usage.userId, userId),
          eq(usage.month, now.getMonth() + 1),
          eq(usage.year, now.getFullYear())
        )
      )
      .limit(1);

    // User's subscription
    const [userSub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    return {
      totalProjects: projectCount.count,
      recentProjects,
      videosCreatedThisMonth: currentUsage?.videosCreated ?? 0,
      subscription: userSub ?? null,
    };
  } catch (error) {
    console.error("Error fetching user dashboard stats:", error);
    return {
      totalProjects: 0,
      recentProjects: [],
      videosCreatedThisMonth: 0,
      subscription: null,
    };
  }
}

// ── Analytics Data ────────────────────────────────────────────────────────
export async function getAnalyticsData(userId?: string) {
  try {
    const now = new Date();
    const year = now.getFullYear();

    // Monthly usage for the last 6 months
    const monthlyData = await db
      .select({
        month: usage.month,
        year: usage.year,
        total: sql<number>`SUM(${usage.videosCreated})`,
      })
      .from(usage)
      .where(
        userId
          ? and(eq(usage.userId, userId), eq(usage.year, year))
          : eq(usage.year, year)
      )
      .groupBy(usage.month, usage.year)
      .orderBy(usage.month);

    // Total videos all-time
    const [totalVideos] = userId
      ? await db
          .select({ count: count() })
          .from(project)
          .where(eq(project.userId, userId))
      : await db.select({ count: count() }).from(project);

    return {
      monthlyData: monthlyData.map((m) => ({
        month: m.month,
        year: m.year,
        videosCreated: Number(m.total) || 0,
      })),
      totalVideos: totalVideos.count,
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return { monthlyData: [], totalVideos: 0 };
  }
}
