import { db } from "@/db/drizzle";
import { activityLog, user, supportTicket } from "@/db/schema";
import { desc, eq, count, sql, and, gte } from "drizzle-orm";

// Get recent activity logs
export async function getRecentActivity(limit = 50) {
  const activities = await db
    .select({
      activity: activityLog,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(activityLog)
    .leftJoin(user, eq(activityLog.userId, user.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return activities;
}

// Get activity stats for dashboard
export async function getActivityStats() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalActivities,
    todayActivities,
    weekActivities,
    monthActivities,
  ] = await Promise.all([
    db.select({ count: count() }).from(activityLog),
    db
      .select({ count: count() })
      .from(activityLog)
      .where(gte(activityLog.createdAt, oneDayAgo)),
    db
      .select({ count: count() })
      .from(activityLog)
      .where(gte(activityLog.createdAt, sevenDaysAgo)),
    db
      .select({ count: count() })
      .from(activityLog)
      .where(gte(activityLog.createdAt, thirtyDaysAgo)),
  ]);

  // Get activity breakdown by type
  const activityByType = await db
    .select({
      type: activityLog.type,
      count: count(),
    })
    .from(activityLog)
    .groupBy(activityLog.type)
    .orderBy(desc(count()));

  return {
    total: totalActivities[0]?.count || 0,
    today: todayActivities[0]?.count || 0,
    thisWeek: weekActivities[0]?.count || 0,
    thisMonth: monthActivities[0]?.count || 0,
    byType: activityByType,
  };
}

// Log a new activity
export async function logActivity(
  userId: string,
  type: typeof activityLog.$inferInsert["type"],
  description: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  const [activity] = await db
    .insert(activityLog)
    .values({
      id: crypto.randomUUID(),
      userId,
      type,
      description,
      metadata: metadata || {},
      ipAddress,
      userAgent,
    })
    .returning();

  return activity;
}

// Get support ticket stats
export async function getTicketStats() {
  const [
    openTickets,
    inProgressTickets,
    resolvedTickets,
    totalTickets,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(supportTicket)
      .where(eq(supportTicket.status, "open")),
    db
      .select({ count: count() })
      .from(supportTicket)
      .where(eq(supportTicket.status, "in_progress")),
    db
      .select({ count: count() })
      .from(supportTicket)
      .where(eq(supportTicket.status, "resolved")),
    db.select({ count: count() }).from(supportTicket),
  ]);

  // Get priority breakdown
  const priorityBreakdown = await db
    .select({
      priority: supportTicket.priority,
      count: count(),
    })
    .from(supportTicket)
    .groupBy(supportTicket.priority)
    .orderBy(desc(count()));

  return {
    open: openTickets[0]?.count || 0,
    inProgress: inProgressTickets[0]?.count || 0,
    resolved: resolvedTickets[0]?.count || 0,
    total: totalTickets[0]?.count || 0,
    byPriority: priorityBreakdown,
  };
}

// Get recent support tickets
export async function getRecentTickets(limit = 20) {
  const tickets = await db
    .select({
      ticket: supportTicket,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(supportTicket)
    .leftJoin(user, eq(supportTicket.userId, user.id))
    .orderBy(desc(supportTicket.createdAt))
    .limit(limit);

  return tickets;
}

// Get analytics data for admin dashboard
export async function getAdminAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalProjects,
    totalVideos,
    recentActivities,
  ] = await Promise.all([
    db.select({ count: count() }).from(user),
    db.select({ count: count() }).from(sql`project`),
    db
      .select({ count: count() })
      .from(activityLog)
      .where(eq(activityLog.type, "upload")),
    db
      .select({ count: count() })
      .from(activityLog)
      .where(gte(activityLog.createdAt, thirtyDaysAgo)),
  ]);

  // Get user growth (new users per day for last 30 days)
  const userGrowth = await db.execute(sql`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM "user"
    WHERE created_at >= ${thirtyDaysAgo.toISOString()}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  return {
    totalUsers: totalUsers[0]?.count || 0,
    totalProjects: totalProjects[0]?.count || 0,
    totalVideos: totalVideos[0]?.count || 0,
    recentActivityCount: recentActivities[0]?.count || 0,
    userGrowth: userGrowth.rows || [],
  };
}
