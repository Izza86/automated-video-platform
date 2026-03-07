/**
 * Environment variable validation — runs at import time.
 * If any required var is missing, throws a clear error at startup
 * instead of crashing randomly at runtime.
 */

function required(name: string): string {
  const val = process.env[name];
  if (!val || val.trim() === "") {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
        `   → Add it to your .env file. See env.example for reference.`
    );
  }
  return val;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] || fallback;
}

// ── Server-only env (never exposed to client) ─────────────────────────────
export const env = {
  // Auth
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: required("BETTER_AUTH_URL"),

  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // Google OAuth
  GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET"),

  // Resend email
  RESEND_API_KEY: optional("RESEND_API_KEY"),
  EMAIL_SENDER_NAME: optional("EMAIL_SENDER_NAME", "Automated Video Editor"),
  EMAIL_SENDER_ADDRESS: optional("EMAIL_SENDER_ADDRESS", "noreply@example.com"),

  // Stripe
  STRIPE_SECRET_KEY: optional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optional("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRO_MONTHLY_PRICE_ID: optional("STRIPE_PRO_MONTHLY_PRICE_ID"),
  STRIPE_PRO_YEARLY_PRICE_ID: optional("STRIPE_PRO_YEARLY_PRICE_ID"),
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: optional("STRIPE_BUSINESS_MONTHLY_PRICE_ID"),
  STRIPE_BUSINESS_YEARLY_PRICE_ID: optional("STRIPE_BUSINESS_YEARLY_PRICE_ID"),

  // Colab GPU
  COLAB_GPU_URL: optional("COLAB_GPU_URL"),

  // Misc
  NODE_ENV: optional("NODE_ENV", "development"),
} as const;

// ── Public env (safe to use on client via NEXT_PUBLIC_ prefix) ────────────
export const publicEnv = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000",
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || "",
  STRIPE_PRO_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || "",
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID || "",
  STRIPE_BUSINESS_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID || "",
} as const;
