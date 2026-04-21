import {
  ArrowLeft,
  CheckSquare,
  Mail,
  Trash2,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function BulkPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const bulkActions = [
    {
      title: "Bulk Delete Users",
      description: "Delete multiple users at once",
      icon: Trash2,
      color: "from-red-600 to-pink-600",
    },
    {
      title: "Bulk Email Send",
      description: "Send emails to selected users",
      icon: Mail,
      color: "from-blue-600 to-cyan-600",
    },
    {
      title: "Bulk Role Change",
      description: "Change roles for multiple users",
      icon: Users,
      color: "from-purple-600 to-pink-600",
    },
    {
      title: "Bulk Suspend",
      description: "Suspend multiple accounts",
      icon: UserX,
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
                <CheckSquare className="h-10 w-10 text-purple-400" />
                Bulk Operations
              </h1>
              <p className="mt-2 text-gray-400">
                Perform actions on multiple users simultaneously
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {bulkActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all hover:border-purple-500/60"
                  key={index}
                >
                  <div
                    className={`h-16 w-16 rounded-lg bg-gradient-to-r ${action.color} mb-4 flex items-center justify-center`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mb-2 font-bold text-white text-xl">
                    {action.title}
                  </h3>
                  <p className="mb-4 text-gray-400">{action.description}</p>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                    Start Action
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <h2 className="mb-4 font-bold text-xl">
              Select Users for Bulk Action
            </h2>
            <p className="mb-4 text-gray-400">
              Upload a CSV file or select users from the user management page
            </p>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
              Upload CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
