import { getCurrentUser, getAllUsers } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "@/components/user-actions";
import { AddUserDialog } from "@/components/add-user-dialog";

export default async function UsersManagementPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { users } = await getAllUsers();

  const activeUsers = users.filter(u => u.emailVerified);
  const admins = users.filter(u => u.role === "admin");

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
                  <Users className="w-10 h-10 text-purple-400" />
                  User Management
                </h1>
                <p className="text-gray-400 mt-2">Manage all users and their permissions</p>
              </div>
              <AddUserDialog />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{users.length}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{activeUsers.length}</div>
              <div className="text-sm text-gray-400">Verified Users</div>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{admins.length}</div>
              <div className="text-sm text-gray-400">Admins</div>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{users.length - activeUsers.length}</div>
              <div className="text-sm text-gray-400">Unverified</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  className="w-full bg-black/40 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/60"
                />
              </div>
              <select className="bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white">
                <option>All Roles</option>
                <option>Admin</option>
                <option>User</option>
              </select>
              <select className="bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white">
                <option>All Status</option>
                <option>Verified</option>
                <option>Unverified</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-purple-500/30">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">User</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Joined</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-black/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={
                          user.role === "admin" 
                            ? "bg-red-500/20 text-red-400 border-red-500/30" 
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }>
                          {user.role?.charAt(0).toUpperCase() + (user.role?.slice(1) || "user")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={
                          user.emailVerified
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }>
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <UserActions 
                          userId={user.id}
                          userName={user.name || "User"}
                          userEmail={user.email}
                          currentRole={user.role || "user"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
