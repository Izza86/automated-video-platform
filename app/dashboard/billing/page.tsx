"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CreditCard, Calendar, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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

	const handleUpgrade = () => {
		router.push("/pricing");
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!subscriptionData) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Billing & Subscription</h1>
					<p className="text-muted-foreground mt-2">
						Manage your subscription and billing
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>No Active Subscription</CardTitle>
						<CardDescription>
							You're currently on the free plan
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground mb-4">
							Upgrade to unlock more features and increase your video limit.
						</p>
					</CardContent>
					<CardFooter>
						<Button onClick={handleUpgrade}>View Plans</Button>
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
				<h1 className="text-3xl font-bold">Billing & Subscription</h1>
				<p className="text-muted-foreground mt-2">
					Manage your subscription and billing
				</p>
			</div>

			{/* Current Plan */}
			<Card>
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
							<p className="text-2xl font-bold">${plan.price}</p>
							<p className="text-sm text-muted-foreground">/{plan.interval}</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2 text-sm">
						<Calendar className="h-4 w-4 text-muted-foreground" />
						<span className="text-muted-foreground">
							{subscription.cancelAtPeriodEnd
								? "Cancels on"
								: "Renews on"}{" "}
							{periodEnd.toLocaleDateString()}
						</span>
					</div>

					{subscription.cancelAtPeriodEnd && (
						<div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
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
							onClick={handleResumeSubscription}
							disabled={actionLoading}
						>
							{actionLoading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Resume Subscription
						</Button>
					) : (
						<>
							<Button variant="outline" onClick={handleUpgrade}>
								Change Plan
							</Button>
							<Button
								variant="destructive"
								onClick={handleCancelSubscription}
								disabled={actionLoading}
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
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
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
								<div className="w-full bg-muted rounded-full h-2">
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
									<p className="text-sm text-red-600 dark:text-red-400">
										You're running low on videos. Consider upgrading your plan.
									</p>
								)}
							</>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Payment Method */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						Payment Method
					</CardTitle>
					<CardDescription>
						Manage your payment methods in the Stripe portal
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Button variant="outline" asChild>
						<a
							href={`https://billing.stripe.com/p/login/${process.env.NEXT_PUBLIC_STRIPE_PORTAL_KEY}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							Manage in Stripe
						</a>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
