import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock,
  Folder,
  TrendingUp,
  Video,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getAnalyticsData, getUserDashboardStats } from "@/server/dashboard";
import { getCurrentUser } from "@/server/users";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default async function AnalyticsPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser)) {
    redirect("/login");
  }

  const { currentUser } = auth;

  const isAdmin = currentUser.role === "admin";
  const analytics = await getAnalyticsData(
    isAdmin ? undefined : currentUser.id
  );
  const userStats = await getUserDashboardStats(currentUser.id);

  // Calculate some derived stats
  const thisMonth = new Date().getMonth() + 1;
  const thisMonthData = analytics.monthlyData.find(
    (m) => m.month === thisMonth
  );
  const lastMonthData = analytics.monthlyData.find(
    (m) => m.month === thisMonth - 1
  );
  const videosThisMonth = thisMonthData?.videosCreated ?? 0;
  const videosLastMonth = lastMonthData?.videosCreated ?? 0;
  const monthlyChange =
    videosLastMonth > 0
      ? Math.round(
          ((videosThisMonth - videosLastMonth) / videosLastMonth) * 100
        )
      : 0;

  // Build chart data for last 6 months
  const now = new Date();
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: MONTH_NAMES[d.getMonth()],
    };
  });

  const chartData = chartMonths.map((cm) => {
    const found = analytics.monthlyData.find(
      (m) => m.month === cm.month && m.year === cm.year
    );
    return { ...cm, count: found?.videosCreated ?? 0 };
  });

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="flex items-center gap-3 font-bold text-2xl sm:text-4xl">
                  <Activity className="h-8 w-8 text-purple-400 sm:h-10 sm:w-10" />
                  Analytics Dashboard
                </h1>
                <p className="mt-2 text-gray-400">
                  {isAdmin
                    ? "Platform-wide video analytics"
                    : "Track your video creation and usage"}
                </p>
              </div>
              <Badge className="border-green-500/30 bg-green-500/20 px-4 py-2 text-green-400">
                Live Data
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <StatCard
              change={null}
              icon={<Video className="h-6 w-6 text-purple-400" />}
              label="Total Videos"
              value={analytics.totalVideos.toLocaleString()}
            />
            <StatCard
              change={
                monthlyChange !== 0
                  ? `${monthlyChange > 0 ? "+" : ""}${monthlyChange}%`
                  : null
              }
              icon={<TrendingUp className="h-6 w-6 text-cyan-400" />}
              label="This Month"
              value={videosThisMonth.toLocaleString()}
            />
            <StatCard
              change={null}
              icon={<Folder className="h-6 w-6 text-pink-400" />}
              label="Total Projects"
              value={
                isAdmin
                  ? analytics.totalVideos.toLocaleString()
                  : userStats.totalProjects.toLocaleString()
              }
            />
            <StatCard
              change={null}
              icon={<Clock className="h-6 w-6 text-green-400" />}
              label="Last Month"
              value={videosLastMonth.toLocaleString()}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Monthly Chart */}
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 lg:col-span-2">
              <h2 className="mb-6 flex items-center gap-2 font-bold text-xl sm:text-2xl">
                <BarChart3 className="h-6 w-6 text-cyan-400" />
                Videos Created (Last 6 Months)
              </h2>
              {chartData.every((d) => d.count === 0) ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-gray-500">
                    No video data yet. Start creating videos to see analytics.
                  </p>
                </div>
              ) : (
                <div className="flex h-64 items-end justify-around gap-3">
                  {chartData.map((bar) => (
                    <div
                      className="flex flex-1 flex-col items-center gap-2"
                      key={`${bar.year}-${bar.month}`}
                    >
                      <span className="font-medium text-gray-400 text-xs">
                        {bar.count}
                      </span>
                      <div
                        className="min-h-[4px] w-full cursor-pointer rounded-t-lg bg-gradient-to-t from-purple-600 to-pink-600 transition-all hover:from-purple-500 hover:to-pink-500"
                        style={{
                          height: `${Math.max((bar.count / maxCount) * 100, 2)}%`,
                        }}
                      />
                      <span className="text-gray-500 text-xs">{bar.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Breakdown */}
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <h2 className="mb-6 flex items-center gap-2 font-bold text-xl sm:text-2xl">
                <Clock className="h-6 w-6 text-purple-400" />
                Monthly Breakdown
              </h2>
              <div className="space-y-4">
                {chartData.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available yet</p>
                ) : (
                  [...chartData].reverse().map((item) => (
                    <div
                      className="rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                      key={`detail-${item.year}-${item.month}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium text-sm text-white">
                          {item.label} {item.year}
                        </p>
                        <Badge className="border-purple-500/30 bg-purple-500/20 text-purple-400">
                          {item.count} video{item.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                          style={{
                            width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                          }}
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
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <h2 className="mb-6 flex items-center gap-2 font-bold text-xl sm:text-2xl">
                <Video className="h-6 w-6 text-purple-400" />
                Recent Projects
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {userStats.recentProjects.map((proj) => (
                  <div
                    className="rounded-lg border border-purple-500/20 bg-black/40 p-4 transition-all hover:bg-black/60"
                    key={proj.id}
                  >
                    <h3 className="mb-1 truncate font-bold text-white">
                      {proj.name}
                    </h3>
                    <p className="text-gray-500 text-xs">
                      {new Date(proj.createdAt).toLocaleDateString()} •{" "}
                      <span className="text-purple-400 capitalize">
                        {proj.type}
                      </span>
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

function StatCard({
  icon,
  label,
  value,
  change,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string | null;
}) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all duration-300 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20">
          {icon}
        </div>
        {change && (
          <span className="flex items-center gap-1 rounded-full bg-green-400/10 px-2 py-1 text-green-400 text-sm">
            <TrendingUp className="h-3 w-3" />
            {change}
          </span>
        )}
      </div>
      <p className="mb-1 font-bold text-3xl text-white">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}
