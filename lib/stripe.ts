import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Subscription plan IDs - you'll get these from Stripe Dashboard
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    description: "Perfect for trying out the platform",
    price: 0,
    interval: "month" as const,
    videoLimit: 5,
    features: [
      "5 videos per month",
      "Basic templates",
      "720p video quality",
      "Email support",
    ],
  },
  PRO_MONTHLY: {
    id: "pro-monthly",
    name: "Pro",
    description: "Great for regular content creators",
    price: 19,
    interval: "month" as const,
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
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
  PRO_YEARLY: {
    id: "pro-yearly",
    name: "Pro (Yearly)",
    description: "Save 17% with annual billing",
    price: 190,
    interval: "year" as const,
    stripePriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
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
  BUSINESS_MONTHLY: {
    id: "business-monthly",
    name: "Business",
    description: "For teams and agencies",
    price: 49,
    interval: "month" as const,
    stripePriceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    videoLimit: null, // unlimited
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
  BUSINESS_YEARLY: {
    id: "business-yearly",
    name: "Business (Yearly)",
    description: "Save 17% with annual billing",
    price: 490,
    interval: "year" as const,
    stripePriceId: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    videoLimit: null, // unlimited
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
