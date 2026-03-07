import { getCurrentUser } from "@/server/users";
import { getAnalyticsData, getUserDashboardStats } from "@/server/dashboard";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Clock, Video, Activity, BarChart3, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 60;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AnalyticsPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === "admin";
  const analytics = await getAnalyticsData(isAdmin ? undefined : currentUser.id);
  const userStats = await getUserDashboardStats(currentUser.id);

  // Calculate some derived stats
  const thisMonth = new Date().getMonth() + 1;
  const thisMonthData = analytics.monthlyData.find((m) => m.month === thisMonth);
  const lastMonthData = analytics.monthlyData.find((m) => m.month === thisMonth - 1);
  const videosThisMonth = thisMonthData?.videosCreated ?? 0;
  const videosLastMonth = lastMonthData?.videosCreated ?? 0;
  const monthlyChange = videosLastMonth > 0 ? Math.round(((videosThisMonth - videosLastMonth) / videosLastMonth) * 100) : 0;

  // Build chart data for last 6 months
  const now = new Date();
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()] };
  });

  const chartData = chartMonths.map((cm) => {
    const found = analytics.monthlyData.find((m) => m.month === cm.month && m.year === cm.year);
    return { ...cm, count: found?.videosCreated ?? 0 };
  });

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold flex items-center gap-3">
                  <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                  Analytics Dashboard
                </h1>
                <p className="text-gray-400 mt-2">
                  {isAdmin ? "Platform-wide video analytics" : "Track your video creation and usage"}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
                Live Data
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              icon={<Video className="w-6 h-6 text-purple-400" />}
              label="Total Videos"
              value={analytics.totalVideos.toLocaleString()}
              change={null}
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-cyan-400" />}
              label="This Month"
              value={videosThisMonth.toLocaleString()}
              change={monthlyChange !== 0 ? `${monthlyChange > 0 ? "+" : ""}${monthlyChange}%` : null}
            />
            <StatCard
              icon={<Folder className="w-6 h-6 text-pink-400" />}
              label="Total Projects"
              value={isAdmin ? analytics.totalVideos.toLocaleString() : userStats.totalProjects.toLocaleString()}
              change={null}
            />
            <StatCard
              icon={<Clock className="w-6 h-6 text-green-400" />}
              label="Last Month"
              value={videosLastMonth.toLocaleString()}
              change={null}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Chart */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                Videos Created (Last 6 Months)
              </h2>
              {chartData.every((d) => d.count === 0) ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">No video data yet. Start creating videos to see analytics.</p>
                </div>
              ) : (
                <div className="h-64 flex items-end justify-around gap-3">
                  {chartData.map((bar) => (
                    <div key={`${bar.year}-${bar.month}`} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">{bar.count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-pink-600 rounded-t-lg hover:from-purple-500 hover:to-pink-500 transition-all cursor-pointer min-h-[4px]"
                        style={{ height: `${Math.max((bar.count / maxCount) * 100, 2)}%` }}
                      />
                      <span className="text-xs text-gray-500">{bar.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-400" />
                Monthly Breakdown
              </h2>
              <div className="space-y-4">
                {chartData.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available yet</p>
                ) : (
                  [...chartData].reverse().map((item) => (
                    <div
                      key={`detail-${item.year}-${item.month}`}
                      className="bg-black/40 rounded-lg p-4 hover:bg-black/60 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-white">{item.label} {item.year}</p>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          {item.count} video{item.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                          style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Projects (for users) */}
          {!isAdmin && userStats.recentProjects.length > 0 && (
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
                <Video className="w-6 h-6 text-purple-400" />
                Recent Projects
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userStats.recentProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-black/40 rounded-lg p-4 hover:bg-black/60 transition-all border border-purple-500/20"
                  >
                    <h3 className="font-bold text-white mb-1 truncate">{proj.name}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(proj.createdAt).toLocaleDateString()} •{" "}
                      <span className="capitalize text-purple-400">{proj.type}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change }: {
  icon: React.ReactNode; label: string; value: string; change: string | null;
}) {
  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
          {icon}
        </div>
        {change && (
          <span className="flex items-center gap-1 text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
