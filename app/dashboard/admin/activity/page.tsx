import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, User, Video, Download, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ActivityPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const activities = [
    { user: "John Doe", action: "Uploaded video", time: "2 minutes ago", type: "upload", icon: Video },
    { user: "Jane Smith", action: "Downloaded project", time: "15 minutes ago", type: "download", icon: Download },
    { user: "Mike Johnson", action: "Created account", time: "1 hour ago", type: "signup", icon: User },
    { user: "Sarah Williams", action: "Processed video", time: "2 hours ago", type: "process", icon: Video },
    { user: "Tom Brown", action: "Logged in", time: "3 hours ago", type: "login", icon: User },
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
                <Activity className="w-10 h-10 text-purple-400" />
                User Activity
              </h1>
              <p className="text-gray-400 mt-2">Monitor all user activities in real-time</p>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-black/40 rounded-lg hover:bg-black/60 transition-all">
                    <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{activity.user}</p>
                      <p className="text-sm text-gray-400">{activity.action}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {activity.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
