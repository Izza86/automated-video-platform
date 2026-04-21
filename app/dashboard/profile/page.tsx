import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Mail,
  Shield,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function ViewProfilePage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser)) {
    redirect("/login");
  }

  const { currentUser } = auth;

  // Admins don't need this page
  if (currentUser.role === "admin") {
    redirect("/dashboard");
  }

  // Format date
  const joinedDate = new Date(currentUser.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 sm:mb-8"
          href="/dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="rounded-2xl border border-purple-600/30 bg-purple-900/20 p-4 sm:p-6 lg:p-8">
          <h1 className="mb-8 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold text-3xl text-transparent">
            My Profile
          </h1>

          {/* Profile Photo and Name */}
          <div className="mb-8 flex flex-col items-center gap-6 border-purple-600/30 border-b pb-8 sm:flex-row sm:items-start">
            {currentUser.image ? (
              <img
                alt="Profile"
                className="h-24 w-24 rounded-full border-4 border-purple-500 object-cover sm:h-32 sm:w-32"
                src={currentUser.image}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-purple-600 sm:h-32 sm:w-32">
                <UserIcon className="h-12 w-12 sm:h-16 sm:w-16" />
              </div>
            )}

            <div className="text-center sm:text-left">
              <h2 className="font-bold text-2xl sm:text-3xl">
                {currentUser.name}
              </h2>
              <p className="mt-1 break-all text-white/60">
                {currentUser.email}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge className="bg-purple-600">
                  {(currentUser.role as string) === "admin"
                    ? "Administrator"
                    : "User"}
                </Badge>
                {currentUser.emailVerified ? (
                  <Badge className="flex items-center gap-1 bg-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Email Verified
                  </Badge>
                ) : (
                  <Badge
                    className="flex items-center gap-1 border-orange-600 text-orange-400"
                    variant="outline"
                  >
                    <XCircle className="h-3 w-3" />
                    Not Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Email */}
            <Card className="border-purple-600/30 bg-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                  <Mail className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/60">Email Address</p>
                  <p className="font-medium text-lg text-white">
                    {currentUser.email}
                  </p>
                </div>
              </div>
            </Card>

            {/* Role */}
            <Card className="border-purple-600/30 bg-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/60">Account Type</p>
                  <p className="font-medium text-lg text-white capitalize">
                    {currentUser.role}
                  </p>
                </div>
              </div>
            </Card>

            {/* Join Date */}
            <Card className="border-purple-600/30 bg-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/60">Member Since</p>
                  <p className="font-medium text-lg text-white">{joinedDate}</p>
                </div>
              </div>
            </Card>

            {/* User ID */}
            <Card className="border-purple-600/30 bg-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                  <UserIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/60">User ID</p>
                  <p className="break-all font-mono text-sm text-white">
                    {currentUser.id}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-4 border-purple-600/30 border-t pt-8 sm:flex-row">
            <Link className="w-full sm:w-auto" href="/dashboard/edit-profile">
              <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
                Edit Profile
              </Button>
            </Link>
            <Link
              className="w-full sm:w-auto"
              href="/dashboard/change-password"
            >
              <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
                Change Password
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
