import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Send, Users, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CommunicationPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const templates = [
    { title: "Welcome Email", description: "Send to new users", icon: Mail },
    { title: "Announcement", description: "Broadcast to all users", icon: Bell },
    { title: "Password Reset", description: "Reset link template", icon: Mail },
    { title: "Account Alert", description: "Security notifications", icon: Bell },
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
                <Mail className="w-10 h-10 text-purple-400" />
                Communication
              </h1>
              <p className="text-gray-400 mt-2">Send emails and notifications to users</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Send New Message</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
                  <select className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white">
                    <option>All Users</option>
                    <option>Specific User</option>
                    <option>Admin Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                  <input type="text" className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white" placeholder="Enter subject" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea rows={6} className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white" placeholder="Enter message"></textarea>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Email Templates</h2>
              {templates.map((template, index) => {
                const Icon = template.icon;
                return (
                  <div key={index} className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 transition-all">
                    <div className="flex items-center gap-4">
                      <Icon className="w-8 h-8 text-purple-400" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{template.title}</h3>
                        <p className="text-sm text-gray-400">{template.description}</p>
                      </div>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">Use</Button>
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
