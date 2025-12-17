"use client";

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
import { Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
			billingInterval === "monthly"
				? "pro-monthly"
				: "pro-yearly";

		router.push(`/checkout?plan=${priceId}`);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
			<div className="container mx-auto px-4 py-16">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl md:text-5xl font-bold mb-4">
						Simple, Transparent Pricing
					</h1>
					<p className="text-xl text-muted-foreground mb-8">
						Choose the plan that's right for you
					</p>

					{/* Billing Toggle */}
					<div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
						<Button
							variant={billingInterval === "monthly" ? "default" : "ghost"}
							size="sm"
							onClick={() => setBillingInterval("monthly")}
						>
							Monthly
						</Button>
						<Button
							variant={billingInterval === "yearly" ? "default" : "ghost"}
							size="sm"
							onClick={() => setBillingInterval("yearly")}
						>
							Yearly
							<Badge variant="secondary" className="ml-2">
								Save 17%
							</Badge>
						</Button>
					</div>
				</div>

				{/* Pricing Cards */}
				<div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
					{plans.map((plan) => (
						<Card
							key={plan.name}
							className={`relative ${
								plan.popular
									? "border-primary shadow-lg scale-105"
									: "border-border"
							}`}
						>
							{plan.popular && (
								<div className="absolute -top-4 left-0 right-0 flex justify-center">
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
										<span className="text-4xl font-bold">
											${plan.price[billingInterval]}
										</span>
										<span className="text-muted-foreground">
											/{billingInterval === "monthly" ? "mo" : "yr"}
										</span>
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										{plan.videoLimit}
									</p>
								</div>

								{/* Features */}
								<ul className="space-y-3">
									{plan.features.map((feature) => (
										<li key={feature} className="flex items-start gap-2">
											<Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
											<span className="text-sm">{feature}</span>
										</li>
									))}
								</ul>
							</CardContent>

							<CardFooter>
								<Button
									className="w-full"
									size="lg"
									variant={plan.popular ? "default" : "outline"}
									onClick={() => handleSubscribe(plan.name)}
								>
									{plan.cta}
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>

				{/* FAQ Section */}
				<div className="mt-24 max-w-3xl mx-auto">
					<h2 className="text-3xl font-bold text-center mb-8">
						Frequently Asked Questions
					</h2>
					<div className="space-y-6">
						<div>
							<h3 className="font-semibold mb-2">Can I change plans later?</h3>
							<p className="text-muted-foreground">
								Yes, you can upgrade or downgrade your plan at any time. Changes
								will be reflected in your next billing cycle.
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">
								What happens if I exceed my video limit?
							</h3>
							<p className="text-muted-foreground">
								You'll be prompted to upgrade your plan. Your existing videos
								will remain accessible.
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">Do you offer refunds?</h3>
							<p className="text-muted-foreground">
								Yes, we offer a 14-day money-back guarantee on all paid plans.
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">Is there a free trial?</h3>
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
