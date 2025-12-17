import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Key, LogOut, Mail, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AccountsPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const accountActions = [
    { title: "Reset Password", icon: Key, description: "Send password reset link to user", color: "from-blue-600 to-cyan-600" },
    { title: "Force Logout", icon: LogOut, description: "Log out user from all devices", color: "from-orange-600 to-red-600" },
    { title: "Verify Email", icon: Mail, description: "Manually verify user email", color: "from-green-600 to-emerald-600" },
    { title: "Suspend Account", icon: UserX, description: "Temporarily suspend user account", color: "from-purple-600 to-pink-600" },
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
                <Lock className="w-10 h-10 text-purple-400" />
                Account Management
              </h1>
              <p className="text-gray-400 mt-2">Manage user accounts and authentication</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accountActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 mb-4">{action.description}</p>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                    Manage
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
