import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Eye, Download, Clock, Users, Video, PlayCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AnalyticsPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Sample analytics data
  const stats = [
    { label: "Total Videos", value: "12", change: "+2", trend: "up", icon: Video },
    { label: "Total Views", value: "4.2K", change: "+15%", trend: "up", icon: Eye },
    { label: "Watch Time", value: "124h", change: "+8%", trend: "up", icon: Clock },
    { label: "Downloads", value: "187", change: "+23", trend: "up", icon: Download },
  ];

  const videoPerformance = [
    { name: "Product Demo V2", views: 1234, watchTime: "45m", engagement: "85%", trend: "up" },
    { name: "Tutorial Video", views: 987, watchTime: "38m", engagement: "78%", trend: "up" },
    { name: "Brand Story", views: 765, watchTime: "32m", engagement: "72%", trend: "down" },
    { name: "Product Intro", views: 543, watchTime: "28m", engagement: "65%", trend: "up" },
  ];

  const recentActivity = [
    { action: "Video processed", video: "Summer Campaign", time: "2 hours ago" },
    { action: "Downloaded", video: "Product Demo V2", time: "5 hours ago" },
    { action: "Shared on social media", video: "Tutorial Video", time: "1 day ago" },
    { action: "Template used", video: "Corporate Intro", time: "2 days ago" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  <Activity className="w-10 h-10 text-purple-400" />
                  Analytics Dashboard
                </h1>
                <p className="text-gray-400 mt-2">Track your video performance and engagement</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
                Last updated: Just now
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="flex items-center gap-1 text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Performance */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-purple-400" />
                Top Performing Videos
              </h2>
              <div className="space-y-4">
                {videoPerformance.map((video, index) => (
                  <div
                    key={index}
                    className="bg-black/40 rounded-lg p-4 hover:bg-black/60 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white">{video.name}</h3>
                      <Badge
                        className={
                          video.trend === "up"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {video.trend === "up" ? "↑" : "↓"} Trending
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Views</p>
                        <p className="text-lg font-semibold text-white">{video.views.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Watch Time</p>
                        <p className="text-lg font-semibold text-white">{video.watchTime}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="text-lg font-semibold text-white">{video.engagement}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                          style={{ width: video.engagement }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-400" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="bg-black/40 rounded-lg p-4 hover:bg-black/60 transition-all"
                  >
                    <p className="text-sm font-medium text-white mb-1">{activity.action}</p>
                    <p className="text-xs text-purple-400 mb-2">{activity.video}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views Over Time */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
                Views Over Time
              </h2>
              <div className="h-64 flex items-end justify-around gap-2">
                {[65, 45, 78, 52, 89, 67, 95].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-purple-600 to-pink-600 rounded-t-lg hover:from-purple-500 hover:to-pink-500 transition-all cursor-pointer"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-gray-500">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement Rate */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-green-400" />
                Engagement Rate
              </h2>
              <div className="flex items-center justify-center h-64">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="rgba(139, 92, 246, 0.2)"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="url(#engagementGradient)"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray="502.65"
                      strokeDashoffset="125.66"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="engagementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-white">75%</span>
                    <span className="text-sm text-gray-400 mt-2">Average</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
