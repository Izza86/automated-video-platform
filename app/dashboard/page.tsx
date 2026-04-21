import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  CreditCard,
  Database,
  FileVideo,
  Folder,
  Plus,
  Server,
  Shield,
  Sparkles,
  UploadCloud,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users-table";
import { cn } from "@/lib/utils";
import {
  getAdminDashboardStats,
  getUserDashboardStats,
} from "@/server/dashboard";
import { getCurrentUser } from "@/server/users";

// Revalidate every 30 seconds for fresh data
export const revalidate = 30;
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser)) {
    redirect("/login");
  }

  const { currentUser } = auth;
  const isAdmin = currentUser.role === "admin";

  if (isAdmin) {
    const stats = await getAdminDashboardStats();
    return (
      <div className="min-h-screen bg-[#1a1408] text-white">
        <AdminDashboard currentUser={currentUser} stats={stats} />
      </div>
    );
  }

  const stats = await getUserDashboardStats(currentUser.id);
  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <UserDashboard currentUser={currentUser} stats={stats} />
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({
  currentUser,
  stats,
}: {
  currentUser: any;
  stats: Awaited<ReturnType<typeof getAdminDashboardStats>>;
}) {
  return (
    <>
      <div className="pt-16">
        <div className="space-y-6 p-4 sm:p-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 p-4 sm:p-6">
            <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="mb-2 flex items-center gap-3 font-bold text-xl sm:text-2xl lg:text-3xl">
                  <Shield className="h-6 w-6 text-purple-400 sm:h-8 sm:w-8" />
                  Welcome back, {currentUser.name}!
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  Here&apos;s what&apos;s happening with your platform today
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-black/40 px-3 py-2 backdrop-blur-sm sm:px-4">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-gray-300 text-sm">
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {/* Admin Overview — REAL DATA */}
              <div>
                <h2 className="mb-6 flex items-center gap-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-bold text-transparent text-xl sm:text-2xl">
                  <BarChart3 className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                  ADMIN OVERVIEW
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  <StatCircleCard
                    colorFrom="#06b6d4"
                    colorTo="#3b82f6"
                    gradientId="gradient1"
                    icon={
                      <Users className="h-5 w-5 text-cyan-400 opacity-50 transition-opacity group-hover:opacity-100" />
                    }
                    label="Total Users"
                    percentage={90}
                    subtitle={`${stats.newUsersThisMonth} new this month`}
                    value={stats.totalUsers}
                  />
                  <StatCircleCard
                    colorFrom="#8b5cf6"
                    colorTo="#6366f1"
                    gradientId="gradient2"
                    icon={
                      <Folder className="h-5 w-5 text-purple-400 opacity-50 transition-opacity group-hover:opacity-100" />
                    }
                    label="Total Projects"
                    percentage={stats.totalProjects > 0 ? 50 : 0}
                    subtitle={`${stats.videosThisMonth} videos this month`}
                    value={stats.totalProjects}
                  />
                  <StatCircleCard
                    colorFrom="#06b6d4"
                    colorTo="#8b5cf6"
                    gradientId="gradient3"
                    icon={
                      <CreditCard className="h-5 w-5 text-cyan-400 opacity-50 transition-opacity group-hover:opacity-100" />
                    }
                    label="Active Subscriptions"
                    percentage={
                      stats.totalUsers > 0
                        ? Math.round(
                            (stats.activeSubscriptions / stats.totalUsers) * 100
                          )
                        : 0
                    }
                    subtitle={`$${stats.monthlyRevenue.toFixed(0)} revenue this month`}
                    value={stats.activeSubscriptions}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <QuickStatCard
                  color="blue"
                  icon={<Server className="h-5 w-5 text-blue-400" />}
                  label="Videos This Month"
                  value={stats.videosThisMonth.toLocaleString()}
                />
                <QuickStatCard
                  color="purple"
                  icon={<Database className="h-5 w-5 text-purple-400" />}
                  label="Total Projects"
                  value={stats.totalProjects.toLocaleString()}
                />
                <QuickStatCard
                  color="pink"
                  icon={<Activity className="h-5 w-5 text-pink-400" />}
                  label="Active Sessions"
                  value={stats.activeSessions.toLocaleString()}
                />
                <QuickStatCard
                  color="cyan"
                  icon={<Clock className="h-5 w-5 text-cyan-400" />}
                  label="New Users (Month)"
                  value={stats.newUsersThisMonth.toLocaleString()}
                />
              </div>

              {/* Admin Panel — Users Table */}
              <div className="rounded-xl border border-yellow-600/30 bg-yellow-900/10 p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-400" />
                  <h2 className="font-bold text-lg sm:text-xl">Admin Panel</h2>
                </div>
                <div className="overflow-x-auto rounded-xl border border-yellow-600/20 bg-black/40 p-4 sm:p-6">
                  <h3 className="mb-4 font-semibold text-lg">
                    All Registered Users
                  </h3>
                  <UsersTable />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 lg:col-span-4">
              <div>
                <h2 className="mb-4 flex items-center gap-2 font-bold text-lg sm:text-xl">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                  Platform Summary
                </h2>
                <div className="space-y-3">
                  <SummaryRow label="Total Users" value={stats.totalUsers} />
                  <SummaryRow
                    label="Active Subscriptions"
                    value={stats.activeSubscriptions}
                  />
                  <SummaryRow
                    label="Videos This Month"
                    value={stats.videosThisMonth}
                  />
                  <SummaryRow
                    label="Revenue This Month"
                    value={`$${stats.monthlyRevenue.toFixed(2)}`}
                  />
                  <SummaryRow
                    label="New Users This Month"
                    value={stats.newUsersThisMonth}
                  />
                  <SummaryRow
                    label="Active Sessions"
                    value={stats.activeSessions}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Reusable circle stat card
function StatCircleCard({
  label,
  value,
  subtitle,
  gradientId,
  colorFrom,
  colorTo,
  percentage,
  icon,
}: {
  label: string;
  value: number;
  subtitle: string;
  gradientId: string;
  colorFrom: string;
  colorTo: string;
  percentage: number;
  icon: React.ReactNode;
}) {
  const dashoffset = 351.858 - (351.858 * Math.min(percentage, 100)) / 100;
  return (
    <div className="group relative cursor-pointer rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all duration-300 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20">
      <div className="absolute top-4 right-4">{icon}</div>
      <div className="flex flex-col items-center justify-center">
        <div className="relative mb-4 h-32 w-32">
          <svg className="-rotate-90 h-full w-full transform">
            <circle
              cx="64"
              cy="64"
              fill="none"
              r="56"
              stroke="rgba(139, 92, 246, 0.2)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              fill="none"
              r="56"
              stroke={`url(#${gradientId})`}
              strokeDasharray="351.858"
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              strokeWidth="8"
            />
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                x2="100%"
                y1="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={colorFrom} />
                <stop offset="100%" stopColor={colorTo} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-3xl text-white transition-transform group-hover:scale-110">
              {value.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="font-medium text-gray-400 text-sm">{label}</p>
        <p className="mt-1 text-gray-500 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickStatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br from-${color}-900/20 to-${color}-800/10 border border-${color}-500/30 rounded-xl p-4 hover:border-${color}-500/60 group cursor-pointer transition-all`}
    >
      <div className="mb-2 flex items-center justify-between">{icon}</div>
      <p className="font-bold text-2xl text-white transition-transform group-hover:scale-105">
        {value}
      </p>
      <p className="mt-1 text-gray-400 text-xs">{label}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-purple-900/30 bg-[#1a1a1a] p-3 transition-all hover:border-purple-500/50">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="font-bold text-sm text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// User Dashboard Component
function UserDashboard({
  currentUser,
  stats,
}: {
  currentUser: any;
  stats: Awaited<ReturnType<typeof getUserDashboardStats>>;
}) {
  return (
    <>
      <div className="pt-16">
        <div className="space-y-6 p-4 sm:p-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 p-4 sm:p-6 lg:p-8">
            <div className="relative">
              <h1 className="mb-2 flex items-center gap-3 font-bold text-2xl sm:text-3xl lg:text-4xl">
                <Sparkles className="h-8 w-8 text-purple-400 sm:h-10 sm:w-10" />
                Welcome back, {currentUser.name}!
              </h1>
              <p className="text-base text-gray-300 sm:text-lg">
                Create amazing videos with AI-powered editing
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link href="/dashboard/templates">
              <button className="group relative w-full rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-600/20 to-purple-800/10 p-6 transition-all duration-300 hover:border-purple-500/80 hover:shadow-lg hover:shadow-purple-500/20">
                <div className="absolute top-4 right-4">
                  <Folder className="h-6 w-6 text-purple-400 transition-transform group-hover:scale-110" />
                </div>
                <FileVideo className="mb-4 h-12 w-12 text-purple-400 transition-transform group-hover:scale-110" />
                <h3 className="mb-2 font-bold text-white text-xl">Templates</h3>
                <p className="text-gray-400 text-sm">Browse video templates</p>
              </button>
            </Link>

            <Link href="/dashboard/upload-edit">
              <button className="group relative w-full rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-600/20 to-cyan-800/10 p-6 transition-all duration-300 hover:border-cyan-500/80 hover:shadow-cyan-500/20 hover:shadow-lg">
                <div className="absolute top-4 right-4">
                  <UploadCloud className="h-6 w-6 text-cyan-400 transition-transform group-hover:scale-110" />
                </div>
                <UploadCloud className="mb-4 h-12 w-12 text-cyan-400 transition-transform group-hover:scale-110" />
                <h3 className="mb-2 font-bold text-white text-xl">
                  Upload & Edit
                </h3>
                <p className="text-gray-400 text-sm">
                  Apply ref video edits to target
                </p>
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Projects Section */}
            <div className="space-y-6 lg:col-span-8">
              {/* Stats Cards — REAL DATA */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-4 transition-all hover:border-blue-500/60">
                  <div className="mb-2 flex items-center justify-between">
                    <Folder className="h-6 w-6 text-blue-400" />
                    <span className="rounded-full bg-blue-400/10 px-2 py-1 text-blue-400 text-xs">
                      Total
                    </span>
                  </div>
                  <p className="font-bold text-3xl text-white">
                    {stats.totalProjects}
                  </p>
                  <p className="mt-1 text-gray-400 text-xs">Projects</p>
                </div>

                <div className="rounded-xl border border-green-500/30 bg-gradient-to-br from-green-900/20 to-green-800/10 p-4 transition-all hover:border-green-500/60">
                  <div className="mb-2 flex items-center justify-between">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <span className="rounded-full bg-green-400/10 px-2 py-1 text-green-400 text-xs">
                      Done
                    </span>
                  </div>
                  <p className="font-bold text-3xl text-white">
                    {stats.videosCreatedThisMonth}
                  </p>
                  <p className="mt-1 text-gray-400 text-xs">Videos Created</p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4 transition-all hover:border-purple-500/60">
                  <div className="mb-2 flex items-center justify-between">
                    <Video className="h-6 w-6 text-purple-400" />
                    <span className="rounded-full bg-purple-400/10 px-2 py-1 text-purple-400 text-xs">
                      Month
                    </span>
                  </div>
                  <p className="font-bold text-3xl text-white">
                    {stats.videosCreatedThisMonth}
                  </p>
                  <p className="mt-1 text-gray-400 text-xs">
                    Videos This Month
                  </p>
                </div>
              </div>

              {/* Recent Projects — REAL DATA */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold text-2xl">
                    <FileVideo className="h-6 w-6 text-purple-400" />
                    My Projects
                  </h2>
                  <Link href="/dashboard/upload-edit">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                  </Link>
                </div>

                {stats.recentProjects.length === 0 ? (
                  <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1e] p-8 text-center">
                    <FileVideo className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                    <h3 className="mb-2 font-bold text-gray-400 text-lg">
                      No projects yet
                    </h3>
                    <p className="mb-4 text-gray-500 text-sm">
                      Upload a video to get started with AI-powered editing
                    </p>
                    <Link href="/dashboard/upload-edit">
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload Your First Video
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {stats.recentProjects.map((project) => (
                      <div
                        className="group cursor-pointer rounded-xl border border-purple-500/30 bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1e] p-4 transition-all duration-300 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20"
                        key={project.id}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-bold text-lg text-white transition-colors group-hover:text-purple-400">
                                  {project.name}
                                </h3>
                                <Badge className="border-purple-500/30 bg-purple-500/20 text-purple-400 text-xs capitalize">
                                  {project.type}
                                </Badge>
                              </div>
                              <p className="text-gray-400 text-sm">
                                Created{" "}
                                {new Date(
                                  project.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {stats.totalProjects > 5 && (
                  <div className="mt-4 text-center">
                    <Link href="/dashboard/my-projects">
                      <Button
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        variant="outline"
                      >
                        View All Projects ({stats.totalProjects})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              {/* Subscription Info */}
              {stats.subscription && (
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4">
                  <h2 className="mb-3 flex items-center gap-2 font-bold text-lg">
                    <CreditCard className="h-5 w-5 text-purple-400" />
                    Subscription
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Plan</span>
                      <Badge className="border-purple-500/30 bg-purple-500/20 text-purple-400 capitalize">
                        {stats.subscription.planId}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Status</span>
                      <Badge
                        className={cn(
                          "text-xs capitalize",
                          stats.subscription.status === "active"
                            ? "border-green-500/30 bg-green-500/20 text-green-400"
                            : "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                        )}
                      >
                        {stats.subscription.status}
                      </Badge>
                    </div>
                  </div>
                  <Link className="mt-3 block" href="/dashboard/billing">
                    <Button
                      className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      size="sm"
                      variant="outline"
                    >
                      Manage Billing
                    </Button>
                  </Link>
                </div>
              )}

              {/* Quick Tips */}
              <div>
                <h2 className="mb-4 flex items-center gap-2 font-bold text-xl">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  Quick Tips
                </h2>
                <div className="space-y-3">
                  <div className="rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 p-4 transition-all hover:border-yellow-500/60">
                    <h3 className="mb-2 font-bold text-sm text-white">
                      AI-Powered Editing
                    </h3>
                    <p className="text-gray-400 text-xs">
                      Upload a reference video and a target — our AI matches the
                      editing style automatically
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-4 transition-all hover:border-blue-500/60">
                    <h3 className="mb-2 font-bold text-sm text-white">
                      Template Library
                    </h3>
                    <p className="text-gray-400 text-xs">
                      Browse professional templates to get started quickly
                    </p>
                  </div>

                  <div className="rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4 transition-all hover:border-purple-500/60">
                    <h3 className="mb-2 font-bold text-sm text-white">
                      Video Analytics
                    </h3>
                    <p className="text-gray-400 text-xs">
                      Track your usage and processing stats in the analytics
                      dashboard
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
