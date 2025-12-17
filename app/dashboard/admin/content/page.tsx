import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Video, Flag, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ContentPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const contents = [
    { title: "Sample Video 1", user: "John Doe", status: "Pending Review", flagged: true, date: "2024-12-15" },
    { title: "Marketing Video", user: "Jane Smith", status: "Approved", flagged: false, date: "2024-12-14" },
    { title: "Tutorial Content", user: "Mike Johnson", status: "Flagged", flagged: true, date: "2024-12-13" },
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
                <FolderOpen className="w-10 h-10 text-purple-400" />
                Content Moderation
              </h1>
              <p className="text-gray-400 mt-2">Review and moderate user-generated content</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <div className="space-y-4">
              {contents.map((content, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-black/40 rounded-lg hover:bg-black/60 transition-all">
                  <Video className="w-10 h-10 text-purple-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{content.title}</h3>
                      {content.flagged && <Flag className="w-4 h-4 text-red-400" />}
                    </div>
                    <p className="text-sm text-gray-400">by {content.user} • {content.date}</p>
                  </div>
                  <Badge className={content.status === "Flagged" ? "bg-red-500/20 text-red-400" : content.status === "Approved" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                    {content.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" />
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
