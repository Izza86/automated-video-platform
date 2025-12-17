"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PLANS = {
	"pro-monthly": {
		name: "Pro",
		price: 19,
		interval: "month",
		priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!,
	},
	"pro-yearly": {
		name: "Pro",
		price: 190,
		interval: "year",
		priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!,
	},
	"business-monthly": {
		name: "Business",
		price: 49,
		interval: "month",
		priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID!,
	},
	"business-yearly": {
		name: "Business",
		price: 490,
		interval: "year",
		priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID!,
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
			router.push("/pricing");
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
					planId: planId,
				}),
			});

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
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Checkout</CardTitle>
					<CardDescription>
						Complete your purchase to access premium features
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Plan Summary */}
					<div className="border rounded-lg p-4 space-y-2">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold text-lg">{plan.name} Plan</h3>
							<div className="text-right">
								<p className="text-2xl font-bold">${plan.price}</p>
								<p className="text-sm text-muted-foreground">
									/{plan.interval}
								</p>
							</div>
						</div>
						<p className="text-sm text-muted-foreground">
							Billed {plan.interval === "month" ? "monthly" : "annually"}
						</p>
					</div>

					{/* Trial Info */}
					<div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
						<p className="text-sm font-medium">14-Day Free Trial</p>
						<p className="text-sm text-muted-foreground mt-1">
							You won't be charged until your trial ends. Cancel anytime.
						</p>
					</div>

					{/* Action Button */}
					<Button
						className="w-full"
						size="lg"
						onClick={handleCheckout}
						disabled={loading}
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

					<p className="text-xs text-center text-muted-foreground">
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
				<div className="min-h-screen flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			}
		>
			<CheckoutContent />
		</Suspense>
	);
}
