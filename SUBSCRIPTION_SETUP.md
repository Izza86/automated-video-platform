# Subscription & Payment System Setup Guide

This guide will help you set up Stripe subscriptions for your Automated Video Editor platform.

## Overview

The subscription system includes:

- **Free Plan**: 5 videos/month (no payment required)
- **Pro Plan**: $19/month or $190/year - 100 videos/month
- **Business Plan**: $49/month or $490/year - Unlimited videos
- 14-day free trial on paid plans
- Full billing management dashboard
- Usage tracking and limits

## Prerequisites

- Stripe account ([sign up here](https://dashboard.stripe.com/register))
- Database with updated schema
- Environment variables configured

## Step 1: Update Database Schema

Run the Drizzle migration to add subscription tables:

```bash
pnpm drizzle-kit push
```

This will create:

- `subscription_plan` table
- `subscription` table
- `usage` table
- `payment` table
- Add `stripeCustomerId` to user table

## Step 2: Create Stripe Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. Create the following products:

### Pro Plan - Monthly

- Name: `Pro Plan (Monthly)`
- Price: `$19.00 USD`
- Billing period: `Monthly`
- Copy the **Price ID** (starts with `price_`)

### Pro Plan - Yearly

- Name: `Pro Plan (Yearly)`
- Price: `$190.00 USD`
- Billing period: `Yearly`
- Copy the **Price ID**

### Business Plan - Monthly

- Name: `Business Plan (Monthly)`
- Price: `$49.00 USD`
- Billing period: `Monthly`
- Copy the **Price ID**

### Business Plan - Yearly

- Name: `Business Plan (Yearly)`
- Price: `$490.00 USD`
- Billing period: `Yearly`
- Copy the **Price ID**

## Step 3: Get Stripe API Keys

1. Go to **Developers** → **API Keys**
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable key** (starts with `pk_test_`)

## Step 4: Setup Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Step 5: Update Environment Variables

Add to your `.env` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Price IDs (from Step 2)
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxx

# Public Price IDs (same as above)
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxx
```

## Step 6: Seed Subscription Plans

Run the seed script to populate your database with plan data:

```bash
node scripts/seed-subscription-plans.js
```

## Step 7: Test the Integration

### Test Mode

1. Visit `/pricing` on your site
2. Click "Start Free Trial" on Pro plan
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Expiry: Any future date
   - CVC: Any 3 digits

### Test Scenarios

- ✅ Subscribe to Pro Monthly
- ✅ Cancel subscription
- ✅ Resume subscription
- ✅ Create videos and track usage
- ✅ Hit video limit
- ✅ Upgrade plan
- ✅ Webhook events processing

## Features Implemented

### For Users

- **Pricing Page** (`/pricing`): View and compare plans
- **Checkout** (`/checkout`): Secure Stripe checkout with 14-day trial
- **Billing Dashboard** (`/dashboard/billing`):
  - View current plan and usage
  - Cancel/resume subscription
  - See billing history
  - Manage payment methods
- **Usage Tracking**: Automatic video count per month
- **Usage Limits**: Enforce video limits based on plan

### For Developers

- **Server Actions** (`server/subscriptions.ts`):
  - `getUserSubscription()`: Get user's active subscription
  - `hasActiveSubscription()`: Check subscription status
  - `canCreateVideo()`: Check if user can create more videos
  - `incrementVideoUsage()`: Track video creation
  - `getUserUsage()`: Get monthly usage stats

- **API Routes**:
  - `POST /api/checkout`: Create checkout session
  - `POST /api/cancel-subscription`: Cancel subscription
  - `POST /api/resume-subscription`: Resume subscription
  - `GET /api/subscription`: Get subscription details
  - `POST /api/webhooks/stripe`: Handle Stripe events

## Usage in Your Code

### Check if user can create video:

```typescript
import { canCreateVideo, incrementVideoUsage } from "@/server/subscriptions";

async function handleVideoCreation() {
  const check = await canCreateVideo();

  if (!check.allowed) {
    return { error: check.reason };
  }

  // Create video...

  // Increment usage counter
  await incrementVideoUsage();

  return { success: true };
}
```

### Check active subscription:

```typescript
import { hasActiveSubscription } from "@/server/subscriptions";

const isSubscribed = await hasActiveSubscription();
if (isSubscribed) {
  // Show premium features
}
```

## Going to Production

1. Switch to Stripe **Live mode** in dashboard
2. Update `.env` with live keys (starts with `sk_live_` and `pk_live_`)
3. Update webhook endpoint to production URL
4. Test with real payment methods
5. Set up proper error monitoring
6. Configure email notifications for failed payments

## Troubleshooting

### Webhook not receiving events

- Check webhook URL is publicly accessible
- Verify webhook secret matches
- Check Stripe CLI if developing locally

### Payment not updating subscription

- Check webhook events are being processed
- Verify price IDs match in database and Stripe
- Check server logs for errors

### User not getting trial

- Ensure `trial_period_days` is set in checkout session
- Verify subscription has trial dates in database

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Cards: https://stripe.com/docs/testing

## Security Notes

- ⚠️ Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`
- ✅ Always validate webhook signatures
- ✅ Use environment variables for all sensitive data
- ✅ Implement rate limiting on API routes
- ✅ Log all payment events for audit trail
