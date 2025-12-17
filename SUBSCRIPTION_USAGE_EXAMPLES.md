/\*\*

- Example: Using subscription checks in your video upload/creation page
-
- Add this to app/dashboard/upload-edit/page.tsx or wherever you create videos
  \*/

import { canCreateVideo, incrementVideoUsage } from "@/server/subscriptions";
import { toast } from "sonner";

// Example 1: Check before showing upload UI
async function VideoUploadPage() {
const check = await canCreateVideo();

if (!check.allowed) {
return (
<div className="p-6">
<h1>Upgrade Required</h1>
<p>{check.reason}</p>
<p>You've used {check.used} of {check.limit} videos this month.</p>
<a href="/pricing">Upgrade Plan</a>
</div>
);
}

return <VideoUploadForm />;
}

// Example 2: Check in API route when processing video
// File: app/api/create-video/route.ts
export async function POST(req: Request) {
const check = await canCreateVideo();

if (!check.allowed) {
return NextResponse.json(
{ error: check.reason },
{ status: 403 }
);
}

// Process video creation...
const video = await createVideo();

// Increment usage counter
await incrementVideoUsage();

return NextResponse.json({ success: true, video });
}

// Example 3: Show usage indicator in dashboard
import { getUserUsage, getUserSubscription } from "@/server/subscriptions";

async function UsageWidget() {
const subscription = await getUserSubscription();
const usage = await getUserUsage();

const limit = subscription?.plan.videoLimit ?? 5;
const used = usage?.videosCreated ?? 0;
const percentage = limit ? (used / limit) \* 100 : 0;

return (
<div className="card">
<h3>Video Usage This Month</h3>
<div className="progress-bar">
<div style={{ width: \`\${percentage}%\` }} />
</div>
<p>{used} / {limit === null ? "Unlimited" : limit} videos</p>
{percentage > 80 && <p>⚠️ Running low! Consider upgrading.</p>}
</div>
);
}

// Example 4: Show plan features based on subscription
import { hasActiveSubscription } from "@/server/subscriptions";

async function FeaturesPage() {
const isPro = await hasActiveSubscription();

return (
<div>
<h1>Features</h1>

      {/* Everyone gets basic features */}
      <Feature name="Basic Templates" available />
      <Feature name="720p Export" available />

      {/* Pro features */}
      <Feature name="HD 1080p Export" available={isPro} locked={!isPro} />
      <Feature name="Custom Branding" available={isPro} locked={!isPro} />
      <Feature name="Priority Support" available={isPro} locked={!isPro} />

      {!isPro && (
        <button onClick={() => router.push("/pricing")}>
          Upgrade to Pro
        </button>
      )}
    </div>

);
}
