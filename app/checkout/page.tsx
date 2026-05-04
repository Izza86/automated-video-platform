"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PLANS = {
  "pro-monthly": {
    name: "Pro",
    price: 5,
    interval: "month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!,
  },
  "pro-yearly": {
    name: "Pro",
    price: 50,
    interval: "year",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  "premium-monthly": {
    name: "Premium",
    price: 10,
    interval: "month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
  },
  "premium-yearly": {
    name: "Premium",
    price: 100,
    interval: "year",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID!,
  },
};

function CheckoutContent() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") as keyof typeof PLANS;

  const plan = planId ? PLANS[planId] : null;

  useEffect(() => {
    if (!plan) {
      toast.error("Invalid plan selected");
      (async () => {
        try {
          await router.prefetch("/pricing");
        } finally {
          router.push("/pricing");
        }
      })();
    }
  }, [plan, router]);

  const handleCheckout = async () => {
    if (!plan) return;

    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          planId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!(contentType && contentType.includes("application/json"))) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  };

  if (!plan) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>
            Complete your purchase to access premium features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Summary */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{plan.name} Plan</h3>
              <div className="text-right">
                <p className="font-bold text-2xl">${plan.price}</p>
                <p className="text-muted-foreground text-sm">
                  /{plan.interval}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Billed {plan.interval === "month" ? "monthly" : "annually"}
            </p>
          </div>

          {/* Trial Info */}
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <p className="font-medium text-sm">14-Day Free Trial</p>
            <p className="mt-1 text-muted-foreground text-sm">
              You won't be charged until your trial ends. Cancel anytime.
            </p>
          </div>

          {/* Action Button */}
          <Button
            className="w-full"
            disabled={loading}
            onClick={handleCheckout}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              "Continue to Payment"
            )}
          </Button>

          <p className="text-center text-muted-foreground text-xs">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Secure checkout powered by Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
