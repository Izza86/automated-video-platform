import { ArrowLeft, Clock, Database, HardDrive, Video } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function QuotasPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const quotaTypes = [
    {
      title: "Storage Limit",
      current: "50 GB",
      max: "100 GB",
      icon: HardDrive,
      color: "from-blue-600 to-cyan-600",
    },
    {
      title: "Video Processing",
      current: "45 videos",
      max: "100 videos/month",
      icon: Video,
      color: "from-purple-600 to-pink-600",
    },
    {
      title: "Upload Limit",
      current: "10 GB",
      max: "20 GB/day",
      icon: Database,
      color: "from-green-600 to-emerald-600",
    },
    {
      title: "Processing Time",
      current: "120 min",
      max: "200 min/month",
      icon: Clock,
      color: "from-orange-600 to-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <Link
              className="group mb-6 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
              href="/dashboard"
            >
              <ArrowLeft className="group-hover:-translate-x-1 h-4 w-4 transition-transform" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="flex items-center gap-3 font-bold text-3xl sm:text-4xl">
                <Database className="h-10 w-10 text-purple-400" />
                Quota Management
              </h1>
              <p className="mt-2 text-gray-400">
                Set and manage user quotas and limits
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {quotaTypes.map((quota, index) => {
              const Icon = quota.icon;
              return (
                <div
                  className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all hover:border-purple-500/60"
                  key={index}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`h-12 w-12 rounded-lg bg-gradient-to-r ${quota.color} flex items-center justify-center`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-bold text-white text-xl">
                    {quota.title}
                  </h3>
                  <div className="mb-4">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-400">
                        Current: {quota.current}
                      </span>
                      <span className="text-gray-400">Max: {quota.max}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/40">
                      <div
                        className={`h-full bg-gradient-to-r ${quota.color} rounded-full`}
                        style={{ width: "60%" }}
                      />
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                    Configure Limit
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
