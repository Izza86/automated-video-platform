import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Headphones, MessageSquare, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SupportPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const tickets = [
    { id: "#1234", user: "John Doe", subject: "Unable to upload video", status: "Open", priority: "High", time: "2 hours ago" },
    { id: "#1233", user: "Jane Smith", subject: "Payment issue", status: "In Progress", priority: "Medium", time: "5 hours ago" },
    { id: "#1232", user: "Mike Johnson", subject: "Feature request", status: "Resolved", priority: "Low", time: "1 day ago" },
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
                <Headphones className="w-10 h-10 text-purple-400" />
                User Support
              </h1>
              <p className="text-gray-400 mt-2">Manage support tickets and user issues</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <span className="text-2xl font-bold">8</span>
              </div>
              <p className="text-gray-400">Open Tickets</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-yellow-400" />
                <span className="text-2xl font-bold">5</span>
              </div>
              <p className="text-gray-400">In Progress</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-2xl font-bold">142</span>
              </div>
              <p className="text-gray-400">Resolved</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Recent Tickets</h2>
            <div className="space-y-4">
              {tickets.map((ticket, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-black/40 rounded-lg hover:bg-black/60 transition-all">
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-400">{ticket.id}</span>
                      <Badge className={ticket.priority === "High" ? "bg-red-500/20 text-red-400" : ticket.priority === "Medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
                        {ticket.priority}
                      </Badge>
                      <Badge className={ticket.status === "Open" ? "bg-blue-500/20 text-blue-400" : ticket.status === "In Progress" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">{ticket.subject}</h3>
                    <p className="text-sm text-gray-400">{ticket.user} • {ticket.time}</p>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
