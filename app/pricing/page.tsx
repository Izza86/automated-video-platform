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
    price: { monthly: 5, yearly: 50 },
    videoLimit: "50 videos/month",
    features: [
      "50 videos per month",
      "All templates",
      "1080p HD video quality",
      "Advanced editing tools",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    popular: true,
    priceId: {
      monthly: "pro-monthly",
      yearly: "pro-yearly"
    }
  },
  {
    name: "Premium",
    description: "For professional creators",
    price: { monthly: 10, yearly: 100 },
    videoLimit: "Unlimited videos",
    features: [
      "Unlimited videos",
      "All templates & premium content",
      "4K video quality",
      "Advanced editing tools",
      "Priority support",
      "Custom branding",
      "API access",
    ],
    cta: "Get Premium",
    popular: false,
    priceId: {
      monthly: "premium-monthly",
      yearly: "premium-yearly"
    }
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const router = useRouter();

  const handleSubscribe = async (planName: string) => {
    if (planName === "Free") {
      await router.prefetch("/signup");
      router.push("/signup");
      return;
    }

    if (planName === "Premium") {
      // Redirect to checkout for Premium plan
      const plan = plans.find(p => p.name === "Premium");
      const priceId = plan?.priceId?.[billingInterval];
      if (priceId) {
        await router.prefetch(`/checkout?plan=${priceId}`);
        router.push(`/checkout?plan=${priceId}`);
      }
      return;
    }

    // Redirect to checkout for Pro plan
    const plan = plans.find(p => p.name === "Pro");
    const priceId = plan?.priceId?.[billingInterval];
    if (priceId) {
      await router.prefetch(`/checkout?plan=${priceId}`);
      router.push(`/checkout?plan=${priceId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05030b] via-[#0a0614] to-[#05030b] text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-pink-600/15 blur-[100px]" />
      
      <style jsx>{`
        .flip-card {
          perspective: 1000px;
          height: 500px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-semibold uppercase tracking-wider">
            Pricing Plans
          </span>
          <h1 className="mb-4 font-bold text-4xl md:text-6xl bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="mb-8 text-white/60 text-xl max-w-2xl mx-auto">
            Choose the plan that's right for you and start creating amazing videos
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-1 backdrop-blur-sm">
            <Button
              onClick={() => setBillingInterval("monthly")}
              size="sm"
              variant={billingInterval === "monthly" ? "default" : "ghost"}
              className={billingInterval === "monthly" 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0" 
                : "text-white/70 hover:text-white hover:bg-white/10"
              }
            >
              Monthly
            </Button>
            <Button
              onClick={() => setBillingInterval("yearly")}
              size="sm"
              variant={billingInterval === "yearly" ? "default" : "ghost"}
              className={billingInterval === "yearly" 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0" 
                : "text-white/70 hover:text-white hover:bg-white/10"
              }
            >
              Yearly
              <Badge className="ml-2 bg-green-500/20 text-green-300 border-green-500/30" variant="secondary">
                Save 17%
              </Badge>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flip-card ${flippedCard === plan.name ? 'flipped' : ''}`}
              onClick={() => setFlippedCard(flippedCard === plan.name ? null : plan.name)}
            >
              <div className="flip-card-inner">
                {/* Front Side */}
                <Card
                  className={`flip-card-front relative cursor-pointer bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/20 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl ${
                    plan.popular
                      ? "scale-105 border-purple-500/50 shadow-2xl shadow-purple-500/20"
                      : "hover:border-purple-500/30 hover:shadow-purple-500/10"
                  }`}
                >
                  {plan.popular && (
                    <div className="-top-4 absolute right-0 left-0 flex justify-center">
                      <Badge className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg shadow-purple-500/30 font-semibold">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl text-white font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-white/60">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Price */}
                    <div className="pb-4 border-b border-white/10">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-5xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                          ${plan.price[billingInterval]}
                        </span>
                        <span className="text-white/50 text-lg">
                          /{billingInterval === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                      <p className="mt-2 text-purple-300/80 text-sm font-medium">
                        {plan.videoLimit}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.slice(0, 3).map((feature) => (
                        <li className="flex items-start gap-3" key={feature}>
                          <div className="mt-0.5 h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm text-white/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-center text-sm text-purple-300/70 hover:text-purple-300 transition-colors cursor-pointer">
                      Click to see all features →
                    </p>
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button
                      className={`w-full font-semibold transition-all duration-300 ${
                        plan.popular 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50" 
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-purple-500/50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe(plan.name);
                      }}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Back Side */}
                <Card className={`flip-card-back relative cursor-pointer bg-gradient-to-br from-purple-900/20 via-white/5 to-pink-900/20 border-purple-500/30 backdrop-blur-xl ${
                  plan.popular ? "scale-105" : ""
                }`}>
                  <CardHeader>
                    <CardTitle className="text-2xl text-white font-bold">{plan.name} Features</CardTitle>
                    <CardDescription className="text-white/60">All included features</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* All Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li className="flex items-start gap-3" key={feature}>
                          <div className="mt-0.5 h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm text-white/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className={`w-full font-semibold transition-all duration-300 ${
                        plan.popular 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg shadow-purple-500/30" 
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-purple-500/50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe(plan.name);
                      }}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="mb-12 text-center font-bold text-3xl md:text-4xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I change plans later?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle."
              },
              {
                q: "What happens if I exceed my video limit?",
                a: "You'll be prompted to upgrade your plan. Your existing videos will remain accessible."
              },
              {
                q: "Do you offer refunds?",
                a: "Yes, we offer a 14-day money-back guarantee on all paid plans."
              },
              {
                q: "Is there a free trial?",
                a: "Yes, the Pro plan comes with a 14-day free trial. No credit card required."
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30 hover:bg-white/10"
              >
                <h3 className="mb-2 font-semibold text-white group-hover:text-purple-300 transition-colors">{faq.q}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
