import {
  ArrowLeft,
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const stats = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      icon: Users,
      color: "from-blue-600 to-cyan-600",
    },
    {
      title: "Videos Processed",
      value: "5,678",
      change: "+23%",
      icon: Video,
      color: "from-purple-600 to-pink-600",
    },
    {
      title: "Total Downloads",
      value: "3,456",
      change: "+8%",
      icon: Download,
      color: "from-green-600 to-emerald-600",
    },
    {
      title: "Active Users",
      value: "890",
      change: "+15%",
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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all hover:border-purple-500/60"
                  key={index}
                >
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
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <h2 className="mb-4 font-bold text-xl">Reports Coming Soon</h2>
            <p className="text-gray-400">
              Advanced reporting features will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
