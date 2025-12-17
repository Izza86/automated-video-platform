import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Database, HardDrive, Video, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function QuotasPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const quotaTypes = [
    { title: "Storage Limit", current: "50 GB", max: "100 GB", icon: HardDrive, color: "from-blue-600 to-cyan-600" },
    { title: "Video Processing", current: "45 videos", max: "100 videos/month", icon: Video, color: "from-purple-600 to-pink-600" },
    { title: "Upload Limit", current: "10 GB", max: "20 GB/day", icon: Database, color: "from-green-600 to-emerald-600" },
    { title: "Processing Time", current: "120 min", max: "200 min/month", icon: Clock, color: "from-orange-600 to-red-600" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                <Database className="w-10 h-10 text-purple-400" />
                Quota Management
              </h1>
              <p className="text-gray-400 mt-2">Set and manage user quotas and limits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotaTypes.map((quota, index) => {
              const Icon = quota.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${quota.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{quota.title}</h3>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Current: {quota.current}</span>
                      <span className="text-gray-400">Max: {quota.max}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${quota.color} rounded-full`} style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
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
