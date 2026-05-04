import {
  ArrowLeft,
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Video,
  Activity,
  DollarSign,
  FileVideo,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/users";
import { getAdminAnalytics } from "@/server/admin-activity";
import { getSubscriptionStats } from "@/server/admin-subscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch dynamic data
  const [analytics, subscriptionStats] = await Promise.all([
    getAdminAnalytics(),
    getSubscriptionStats(),
  ]);

  const stats = [
    {
      title: "Total Users",
      value: analytics.totalUsers.toLocaleString(),
      change: "+" + analytics.userGrowth.length,
      icon: Users,
      color: "from-blue-600 to-cyan-600",
    },
    {
      title: "Videos Uploaded",
      value: analytics.totalVideos.toLocaleString(),
      change: "+" + analytics.recentActivityCount,
      icon: FileVideo,
      color: "from-purple-600 to-pink-600",
    },
    {
      title: "Total Projects",
      value: analytics.totalProjects.toLocaleString(),
      change: "Active",
      icon: Video,
      color: "from-green-600 to-emerald-600",
    },
    {
      title: "Active Subscriptions",
      value: subscriptionStats.activeSubscriptions.toLocaleString(),
      change: "Paying customers",
      icon: TrendingUp,
      color: "from-orange-600 to-red-600",
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
                <BarChart3 className="h-10 w-10 text-purple-400" />
                Analytics & Reports
              </h1>
              <p className="mt-2 text-gray-400">
                Detailed insights and performance metrics
              </p>
            </div>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] transition-all hover:border-purple-500/60"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div
                        className={`h-12 w-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        {stat.change}
                      </Badge>
                    </div>
                    <h3 className="mb-1 font-bold text-3xl text-white">
                      {stat.value}
                    </h3>
                    <p className="text-gray-400 text-sm">{stat.title}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Revenue Stats */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>Financial performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Monthly Recurring Revenue</span>
                  <span className="font-bold text-xl">${subscriptionStats.mrr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Annual Recurring Revenue</span>
                  <span className="font-bold text-xl">${subscriptionStats.arr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">This Month&apos;s Revenue</span>
                  <span className="font-bold text-xl">${subscriptionStats.monthlyRevenue.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-400" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Platform activity in last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-white mb-2">
                    {analytics.recentActivityCount.toLocaleString()}
                  </div>
                  <p className="text-gray-400">Total activities in last 30 days</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Distribution */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
            <CardHeader>
              <CardTitle>Subscriptions by Plan</CardTitle>
              <CardDescription>Distribution of active subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionStats.subscriptionsByPlan.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No subscription data available</p>
                ) : (
                  subscriptionStats.subscriptionsByPlan.map((plan) => (
                    <div key={plan.planName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{plan.planName}</span>
                        <span className="text-gray-400">{plan.count} users</span>
                      </div>
                      <Progress 
                        value={(plan.count / subscriptionStats.activeSubscriptions) * 100} 
                        className="h-2 bg-purple-900/30"
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
            <CardHeader>
              <CardTitle>Advanced Reports</CardTitle>
              <CardDescription>More detailed analytics coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Advanced reporting features including user retention, engagement metrics, 
                and detailed revenue breakdowns will be available in future updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
