import { ArrowLeft, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddUserDialog } from "@/components/add-user-dialog";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "@/components/user-actions";
import { getAllUsers, getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function UsersManagementPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const { users } = await getAllUsers();

  const activeUsers = users.filter((u) => u.emailVerified);
  const admins = users.filter((u) => u.role === "admin");

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
                  <Users className="h-10 w-10 text-purple-400" />
                  User Management
                </h1>
                <p className="mt-2 text-gray-400">
                  Manage all users and their permissions
                </p>
              </div>
              <AddUserDialog />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-1 font-bold text-3xl text-white">
                {users.length}
              </div>
              <div className="text-gray-400 text-sm">Total Users</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-1 font-bold text-3xl text-white">
                {activeUsers.length}
              </div>
              <div className="text-gray-400 text-sm">Verified Users</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-1 font-bold text-3xl text-white">
                {admins.length}
              </div>
              <div className="text-gray-400 text-sm">Admins</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-1 font-bold text-3xl text-white">
                {users.length - activeUsers.length}
              </div>
              <div className="text-gray-400 text-sm">Unverified</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 transform text-gray-400" />
                <input
                  className="w-full rounded-lg border border-purple-500/30 bg-black/40 py-3 pr-4 pl-10 text-white placeholder:text-gray-500 focus:border-purple-500/60 focus:outline-none"
                  placeholder="Search users by name or email..."
                  type="text"
                />
              </div>
              <select className="rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white">
                <option>All Roles</option>
                <option>Admin</option>
                <option>User</option>
              </select>
              <select className="rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white">
                <option>All Status</option>
                <option>Verified</option>
                <option>Unverified</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-purple-500/30 border-b bg-black/40">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-300 text-sm">
                      User
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-300 text-sm">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-300 text-sm">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-300 text-sm">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-300 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20">
                  {users.map((user) => (
                    <tr
                      className="transition-colors hover:bg-black/40"
                      key={user.id}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              alt={user.name}
                              className="h-10 w-10 rounded-full"
                              src={user.image}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600">
                              <span className="font-semibold text-white">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {user.name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            user.role === "admin"
                              ? "border-red-500/30 bg-red-500/20 text-red-400"
                              : "border-blue-500/30 bg-blue-500/20 text-blue-400"
                          }
                        >
                          {user.role?.charAt(0).toUpperCase() +
                            (user.role?.slice(1) || "user")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            user.emailVerified
                              ? "border-green-500/30 bg-green-500/20 text-green-400"
                              : "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                          }
                        >
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <UserActions
                          currentRole={user.role || "user"}
                          userEmail={user.email}
                          userId={user.id}
                          userName={user.name || "User"}
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
