import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  UploadCloud, Video, Sparkles, Shield, Users, Folder, FileVideo, BarChart3, Plus, Activity, Server, Database, CheckCircle, Clock, CreditCard
} from 'lucide-react';
import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { UsersTable } from "@/components/users-table";
import { cn } from "@/lib/utils";
import { getAdminDashboardStats, getUserDashboardStats } from "@/server/dashboard";

// Revalidate every 30 seconds for fresh data
export const revalidate = 30;
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const auth = await getCurrentUser();

  if (!auth || !auth.currentUser) {
    redirect("/login");
  }

  const { currentUser } = auth;
  const isAdmin = currentUser.role === 'admin';

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
function AdminDashboard({ currentUser, stats }: { currentUser: any; stats: Awaited<ReturnType<typeof getAdminDashboardStats>> }) {
  return (
    <>
      <div className="pt-16">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border border-purple-500/30 rounded-2xl p-4 sm:p-6">
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 flex items-center gap-3">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                  Welcome back, {currentUser.name}!
                </h1>
                <p className="text-sm sm:text-base text-gray-400">Here&apos;s what&apos;s happening with your platform today</p>
              </div>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-purple-500/30">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">All Systems Operational</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Admin Overview — REAL DATA */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  ADMIN OVERVIEW
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <StatCircleCard
                    label="Total Users"
                    value={stats.totalUsers}
                    subtitle={`${stats.newUsersThisMonth} new this month`}
                    gradientId="gradient1"
                    colorFrom="#06b6d4"
                    colorTo="#3b82f6"
                    percentage={90}
                    icon={<Users className="w-5 h-5 text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />}
                  />
                  <StatCircleCard
                    label="Total Projects"
                    value={stats.totalProjects}
                    subtitle={`${stats.videosThisMonth} videos this month`}
                    gradientId="gradient2"
                    colorFrom="#8b5cf6"
                    colorTo="#6366f1"
                    percentage={stats.totalProjects > 0 ? 50 : 0}
                    icon={<Folder className="w-5 h-5 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />}
                  />
                  <StatCircleCard
                    label="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    subtitle={`$${stats.monthlyRevenue.toFixed(0)} revenue this month`}
                    gradientId="gradient3"
                    colorFrom="#06b6d4"
                    colorTo="#8b5cf6"
                    percentage={stats.totalUsers > 0 ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}
                    icon={<CreditCard className="w-5 h-5 text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <QuickStatCard icon={<Server className="w-5 h-5 text-blue-400" />} value={stats.videosThisMonth.toLocaleString()} label="Videos This Month" color="blue" />
                <QuickStatCard icon={<Database className="w-5 h-5 text-purple-400" />} value={stats.totalProjects.toLocaleString()} label="Total Projects" color="purple" />
                <QuickStatCard icon={<Activity className="w-5 h-5 text-pink-400" />} value={stats.activeSessions.toLocaleString()} label="Active Sessions" color="pink" />
                <QuickStatCard icon={<Clock className="w-5 h-5 text-cyan-400" />} value={stats.newUsersThisMonth.toLocaleString()} label="New Users (Month)" color="cyan" />
              </div>

              {/* Admin Panel — Users Table */}
              <div className="bg-yellow-900/10 border border-yellow-600/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg sm:text-xl font-bold">Admin Panel</h2>
                </div>
                <div className="bg-black/40 rounded-xl border border-yellow-600/20 p-4 sm:p-6 overflow-x-auto">
                  <h3 className="text-lg font-semibold mb-4">All Registered Users</h3>
                  <UsersTable />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  Platform Summary
                </h2>
                <div className="space-y-3">
                  <SummaryRow label="Total Users" value={stats.totalUsers} />
                  <SummaryRow label="Active Subscriptions" value={stats.activeSubscriptions} />
                  <SummaryRow label="Videos This Month" value={stats.videosThisMonth} />
                  <SummaryRow label="Revenue This Month" value={`$${stats.monthlyRevenue.toFixed(2)}`} />
                  <SummaryRow label="New Users This Month" value={stats.newUsersThisMonth} />
                  <SummaryRow label="Active Sessions" value={stats.activeSessions} />
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
function StatCircleCard({ label, value, subtitle, gradientId, colorFrom, colorTo, percentage, icon }: {
  label: string; value: number; subtitle: string; gradientId: string;
  colorFrom: string; colorTo: string; percentage: number; icon: React.ReactNode;
}) {
  const dashoffset = 351.858 - (351.858 * Math.min(percentage, 100)) / 100;
  return (
    <div className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
      <div className="absolute top-4 right-4">{icon}</div>
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="8" fill="none" />
            <circle cx="64" cy="64" r="56" stroke={`url(#${gradientId})`} strokeWidth="8" fill="none"
              strokeDasharray="351.858" strokeDashoffset={dashoffset} strokeLinecap="round" />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colorFrom} />
                <stop offset="100%" stopColor={colorTo} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">{value.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickStatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br from-${color}-900/20 to-${color}-800/10 border border-${color}-500/30 rounded-xl p-4 hover:border-${color}-500/60 transition-all cursor-pointer group`}>
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 flex items-center justify-between hover:border-purple-500/50 transition-all">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  );
}

// User Dashboard Component
function UserDashboard({ currentUser, stats }: { currentUser: any; stats: Awaited<ReturnType<typeof getUserDashboardStats>> }) {

  return (
    <>
      <div className="pt-16">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border border-purple-500/30 rounded-2xl p-4 sm:p-6 lg:p-8">
            <div className="relative">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                Welcome back, {currentUser.name}!
              </h1>
              <p className="text-gray-300 text-base sm:text-lg">Create amazing videos with AI-powered editing</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/dashboard/templates">
              <button className="w-full group relative bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/40 rounded-xl p-6 hover:border-purple-500/80 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <Folder className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <FileVideo className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">Templates</h3>
                <p className="text-gray-400 text-sm">Browse video templates</p>
              </button>
            </Link>

            <Link href="/dashboard/upload-edit">
              <button className="w-full group relative bg-gradient-to-br from-cyan-600/20 to-cyan-800/10 border border-cyan-500/40 rounded-xl p-6 hover:border-cyan-500/80 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <UploadCloud className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <UploadCloud className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">Upload & Edit</h3>
                <p className="text-gray-400 text-sm">Apply ref video edits to target</p>
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Projects Section */}
            <div className="lg:col-span-8 space-y-6">
              {/* Stats Cards — REAL DATA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/60 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Folder className="w-6 h-6 text-blue-400" />
                    <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">Total</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
                  <p className="text-xs text-gray-400 mt-1">Projects</p>
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-4 hover:border-green-500/60 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Done</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.videosCreatedThisMonth}</p>
                  <p className="text-xs text-gray-400 mt-1">Videos Created</p>
                </div>

                <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Video className="w-6 h-6 text-purple-400" />
                    <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">Month</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.videosCreatedThisMonth}</p>
                  <p className="text-xs text-gray-400 mt-1">Videos This Month</p>
                </div>
              </div>

              {/* Recent Projects — REAL DATA */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <FileVideo className="w-6 h-6 text-purple-400" />
                    My Projects
                  </h2>
                  <Link href="/dashboard/upload-edit">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </Link>
                </div>

                {stats.recentProjects.length === 0 ? (
                  <div className="bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-8 text-center">
                    <FileVideo className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-400 mb-2">No projects yet</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload a video to get started with AI-powered editing</p>
                    <Link href="/dashboard/upload-edit">
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Upload Your First Video
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {stats.recentProjects.map((project) => (
                      <div
                        key={project.id}
                        className="group bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                  {project.name}
                                </h3>
                                <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30 capitalize">
                                  {project.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400">
                                Created {new Date(project.createdAt).toLocaleDateString()}
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
                      <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                        View All Projects ({stats.totalProjects})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Subscription Info */}
              {stats.subscription && (
                <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    Subscription
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Plan</span>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 capitalize">
                        {stats.subscription.planId}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <Badge className={cn(
                        "text-xs capitalize",
                        stats.subscription.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}>
                        {stats.subscription.status}
                      </Badge>
                    </div>
                  </div>
                  <Link href="/dashboard/billing" className="block mt-3">
                    <Button variant="outline" size="sm" className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                      Manage Billing
                    </Button>
                  </Link>
                </div>
              )}

              {/* Quick Tips */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Quick Tips
                </h2>
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500/60 transition-all">
                    <h3 className="text-sm font-bold text-white mb-2">AI-Powered Editing</h3>
                    <p className="text-xs text-gray-400">Upload a reference video and a target — our AI matches the editing style automatically</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500/60 transition-all">
                    <h3 className="text-sm font-bold text-white mb-2">Template Library</h3>
                    <p className="text-xs text-gray-400">Browse professional templates to get started quickly</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/60 transition-all">
                    <h3 className="text-sm font-bold text-white mb-2">Video Analytics</h3>
                    <p className="text-xs text-gray-400">Track your usage and processing stats in the analytics dashboard</p>
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
