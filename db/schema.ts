import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// User role enum: Admin and Non-Admin
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

// Project type enum
export const projectTypeEnum = pgEnum("project_type", [
  "template",
  "reference-target",
]);

// Subscription status enum
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

// Plan interval enum
export const planIntervalEnum = pgEnum("plan_interval", ["month", "year"]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    image: text("image"),
    profilePhoto: text("profile_photo"),
    role: userRoleEnum("role")
      .$defaultFn(() => "user")
      .notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("user_email_idx").on(table.email),
    index("user_role_idx").on(table.role),
    index("user_stripe_customer_idx").on(table.stripeCustomerId),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: projectTypeEnum("type").notNull(),
    videoUrl: text("video_url").notNull(),
    thumbnail: text("thumbnail"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("project_user_id_idx").on(table.userId),
    index("project_created_at_idx").on(table.createdAt),
  ]
);

// Subscription plans table
export const subscriptionPlan = pgTable("subscription_plan", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // Free, Pro, Business
  description: text("description"),
  stripePriceId: text("stripe_price_id").unique(), // Stripe price ID
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: planIntervalEnum("interval").notNull(), // month or year
  videoLimit: integer("video_limit"), // null means unlimited
  features: jsonb("features").$type<string[]>(), // Array of features
  isActive: boolean("is_active")
    .$defaultFn(() => true)
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => subscriptionPlan.id),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .$defaultFn(() => false)
      .notNull(),
    canceledAt: timestamp("canceled_at"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscription_user_id_idx").on(table.userId),
    index("subscription_stripe_id_idx").on(table.stripeSubscriptionId),
    index("subscription_status_idx").on(table.status),
  ]
);

export const usage = pgTable(
  "usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    videosCreated: integer("videos_created")
      .$defaultFn(() => 0)
      .notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("usage_user_month_year_idx").on(
      table.userId,
      table.month,
      table.year
    ),
  ]
);

export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscription.id),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency")
      .notNull()
      .$defaultFn(() => "usd"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("payment_user_id_idx").on(table.userId)]
);

export type User = typeof user.$inferSelect;
export type Project = typeof project.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlan.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
export type Usage = typeof usage.$inferSelect;
export type Payment = typeof payment.$inferSelect;

// ── Relations (enables Drizzle relational queries) ─────────────────────
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  projects: many(project),
  subscriptions: many(subscription),
  usages: many(usage),
  payments: many(payment),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const projectRelations = relations(project, ({ one }) => ({
  user: one(user, { fields: [project.userId], references: [user.id] }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
  plan: one(subscriptionPlan, {
    fields: [subscription.planId],
    references: [subscriptionPlan.id],
  }),
}));

export const usageRelations = relations(usage, ({ one }) => ({
  user: one(user, { fields: [usage.userId], references: [user.id] }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, { fields: [payment.userId], references: [user.id] }),
  subscription: one(subscription, {
    fields: [payment.subscriptionId],
    references: [subscription.id],
  }),
}));

// Support ticket status enum
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);

// Support ticket priority enum
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);

// Activity type enum
export const activityTypeEnum = pgEnum("activity_type", [
  "upload", "download", "process", "signup", "login", "logout",
  "subscribe", "cancel", "update_profile", "create_project", "delete_project"
]);

// Support tickets table
export const supportTicket = pgTable(
  "support_ticket",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: ticketStatusEnum("status").$defaultFn(() => "open").notNull(),
    priority: ticketPriorityEnum("priority").$defaultFn(() => "medium").notNull(),
    assignedTo: text("assigned_to").references(() => user.id),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("ticket_user_id_idx").on(table.userId),
    index("ticket_status_idx").on(table.status),
    index("ticket_priority_idx").on(table.priority),
    index("ticket_created_at_idx").on(table.createdAt),
  ]
);

// Activity logs table
export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    description: text("description").notNull(),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
  },
  (table) => [
    index("activity_user_id_idx").on(table.userId),
    index("activity_type_idx").on(table.type),
    index("activity_created_at_idx").on(table.createdAt),
  ]
);

// Relations for new tables
export const supportTicketRelations = relations(supportTicket, ({ one }) => ({
  user: one(user, { fields: [supportTicket.userId], references: [user.id] }),
  assignedAdmin: one(user, { fields: [supportTicket.assignedTo], references: [user.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  project,
  subscriptionPlan,
  subscription,
  usage,
  payment,
  supportTicket,
  activityLog,
  // Relations
  userRelations,
  sessionRelations,
  accountRelations,
  projectRelations,
  subscriptionRelations,
  usageRelations,
  paymentRelations,
  supportTicketRelations,
  activityLogRelations,
};

// Export types for new tables
export type SupportTicket = typeof supportTicket.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
