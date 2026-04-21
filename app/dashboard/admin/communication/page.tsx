import { ArrowLeft, Bell, Mail, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const templates = [
    { title: "Welcome Email", description: "Send to new users", icon: Mail },
    {
      title: "Announcement",
      description: "Broadcast to all users",
      icon: Bell,
    },
    { title: "Password Reset", description: "Reset link template", icon: Mail },
    {
      title: "Account Alert",
      description: "Security notifications",
      icon: Bell,
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
                <Mail className="h-10 w-10 text-purple-400" />
                Communication
              </h1>
              <p className="mt-2 text-gray-400">
                Send emails and notifications to users
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <h2 className="mb-4 font-bold text-2xl">Send New Message</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block font-medium text-gray-300 text-sm">
                    To
                  </label>
                  <select className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white">
                    <option>All Users</option>
                    <option>Specific User</option>
                    <option>Admin Only</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block font-medium text-gray-300 text-sm">
                    Subject
                  </label>
                  <input
                    className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                    placeholder="Enter subject"
                    type="text"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-medium text-gray-300 text-sm">
                    Message
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                    placeholder="Enter message"
                    rows={6}
                  />
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-bold text-2xl">Email Templates</h2>
              {templates.map((template, index) => {
                const Icon = template.icon;
                return (
                  <div
                    className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-4 transition-all hover:border-purple-500/60"
                    key={index}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="h-8 w-8 text-purple-400" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {template.title}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {template.description}
                        </p>
                      </div>
                      <Button
                        className="bg-purple-600 text-white hover:bg-purple-700"
                        size="sm"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
