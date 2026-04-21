"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    description: "Perfect for trying out the platform",
    price: { monthly: 0, yearly: 0 },
    videoLimit: "5 videos/month",
    features: [
      "5 videos per month",
      "Basic templates",
      "720p video quality",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    description: "Great for regular content creators",
    price: { monthly: 19, yearly: 190 },
    videoLimit: "100 videos/month",
    features: [
      "100 videos per month",
      "All templates",
      "1080p HD video quality",
      "Advanced editing tools",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Business",
    description: "For teams and agencies",
    price: { monthly: 49, yearly: 490 },
    videoLimit: "Unlimited videos",
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
    cta: "Contact Sales",
    popular: false,
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const router = useRouter();

  const handleSubscribe = async (planName: string) => {
    if (planName === "Free") {
      await router.prefetch("/signup");
      router.push("/signup");
      return;
    }

    if (planName === "Business") {
      // Redirect to contact or sales page
      window.location.href = "mailto:sales@yourcompany.com";
      return;
    }

    // Redirect to checkout
    const priceId =
      billingInterval === "monthly" ? "pro-monthly" : "pro-yearly";

    await router.prefetch(`/checkout?plan=${priceId}`);
    router.push(`/checkout?plan=${priceId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-bold text-4xl md:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mb-8 text-muted-foreground text-xl">
            Choose the plan that's right for you
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-muted p-1">
            <Button
              onClick={() => setBillingInterval("monthly")}
              size="sm"
              variant={billingInterval === "monthly" ? "default" : "ghost"}
            >
              Monthly
            </Button>
            <Button
              onClick={() => setBillingInterval("yearly")}
              size="sm"
              variant={billingInterval === "yearly" ? "default" : "ghost"}
            >
              Yearly
              <Badge className="ml-2" variant="secondary">
                Save 17%
              </Badge>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              className={`relative ${
                plan.popular
                  ? "scale-105 border-primary shadow-lg"
                  : "border-border"
              }`}
              key={plan.name}
            >
              {plan.popular && (
                <div className="-top-4 absolute right-0 left-0 flex justify-center">
                  <Badge className="px-4 py-1">Most Popular</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-4xl">
                      ${plan.price[billingInterval]}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {plan.videoLimit}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-2" key={feature}>
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.name)}
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="mb-8 text-center font-bold text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Can I change plans later?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                will be reflected in your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">
                What happens if I exceed my video limit?
              </h3>
              <p className="text-muted-foreground">
                You'll be prompted to upgrade your plan. Your existing videos
                will remain accessible.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                Yes, we offer a 14-day money-back guarantee on all paid plans.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Is there a free trial?</h3>
              <p className="text-muted-foreground">
                Yes, the Pro plan comes with a 14-day free trial. No credit card
                required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
