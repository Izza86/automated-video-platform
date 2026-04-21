import { ArrowLeft, Eye, Flag, FolderOpen, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  const contents = [
    {
      title: "Sample Video 1",
      user: "John Doe",
      status: "Pending Review",
      flagged: true,
      date: "2024-12-15",
    },
    {
      title: "Marketing Video",
      user: "Jane Smith",
      status: "Approved",
      flagged: false,
      date: "2024-12-14",
    },
    {
      title: "Tutorial Content",
      user: "Mike Johnson",
      status: "Flagged",
      flagged: true,
      date: "2024-12-13",
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
                <FolderOpen className="h-10 w-10 text-purple-400" />
                Content Moderation
              </h1>
              <p className="mt-2 text-gray-400">
                Review and moderate user-generated content
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <div className="space-y-4">
              {contents.map((content, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                  key={index}
                >
                  <Video className="h-10 w-10 text-purple-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {content.title}
                      </h3>
                      {content.flagged && (
                        <Flag className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      by {content.user} • {content.date}
                    </p>
                  </div>
                  <Badge
                    className={
                      content.status === "Flagged"
                        ? "bg-red-500/20 text-red-400"
                        : content.status === "Approved"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    }
                  >
                    {content.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      className="bg-purple-600 text-white hover:bg-purple-700"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      className="border-red-500/50 text-red-400 hover:bg-red-900/20"
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
