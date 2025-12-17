import Link from "next/link";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadCloud, Video, Sparkles, User, Shield, Users, Settings, UserCircle, Lock, Eye, Home, Folder, FileVideo, BarChart3, Bell, Search, Plus, Mic, TrendingUp, Activity, Server, Database, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { getCurrentUser } from "@/server/users";
import { Badge } from "@/components/ui/badge";
import { UsersTable } from "@/components/users-table";
import { cn } from "@/lib/utils";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { count } from "drizzle-orm";

// Revalidate every 30 seconds for fresh data
export const revalidate = 30;

export default async function Dashboard() {
  const { currentUser } = await getCurrentUser();
  const organizations: any[] = [];
  const isAdmin = currentUser.role === 'admin';

  // Admin overview metrics - Get actual data
  let totalUsers = 0;
  try {
    const [userCountResult] = await db.select({ count: count() }).from(user);
    totalUsers = userCountResult.count;
  } catch (error) {
    console.error('Error fetching user count:', error);
  }
  
  const activeProjects = 0;
  const cpuUsage = 45;
  const memoryUsage = 62;
  const diskUsage = 38;
  const apiRequests = 12847;
  const activeUsers = Math.floor(totalUsers * 0.23);

  // Recent admin actions
  const recentActions = [
    { id: 1, action: "Blocked user 'spam_bot'", user: "Admin", time: "2m ago", type: "warning" },
    { id: 2, action: "Updated 'Enterprise' plan limits", user: "SuperAdmin", time: "15m ago", type: "success" },
    { id: 3, action: "Deployed new API version", user: "DevOps", time: "1h ago", type: "info" },
    { id: 4, action: "Database backup completed", user: "System", time: "2h ago", type: "success" },
  ];

  // System health metrics
  const systemHealth = [
    { name: "API Server", status: "operational", uptime: "99.9%" },
    { name: "Database", status: "operational", uptime: "99.8%" },
    { name: "Queue Service", status: "degraded", uptime: "98.2%" },
    { name: "Storage", status: "operational", uptime: "100%" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {isAdmin ? (
        // ADMIN DASHBOARD
        <AdminDashboard 
          currentUser={currentUser}
          totalUsers={totalUsers}
          activeProjects={activeProjects}
          cpuUsage={cpuUsage}
          memoryUsage={memoryUsage}
          diskUsage={diskUsage}
          apiRequests={apiRequests}
          activeUsers={activeUsers}
          recentActions={recentActions}
          systemHealth={systemHealth}
        />
      ) : (
        // USER DASHBOARD
        <UserDashboard currentUser={currentUser} />
      )}
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ currentUser, totalUsers, activeProjects, cpuUsage, memoryUsage, diskUsage, apiRequests, activeUsers, recentActions, systemHealth }: any) {
  return (
    <>
      {/* Main Content */}
      <div className="pt-16">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border border-purple-500/30 rounded-2xl p-4 sm:p-6">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM4YjVjZjYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 flex items-center gap-3">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-pulse" />
                  Welcome back, {currentUser.name}!
                </h1>
                <p className="text-sm sm:text-base text-gray-400">Here's what's happening with your platform today</p>
              </div>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-purple-500/30">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">All Systems Operational</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Admin Overview */}
            <div className="lg:col-span-8 space-y-6">
              {/* Admin Overview Metrics */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  ADMIN OVERVIEW
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Total Users */}
                  <div className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
                    <div className="absolute top-4 right-4">
                      <Users className="w-5 h-5 text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="rgba(139, 92, 246, 0.2)"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#gradient1)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="351.858"
                            strokeDashoffset="35"
                            strokeLinecap="round"
                            className="animate-pulse"
                          />
                          <defs>
                            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">{totalUsers.toLocaleString()}</span>
                          <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3" />
                            +12%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Total Users</p>
                      <p className="text-xs text-gray-500 mt-1">{activeUsers} active now</p>
                    </div>
                  </div>

                  {/* Active Projects */}
                  <div className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
                    <div className="absolute top-4 right-4">
                      <Folder className="w-5 h-5 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="rgba(139, 92, 246, 0.2)"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#gradient2)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="351.858"
                            strokeDashoffset="175"
                            strokeLinecap="round"
                            className="animate-pulse"
                          />
                          <defs>
                            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">{activeProjects.toLocaleString()}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Activity className="w-3 h-3" />
                            0%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Active Projects</p>
                      <p className="text-xs text-gray-500 mt-1">0 in queue</p>
                    </div>
                  </div>

                  {/* CPU Usage */}
                  <div className="group relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
                    <div className="absolute top-4 right-4">
                      <Zap className="w-5 h-5 text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="rgba(139, 92, 246, 0.2)"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#gradient3)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="351.858"
                            strokeDashoffset={351.858 - (351.858 * cpuUsage) / 100}
                            strokeLinecap="round"
                            className="animate-pulse"
                          />
                          <defs>
                            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">{cpuUsage}%</span>
                          <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3" />
                            Optimal
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">CPU Usage Load</p>
                      <p className="text-xs text-gray-500 mt-1">Mem: {memoryUsage}% | Disk: {diskUsage}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/60 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+5.2%</span>
                  </div>
                  <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">{apiRequests.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">API Requests</p>
                </div>

                <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">99.9%</span>
                  </div>
                  <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">2.4GB</p>
                  <p className="text-xs text-gray-400 mt-1">Database Size</p>
                </div>

                <div className="bg-gradient-to-br from-pink-900/20 to-pink-800/10 border border-pink-500/30 rounded-xl p-4 hover:border-pink-500/60 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-pink-400" />
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">Live</span>
                  </div>
                  <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">{activeUsers}</p>
                  <p className="text-xs text-gray-400 mt-1">Active Sessions</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-500/60 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">99.8%</span>
                  </div>
                  <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">24.5d</p>
                  <p className="text-xs text-gray-400 mt-1">Avg Uptime</p>
                </div>
              </div>

              {/* Admin Panel */}
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

            {/* Right Column - System Health & Activity */}
            <div className="lg:col-span-4 space-y-6">
              {/* Server Health */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-green-400" />
                  Server Health
                </h2>
                <div className="space-y-3">
                  {systemHealth.map((service) => (
                    <div key={service.name} className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {service.status === "operational" ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-400 animate-pulse" />
                          )}
                          <span className="text-sm font-medium text-white">{service.name}</span>
                        </div>
                        <Badge 
                          className={cn(
                            "text-xs",
                            service.status === "operational" 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          )}
                        >
                          {service.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              service.status === "operational" ? "bg-green-500" : "bg-yellow-500"
                            )}
                            style={{ width: service.uptime }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">{service.uptime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Admin Actions */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Recent Actions
                </h2>
                <div className="space-y-3">
                  {recentActions.map((item) => (
                    <div key={item.id} className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all group">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          item.type === "warning" && "bg-yellow-500/20",
                          item.type === "success" && "bg-green-500/20",
                          item.type === "info" && "bg-blue-500/20"
                        )}>
                          {item.type === "warning" && <AlertCircle className="w-4 h-4 text-yellow-400" />}
                          {item.type === "success" && <CheckCircle className="w-4 h-4 text-green-400" />}
                          {item.type === "info" && <Activity className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium group-hover:text-purple-400 transition-colors">{item.action}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{item.user}</span>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">{item.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-pink-400" />
                  Activity Feed
                </h2>
                <div className="space-y-3">
                  <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium">Production Team</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">joined "Product Launch"</p>
                    <p className="text-xs text-gray-500 ml-8 mt-1">2 hours ago</p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium">New video processed</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">Campaign video #47 completed</p>
                    <p className="text-xs text-gray-500 ml-8 mt-1">3 hours ago</p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium">System Update</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">Platform upgraded to v2.4.1</p>
                    <p className="text-xs text-gray-500 ml-8 mt-1">5 hours ago</p>
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

// User Dashboard Component
function UserDashboard({ currentUser }: any) {
  const userProjects = [
    { id: 1, title: "My First Video", status: "draft", thumbnail: "https://placehold.co/400x225/8b5cf6/ffffff?text=Video+1", progress: 0, duration: "0:00" },
    { id: 2, title: "Product Demo", status: "processing", thumbnail: "https://placehold.co/400x225/6366f1/ffffff?text=Video+2", progress: 65, duration: "2:45" },
    { id: 3, title: "Tutorial Video", status: "completed", thumbnail: "https://placehold.co/400x225/8b5cf6/ffffff?text=Video+3", progress: 100, duration: "5:30" },
  ];

  return (
    <>
      {/* Main Content */}
      <div className="pt-16">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border border-purple-500/30 rounded-2xl p-4 sm:p-6 lg:p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM4YjVjZjYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
            <div className="relative">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 animate-pulse" />
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
                <p className="text-gray-400 text-sm">Browse 20+ video templates</p>
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
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/60 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Folder className="w-6 h-6 text-blue-400" />
                    <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">Total</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{userProjects.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Projects</p>
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-4 hover:border-green-500/60 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Done</span>
                  </div>
                  <p className="text-3xl font-bold text-white">1</p>
                  <p className="text-xs text-gray-400 mt-1">Completed</p>
                </div>

                <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-6 h-6 text-purple-400" />
                    <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">Active</span>
                  </div>
                  <p className="text-3xl font-bold text-white">1</p>
                  <p className="text-xs text-gray-400 mt-1">In Progress</p>
                </div>
              </div>

              {/* Recent Projects */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <FileVideo className="w-6 h-6 text-purple-400" />
                    My Projects
                  </h2>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {userProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex gap-4">
                        <div className="relative w-48 h-28 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={project.thumbnail}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {project.status === "processing" && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Activity className="w-6 h-6 text-purple-400 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                {project.title}
                              </h3>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  project.status === "completed" && "bg-green-500/20 text-green-400 border-green-500/30",
                                  project.status === "processing" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                                  project.status === "draft" && "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                )}
                              >
                                {project.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">Duration: {project.duration}</p>
                          </div>

                          {project.status === "processing" && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400">Processing</span>
                                <span className="text-xs text-purple-400 font-medium">{project.progress}%</span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                                  style={{ width: `${project.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-span-4 space-y-6">
              {/* Quick Tips */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Quick Tips
                </h2>
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500/60 transition-all">
                    <h3 className="text-sm font-bold text-white mb-2">AI-Powered Editing</h3>
                    <p className="text-xs text-gray-400">Use our AI to automatically trim and enhance your videos</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500/60 transition-all">
                    <h3 className="text-sm font-bold text-white mb-2">Template Library</h3>
                    <p className="text-xs text-gray-400">Browse 100+ professional templates to get started quickly</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/60 transition-all">
                    <h3 className="text-sm font-bold text-white mb-2">Collaborate</h3>
                    <p className="text-xs text-gray-400">Invite team members to work on projects together</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium">Video completed</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">Tutorial Video finished processing</p>
                    <p className="text-xs text-gray-500 ml-8 mt-1">2 hours ago</p>
                  </div>

                  <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium">New project created</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">Product Demo started</p>
                    <p className="text-xs text-gray-500 ml-8 mt-1">5 hours ago</p>
                  </div>

                  <div className="bg-[#1a1a1a] border border-purple-900/30 rounded-lg p-3 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium">Welcome!</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">Account created successfully</p>
                    <p className="text-xs text-gray-500 ml-8 mt-1">1 day ago</p>
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
