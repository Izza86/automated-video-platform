import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Users, Video, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AnalyticsPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const stats = [
    { title: "Total Users", value: "1,234", change: "+12%", icon: Users, color: "from-blue-600 to-cyan-600" },
    { title: "Videos Processed", value: "5,678", change: "+23%", icon: Video, color: "from-purple-600 to-pink-600" },
    { title: "Total Downloads", value: "3,456", change: "+8%", icon: Download, color: "from-green-600 to-emerald-600" },
    { title: "Active Users", value: "890", change: "+15%", icon: TrendingUp, color: "from-orange-600 to-red-600" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                <BarChart3 className="w-10 h-10 text-purple-400" />
                Analytics & Reports
              </h1>
              <p className="text-gray-400 mt-2">Detailed insights and performance metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-green-500/20 text-green-400">{stat.change}</Badge>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Reports Coming Soon</h2>
            <p className="text-gray-400">Advanced reporting features will be available here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
