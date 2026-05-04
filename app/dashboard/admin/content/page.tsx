import { ArrowLeft, Eye, Flag, FolderOpen, Trash2, Video, FileVideo, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/users";
import { db } from "@/db/drizzle";
import { project, user } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getAllProjects() {
  const projects = await db
    .select({
      project: project,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(project)
    .leftJoin(user, eq(project.userId, user.id))
    .orderBy(desc(project.createdAt))
    .limit(50);

  return projects;
}

export default async function ContentPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch real project data
  const projects = await getAllProjects();

  // Calculate stats
  const totalProjects = projects.length;
  const templateProjects = projects.filter(p => p.project.type === "template").length;
  const referenceProjects = projects.filter(p => p.project.type === "reference-target").length;

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
                Review and manage user-generated projects
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  Total Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProjects}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templateProjects}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Reference Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{referenceProjects}</div>
              </CardContent>
            </Card>
          </div>

          {/* Projects List */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <h2 className="mb-4 font-bold text-xl">Recent Projects</h2>
            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No projects found</p>
                </div>
              ) : (
                projects.map((item) => (
                  <div
                    className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition-all hover:bg-black/60"
                    key={item.project.id}
                  >
                    {item.project.thumbnail ? (
                      <img 
                        src={item.project.thumbnail} 
                        alt={item.project.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                        <Video className="h-6 w-6 text-purple-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {item.project.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {item.project.type === "template" ? "Template" : "Reference"}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">
                        by {item.user?.name || "Unknown"} • {item.project.createdAt ? new Date(item.project.createdAt).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="bg-purple-600 text-white hover:bg-purple-700"
                        size="sm"
                        asChild
                      >
                        <a href={item.project.videoUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
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
