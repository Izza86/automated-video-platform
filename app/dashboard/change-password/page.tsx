import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/users";
import { ArrowLeft } from "lucide-react";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function ChangePasswordPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Admins don't need this page
  if (currentUser.role === "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-purple-900/20 border border-purple-600/30 rounded-2xl p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Change Password
          </h1>
          <p className="text-white/70 mb-8">
            Update your password to keep your account secure
          </p>

          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}