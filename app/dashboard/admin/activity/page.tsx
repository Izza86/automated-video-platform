import {
  Activity,
  ArrowLeft,
  Clock,
  Download,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const activities = [
    {
      user: "John Doe",
      action: "Uploaded video",
      time: "2 minutes ago",
      type: "upload",
      icon: Video,
    },
    {
      user: "Jane Smith",
      action: "Downloaded project",
      time: "15 minutes ago",
      type: "download",
      icon: Download,
    },
    {
      user: "Mike Johnson",
      action: "Created account",
      time: "1 hour ago",
      type: "signup",
      icon: User,
    },
    {
      user: "Sarah Williams",
      action: "Processed video",
      time: "2 hours ago",
      type: "process",
      icon: Video,
    },
    {
      user: "Tom Brown",
      action: "Logged in",
      time: "3 hours ago",
      type: "login",
      icon: User,
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
                <Activity className="h-10 w-10 text-purple-400" />
                User Activity
              </h1>
              <p className="mt-2 text-gray-400">
                Monitor all user activities in real-time
              </p>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div
                    className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                    key={index}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/20">
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{activity.user}</p>
                      <p className="text-gray-400 text-sm">{activity.action}</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Clock className="h-4 w-4" />
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
