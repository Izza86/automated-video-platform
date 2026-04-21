import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EditProfileForm } from "@/components/edit-profile-form";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser)) {
    redirect("/login");
  }

  const { currentUser } = auth;

  // Admins should not use this page
  if (currentUser.role === "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 sm:mb-8"
          href="/dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="rounded-2xl border border-purple-600/30 bg-purple-900/20 p-4 sm:p-6 lg:p-8">
          <h1 className="mb-2 font-bold text-2xl sm:text-3xl">Edit Profile</h1>
          <p className="mb-8 text-white/70">
            Update your personal information and profile photo
          </p>

          <EditProfileForm
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              image: currentUser.image,
            }}
          />
        </div>
      </div>
    </div>
  );
}
