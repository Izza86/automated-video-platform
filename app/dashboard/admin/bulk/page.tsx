import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckSquare, Users, Mail, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function BulkPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const bulkActions = [
    { title: "Bulk Delete Users", description: "Delete multiple users at once", icon: Trash2, color: "from-red-600 to-pink-600" },
    { title: "Bulk Email Send", description: "Send emails to selected users", icon: Mail, color: "from-blue-600 to-cyan-600" },
    { title: "Bulk Role Change", description: "Change roles for multiple users", icon: Users, color: "from-purple-600 to-pink-600" },
    { title: "Bulk Suspend", description: "Suspend multiple accounts", icon: UserX, color: "from-orange-600 to-red-600" },
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
                <CheckSquare className="w-10 h-10 text-purple-400" />
                Bulk Operations
              </h1>
              <p className="text-gray-400 mt-2">Perform actions on multiple users simultaneously</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bulkActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 mb-4">{action.description}</p>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                    Start Action
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Select Users for Bulk Action</h2>
            <p className="text-gray-400 mb-4">Upload a CSV file or select users from the user management page</p>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              Upload CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
