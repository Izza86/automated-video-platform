import { ArrowLeft, Edit, Shield, Users, Crown, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getAllUsers } from "@/server/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  // Get real user counts
  const { users } = await getAllUsers();
  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role === "user").length;
  const totalUsers = users.length;

  const roles = [
    {
      name: "Admin",
      users: adminCount,
      color: "bg-red-500",
      icon: Crown,
      permissions: ["All Access", "User Management", "System Settings", "Billing Control"],
    },
    {
      name: "User",
      users: userCount,
      color: "bg-blue-500",
      icon: User,
      permissions: ["Create Projects", "Upload Videos", "Use Templates", "Export Videos"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
          <div>
            <Link
              className="group mb-6 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
              href="/dashboard"
            >
              <ArrowLeft className="group-hover:-translate-x-1 h-4 w-4 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="flex items-center gap-3 font-bold text-3xl sm:text-4xl">
                  <Shield className="h-10 w-10 text-purple-400" />
                  Role & Permissions
                </h1>
                <p className="mt-2 text-gray-400">
                  Manage user roles and access permissions
                </p>
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                Create New Role
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-red-400" />
                  Admins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{adminCount}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" />
                  Regular Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{userCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {roles.map((role, index) => {
              const RoleIcon = role.icon;
              return (
                <div
                  className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all hover:border-purple-500/60"
                  key={index}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-lg ${role.color} flex items-center justify-center`}
                      >
                        <RoleIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xl">
                          {role.name}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {role.users} users
                        </p>
                      </div>
                    </div>
                    <Button
                      className="text-purple-400 hover:text-purple-300"
                      variant="ghost"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-300 text-sm">
                      Permissions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((perm, idx) => (
                        <Badge
                          className="border-purple-500/30 bg-purple-600/20 text-purple-300"
                          key={idx}
                        >
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-purple-500/30 border-t pt-4">
                    <Button className="flex-1 bg-purple-600 text-white hover:bg-purple-700">
                      Edit Role
                    </Button>
                    <Button
                      className="border-purple-500/50 text-white hover:bg-purple-900/20"
                      variant="outline"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
