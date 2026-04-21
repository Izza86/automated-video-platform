/**
 * Application-wide constants — single source of truth.
 * Import from here instead of hardcoding values across files.
 */

// ── Branding ──────────────────────────────────────────────────────────────
export const APP_NAME = "Automated Video Editor";
export const APP_SHORT_NAME = "AVE";
export const APP_DESCRIPTION =
  "Professional AI-powered video editing platform. Clone any reference video's style — color grade, speed ramps, transitions — onto your target footage in one click.";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const COMPANY = {
  name: "Automated Video Editor",
  email: "support@automatedvideoeditor.com",
  address: "", // fill in when applicable
  socials: {
    twitter: "https://twitter.com",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
  },
} as const;

export const COPYRIGHT_YEAR = new Date().getFullYear();

// ── Subscription Plans (single source of truth) ──────────────────────────
export const PLAN_LIMITS = {
  free: { videoLimit: 5, quality: "720p", name: "Free" },
  pro: { videoLimit: 100, quality: "1080p", name: "Pro" },
  business: { videoLimit: null, quality: "4K", name: "Business" }, // null = unlimited
} as const;

export const PRICING = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for trying out the platform",
    monthlyPrice: 0,
    yearlyPrice: 0,
    videoLimit: 5,
    features: [
      "5 videos per month",
      "Basic templates",
      "720p video quality",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Great for regular content creators",
    monthlyPrice: 19,
    yearlyPrice: 190,
    videoLimit: 100,
    features: [
      "100 videos per month",
      "All templates",
      "1080p HD video quality",
      "Advanced editing tools",
      "Priority support",
      "Custom branding",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "For teams and agencies",
    monthlyPrice: 49,
    yearlyPrice: 490,
    videoLimit: null,
    features: [
      "Unlimited videos",
      "All templates & premium content",
      "4K video quality",
      "Advanced editing tools",
      "Team collaboration",
      "White-label options",
      "24/7 priority support",
      "API access",
    ],
  },
} as const;

// ── Upload / Processing Limits ────────────────────────────────────────────
export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];
export const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutes

// ── Pagination ────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// ── Security ──────────────────────────────────────────────────────────────
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
} as const;

// ── Routes ────────────────────────────────────────────────────────────────
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/privacy",
  "/terms",
];
export const ADMIN_ROUTES_PREFIX = "/dashboard/admin";
export const PROTECTED_ROUTES_PREFIX = "/dashboard";
export const AUTH_ROUTES = ["/login", "/signup"];
