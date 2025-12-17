import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Users, Lock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function RolesPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const roles = [
    { name: "Admin", users: 2, color: "bg-red-500", permissions: ["All Access", "User Management", "System Settings"] },
    { name: "User", users: 45, color: "bg-blue-500", permissions: ["Create Projects", "Upload Videos", "Use Templates"] },
    { name: "Moderator", users: 5, color: "bg-yellow-500", permissions: ["Content Review", "User Support", "Analytics View"] },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Header */}
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                  <Shield className="w-10 h-10 text-purple-400" />
                  Role & Permissions
                </h1>
                <p className="text-gray-400 mt-2">Manage user roles and access permissions</p>
              </div>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                Create New Role
              </Button>
            </div>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role, index) => (
              <div key={index} className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${role.color} flex items-center justify-center`}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{role.name}</h3>
                      <p className="text-sm text-gray-400">{role.users} users</p>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-300">Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm, idx) => (
                      <Badge key={idx} className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-purple-500/30 flex gap-2">
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                    Edit Role
                  </Button>
                  <Button variant="outline" className="border-purple-500/50 text-white hover:bg-purple-900/20">
                    <Users className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
