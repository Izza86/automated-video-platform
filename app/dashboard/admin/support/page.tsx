import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Headphones,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const tickets = [
    {
      id: "#1234",
      user: "John Doe",
      subject: "Unable to upload video",
      status: "Open",
      priority: "High",
      time: "2 hours ago",
    },
    {
      id: "#1233",
      user: "Jane Smith",
      subject: "Payment issue",
      status: "In Progress",
      priority: "Medium",
      time: "5 hours ago",
    },
    {
      id: "#1232",
      user: "Mike Johnson",
      subject: "Feature request",
      status: "Resolved",
      priority: "Low",
      time: "1 day ago",
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
                <Headphones className="h-10 w-10 text-purple-400" />
                User Support
              </h1>
              <p className="mt-2 text-gray-400">
                Manage support tickets and user issues
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-2 flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <span className="font-bold text-2xl">8</span>
              </div>
              <p className="text-gray-400">Open Tickets</p>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-2 flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-400" />
                <span className="font-bold text-2xl">5</span>
              </div>
              <p className="text-gray-400">In Progress</p>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-2 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="font-bold text-2xl">142</span>
              </div>
              <p className="text-gray-400">Resolved</p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <h2 className="mb-4 font-bold text-xl">Recent Tickets</h2>
            <div className="space-y-4">
              {tickets.map((ticket, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                  key={index}
                >
                  <MessageSquare className="h-8 w-8 text-purple-400" />
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-gray-400 text-sm">{ticket.id}</span>
                      <Badge
                        className={
                          ticket.priority === "High"
                            ? "bg-red-500/20 text-red-400"
                            : ticket.priority === "Medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        }
                      >
                        {ticket.priority}
                      </Badge>
                      <Badge
                        className={
                          ticket.status === "Open"
                            ? "bg-blue-500/20 text-blue-400"
                            : ticket.status === "In Progress"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">
                      {ticket.subject}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {ticket.user} • {ticket.time}
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
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
