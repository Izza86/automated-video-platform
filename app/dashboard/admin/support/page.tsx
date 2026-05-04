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
import { getTicketStats, getRecentTickets } from "@/server/admin-activity";
import { formatDistanceToNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  // Fetch dynamic data
  const [stats, ticketsData] = await Promise.all([
    getTicketStats(),
    getRecentTickets(20),
  ]);

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
                <span className="font-bold text-2xl">{stats.open}</span>
              </div>
              <p className="text-gray-400">Open Tickets</p>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-2 flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-400" />
                <span className="font-bold text-2xl">{stats.inProgress}</span>
              </div>
              <p className="text-gray-400">In Progress</p>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
              <div className="mb-2 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="font-bold text-2xl">{stats.resolved}</span>
              </div>
              <p className="text-gray-400">Resolved</p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <h2 className="mb-4 font-bold text-xl">Recent Tickets</h2>
            <div className="space-y-4">
              {ticketsData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tickets yet</p>
                </div>
              ) : (
                ticketsData.map((item) => (
                  <div
                    className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                    key={item.ticket.id}
                  >
                    <MessageSquare className="h-8 w-8 text-purple-400" />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-gray-400 text-sm">#{item.ticket.id.slice(-4)}</span>
                        <Badge
                          className={
                            item.ticket.priority === "high" || item.ticket.priority === "urgent"
                              ? "bg-red-500/20 text-red-400"
                              : item.ticket.priority === "medium"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                          }
                        >
                          {item.ticket.priority.charAt(0).toUpperCase() + item.ticket.priority.slice(1)}
                        </Badge>
                        <Badge
                          className={
                            item.ticket.status === "open"
                              ? "bg-blue-500/20 text-blue-400"
                              : item.ticket.status === "in_progress"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : item.ticket.status === "resolved"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {item.ticket.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-white">
                        {item.ticket.subject}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {item.user?.name || "Unknown"} • {item.ticket.createdAt ? formatDistanceToNow(new Date(item.ticket.createdAt)) : "Unknown"}
                      </p>
                    </div>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                      View
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
