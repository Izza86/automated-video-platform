import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/users";
import { ArrowLeft, User as UserIcon, Mail, Shield, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ViewProfilePage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Admins don't need this page
  if (currentUser.role === "admin") {
    redirect("/dashboard");
  }

  // Format date
  const joinedDate = new Date(currentUser.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-purple-900/20 border border-purple-600/30 rounded-2xl p-4 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            My Profile
          </h1>

          {/* Profile Photo and Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-purple-600/30">
            {currentUser.image ? (
              <img
                src={currentUser.image}
                alt="Profile"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-purple-500"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-purple-600 flex items-center justify-center">
                <UserIcon className="w-12 h-12 sm:w-16 sm:h-16" />
              </div>
            )}

            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold">{currentUser.name}</h2>
              <p className="text-white/60 mt-1 break-all">{currentUser.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <Badge className="bg-purple-600">
                  {currentUser.role === "admin" ? "Administrator" : "User"}
                </Badge>
                {currentUser.emailVerified ? (
                  <Badge className="bg-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Email Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-600 text-orange-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Not Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <Card className="bg-white/5 border-purple-600/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm">Email Address</p>
                  <p className="text-lg font-medium text-white">{currentUser.email}</p>
                </div>
              </div>
            </Card>

            {/* Role */}
            <Card className="bg-white/5 border-purple-600/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm">Account Type</p>
                  <p className="text-lg font-medium capitalize text-white">{currentUser.role}</p>
                </div>
              </div>
            </Card>

            {/* Join Date */}
            <Card className="bg-white/5 border-purple-600/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm">Member Since</p>
                  <p className="text-lg font-medium text-white">{joinedDate}</p>
                </div>
              </div>
            </Card>

            {/* User ID */}
            <Card className="bg-white/5 border-purple-600/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm">User ID</p>
                  <p className="text-sm font-mono break-all text-white">{currentUser.id}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-purple-600/30">
            <Link href="/dashboard/edit-profile" className="w-full sm:w-auto">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Edit Profile
              </Button>
            </Link>
            <Link href="/dashboard/change-password" className="w-full sm:w-auto">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Change Password
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}