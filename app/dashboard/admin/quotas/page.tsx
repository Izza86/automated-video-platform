import { ArrowLeft, Clock, Database, HardDrive, Video, Users, FileVideo, Activity } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";
import { getAdminAnalytics } from "@/server/admin-activity";
import { getAllUsers } from "@/server/users";
import { getAllSubscriptions, getSubscriptionStats } from "@/server/admin-subscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function QuotasPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch dynamic data
  const [analytics, { users }, subscriptions, subscriptionStats] = await Promise.all([
    getAdminAnalytics(),
    getAllUsers(),
    getAllSubscriptions(),
    getSubscriptionStats(),
  ]);

  // Calculate usage percentages
  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.emailVerified).length;
  const activeSubscriptions = subscriptionStats.activeSubscriptions;
  
  // Calculate storage estimates (mock calculations based on projects)
  const estimatedStorageUsed = analytics.totalProjects * 50; // ~50MB per project average
  const storageLimit = 100000; // 100GB in MB
  const storagePercentage = Math.min((estimatedStorageUsed / storageLimit) * 100, 100);

  const quotaTypes = [
    {
      title: "User Storage",
      current: `${Math.round(estimatedStorageUsed / 1024)} GB`,
      max: `${Math.round(storageLimit / 1024)} GB`,
      used: estimatedStorageUsed,
      limit: storageLimit,
      percentage: storagePercentage,
      icon: HardDrive,
      color: "from-blue-600 to-cyan-600",
      description: "Total storage used across all users",
    },
    {
      title: "Video Processing",
      current: `${analytics.totalVideos} videos`,
      max: "Unlimited",
      used: analytics.totalVideos,
      limit: 10000,
      percentage: Math.min((analytics.totalVideos / 10000) * 100, 100),
      icon: Video,
      color: "from-purple-600 to-pink-600",
      description: "Total videos uploaded to platform",
    },
    {
      title: "Active Users",
      current: `${verifiedUsers} verified`,
      max: `${totalUsers} total`,
      used: verifiedUsers,
      limit: totalUsers,
      percentage: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
      icon: Users,
      color: "from-green-600 to-emerald-600",
      description: "Email verified users vs total users",
    },
    {
      title: "Subscriptions",
      current: `${activeSubscriptions} active`,
      max: `${subscriptions.length} total`,
      used: activeSubscriptions,
      limit: subscriptions.length || 1,
      percentage: subscriptions.length > 0 ? (activeSubscriptions / subscriptions.length) * 100 : 0,
      icon: Database,
      color: "from-orange-600 to-red-600",
      description: "Active paying subscriptions",
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
                System Quotas & Usage
              </h1>
              <p className="mt-2 text-gray-400">
                Monitor platform usage and resource allocation
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
                <p className="text-xs text-gray-500">{verifiedUsers} verified</p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  Total Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalVideos.toLocaleString()}</div>
                <p className="text-xs text-gray-500">{analytics.totalProjects} projects</p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.recentActivityCount.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Active Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSubscriptions.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Paying customers</p>
              </CardContent>
            </Card>
          </div>

          {/* Quota Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {quotaTypes.map((quota, index) => {
              const Icon = quota.icon;
              return (
                <Card
                  key={index}
                  className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] transition-all hover:border-purple-500/60"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg bg-gradient-to-r ${quota.color} flex items-center justify-center`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{quota.title}</CardTitle>
                          <CardDescription>{quota.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-gray-400">
                          Used: <span className="text-white font-medium">{quota.current}</span>
                        </span>
                        <span className="text-gray-400">
                          Limit: <span className="text-white font-medium">{quota.max}</span>
                        </span>
                      </div>
                      <Progress 
                        value={quota.percentage} 
                        className="h-3 bg-black/40"
                      />
                      <p className="mt-1 text-xs text-gray-500 text-right">
                        {Math.round(quota.percentage)}% utilized
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full border-purple-500/30 hover:bg-purple-500/10"
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
            <CardHeader>
              <CardTitle>Plan Configuration</CardTitle>
              <CardDescription>Manage subscription plan limits and features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                Configure storage limits, video processing quotas, and feature access for each subscription tier.
              </p>
              <div className="flex gap-3">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                  Configure Plans
                </Button>
                <Button variant="outline" className="border-purple-500/30 hover:bg-purple-500/10">
                  View Plan Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
