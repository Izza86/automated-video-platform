import {
  Activity,
  ArrowLeft,
  Clock,
  Download,
  FileText,
  LogIn,
  LogOut,
  User,
  Video,
  Wand2,
  XCircle,
  CreditCard,
  Settings,
  Trash2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/users";
import { getRecentActivity, getActivityStats } from "@/server/admin-activity";
import { formatDistanceToNow } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Map activity types to icons and colors
const activityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  upload: { icon: Video, color: "text-blue-400", label: "Uploaded video" },
  download: { icon: Download, color: "text-green-400", label: "Downloaded" },
  process: { icon: Wand2, color: "text-purple-400", label: "Processed video" },
  signup: { icon: User, color: "text-pink-400", label: "Created account" },
  login: { icon: LogIn, color: "text-cyan-400", label: "Logged in" },
  logout: { icon: LogOut, color: "text-orange-400", label: "Logged out" },
  subscribe: { icon: CreditCard, color: "text-yellow-400", label: "Subscribed" },
  cancel: { icon: XCircle, color: "text-red-400", label: "Cancelled subscription" },
  update_profile: { icon: Settings, color: "text-indigo-400", label: "Updated profile" },
  create_project: { icon: Plus, color: "text-emerald-400", label: "Created project" },
  delete_project: { icon: Trash2, color: "text-rose-400", label: "Deleted project" },
};

export default async function ActivityPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch dynamic data
  const [activities, stats] = await Promise.all([
    getRecentActivity(50),
    getActivityStats(),
  ]);

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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisWeek.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisMonth.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <h2 className="mb-4 font-bold text-xl">Recent Activities</h2>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No activities recorded yet</p>
                </div>
              ) : (
                activities.map((item) => {
                  const config = activityConfig[item.activity.type] || { 
                    icon: FileText, 
                    color: "text-gray-400", 
                    label: item.activity.description 
                  };
                  const Icon = config.icon;
                  return (
                    <div
                      className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                      key={item.activity.id}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/20`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.user?.name || "Unknown User"}</p>
                        <p className="text-gray-400 text-sm">
                          {item.activity.description || config.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="h-4 w-4" />
                        {item.activity.createdAt ? formatDistanceToNow(new Date(item.activity.createdAt)) : "Unknown"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
