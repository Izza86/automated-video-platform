"use client";

import { Calendar, CreditCard, Loader2, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string;
  };
  plan: {
    name: string;
    description: string;
    price: string;
    interval: string;
    videoLimit: number | null;
  };
  usage: {
    videosCreated: number;
  };
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for success parameter
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      // Remove the query parameter
      router.replace("/dashboard/billing");
    }

    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setSubscriptionData(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You'll continue to have access until the end of your billing period."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscriptionData?.subscription.stripeSubscriptionId,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          await response.json();
        }
        toast.success("Subscription cancelled successfully");
        fetchSubscription();
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (error) {
      toast.error("Failed to cancel subscription");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/resume-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscriptionData?.subscription.stripeSubscriptionId,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          await response.json();
        }
        toast.success("Subscription resumed successfully");
        fetchSubscription();
      } else {
        throw new Error("Failed to resume subscription");
      }
    } catch (error) {
      toast.error("Failed to resume subscription");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async () => {
    await router.prefetch("/pricing");
    router.push("/pricing");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text font-bold text-3xl text-transparent">
            Billing & Subscription
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your subscription and billing
          </p>
        </div>

        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/20 via-fuchsia-900/20 to-pink-900/20 shadow-lg shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-purple-400">
              No Active Subscription
            </CardTitle>
            <CardDescription>You're currently on the free plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground text-sm">
              Upgrade to unlock more features and increase your video limit.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              onClick={handleUpgrade}
            >
              View Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const { subscription, plan, usage } = subscriptionData;
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const usagePercentage = plan.videoLimit
    ? (usage.videosCreated / plan.videoLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text font-bold text-3xl text-transparent">
          Billing & Subscription
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/15 via-fuchsia-900/15 to-pink-900/15 shadow-lg shadow-purple-500/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan.name} Plan
                <Badge
                  variant={
                    subscription.status === "active" ? "default" : "secondary"
                  }
                >
                  {subscription.status}
                </Badge>
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            <div className="text-right">
              <p className="font-bold text-2xl">${plan.price}</p>
              <p className="text-muted-foreground text-sm">/{plan.interval}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {subscription.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}{" "}
              {periodEnd.toLocaleDateString()}
            </span>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Your subscription will be canceled at the end of the current
                billing period. You'll continue to have access until{" "}
                {periodEnd.toLocaleDateString()}.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          {subscription.cancelAtPeriodEnd ? (
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              disabled={actionLoading}
              onClick={handleResumeSubscription}
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Resume Subscription
            </Button>
          ) : (
            <>
              <Button
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                onClick={handleUpgrade}
              >
                Change Plan
              </Button>
              <Button
                className="border-red-500 text-red-600 hover:bg-red-500/10"
                disabled={actionLoading}
                onClick={handleCancelSubscription}
                variant="outline"
              >
                {actionLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cancel Subscription
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Usage */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/15 via-fuchsia-900/15 to-pink-900/15 shadow-lg shadow-purple-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Usage This Month
          </CardTitle>
          <CardDescription>
            Your video creation usage for the current billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Videos Created</span>
              <span className="font-medium">
                {usage.videosCreated}
                {plan.videoLimit && ` / ${plan.videoLimit}`}
              </span>
            </div>
            {plan.videoLimit && (
              <>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usagePercentage >= 90
                        ? "bg-red-500"
                        : usagePercentage >= 70
                          ? "bg-yellow-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                {usagePercentage >= 90 && (
                  <p className="text-red-600 text-sm dark:text-red-400">
                    You're running low on videos. Consider upgrading your plan.
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/15 via-fuchsia-900/15 to-pink-900/15 shadow-lg shadow-purple-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            Payment Method
          </CardTitle>
          <CardDescription>
            Manage your payment methods in the Stripe portal
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
          >
            <a
              href={`https://billing.stripe.com/p/login/${process.env.NEXT_PUBLIC_STRIPE_PORTAL_KEY}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Manage in Stripe
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
