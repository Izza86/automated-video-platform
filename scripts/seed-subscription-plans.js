import "dotenv/config";
import { db } from "../db/drizzle.ts";
import { subscriptionPlan } from "../db/schema.ts";

const plans = [
	{
		id: "free-plan",
		name: "Free",
		description: "Perfect for trying out the platform",
		stripePriceId: null,
		price: "0",
		interval: "month",
		videoLimit: 5,
		features: [
			"5 videos per month",
			"Basic templates",
			"720p video quality",
			"Email support",
		],
		isActive: true,
	},
	{
		id: "pro-monthly",
		name: "Pro",
		description: "Great for regular content creators",
		stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
		price: "19.00",
		interval: "month",
		videoLimit: 100,
		features: [
			"100 videos per month",
			"All templates",
			"1080p HD video quality",
			"Advanced editing tools",
			"Priority support",
			"Custom branding",
		],
		isActive: true,
	},
	{
		id: "pro-yearly",
		name: "Pro (Yearly)",
		description: "Save 17% with annual billing",
		stripePriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
		price: "190.00",
		interval: "year",
		videoLimit: 100,
		features: [
			"100 videos per month",
			"All templates",
			"1080p HD video quality",
			"Advanced editing tools",
			"Priority support",
			"Custom branding",
		],
		isActive: true,
	},
	{
		id: "business-monthly",
		name: "Business",
		description: "For teams and agencies",
		stripePriceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
		price: "49.00",
		interval: "month",
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
		isActive: true,
	},
	{
		id: "business-yearly",
		name: "Business (Yearly)",
		description: "Save 17% with annual billing",
		stripePriceId: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
		price: "490.00",
		interval: "year",
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
		isActive: true,
	},
];

async function seedPlans() {
	console.log("🌱 Seeding subscription plans...");

	try {
		for (const plan of plans) {
			await db
				.insert(subscriptionPlan)
				.values(plan)
				.onConflictDoUpdate({
					target: subscriptionPlan.id,
					set: {
						name: plan.name,
						description: plan.description,
						stripePriceId: plan.stripePriceId,
						price: plan.price,
						interval: plan.interval,
						videoLimit: plan.videoLimit,
						features: plan.features,
						isActive: plan.isActive,
						updatedAt: new Date(),
					},
				});

			console.log(`✅ Created/Updated plan: ${plan.name}`);
		}

		console.log("\n✨ Successfully seeded all subscription plans!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding plans:", error);
		process.exit(1);
	}
}

seedPlans();
