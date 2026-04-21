"use client";

import {
  ArrowLeft,
  Calendar,
  Download,
  FileVideo,
  Loader2,
  Music,
  Palette,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Rewrite /outputs/ URLs to the API video route for production compatibility */
function videoSrc(url: string | undefined | null): string {
  if (!url) return "";
  let u = url;
  const idx = u.indexOf("/outputs/");
  if (idx >= 0) {
    const filename = u.slice(idx + "/outputs/".length).split("?")[0];
    u = `/api/video/${filename}`;
  }
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}t=${Date.now()}`;
}

import type { Project } from "@/db/schema";
import { deleteProject, getUserProjects } from "@/server/projects";

interface ProjectMetadata {
  templateName?: string;
  referenceVideoName?: string;
  targetVideoName?: string;
  duration?: number;
  effects?: string[];
}

interface SavedProject extends Omit<Project, "metadata"> {
  metadata?: ProjectMetadata | null;
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await getUserProjects();
      if (result.success && result.projects) {
        setProjects(result.projects as SavedProject[]);
      } else {
        toast.error(result.error || "Failed to load projects");
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (project: SavedProject) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const handleDownload = (project: SavedProject) => {
    if (!project.videoUrl) {
      toast.error("No video available for this project");
      return;
    }
    const a = document.createElement("a");
    a.href = videoSrc(project.videoUrl);
    a.download = `${project.name}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Video downloaded successfully!");
  };

  const handleDelete = async (projectId: string) => {
    setDeleting(projectId);
    try {
      const result = await deleteProject(projectId);
      if (result.success) {
        setProjects(projects.filter((p) => p.id !== projectId));
        toast.success("Project deleted successfully!");
      } else {
        toast.error(result.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          {/* Header */}
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-3 font-bold text-4xl">
                  <FileVideo className="h-10 w-10 text-purple-400" />
                  My Projects
                </h1>
                <p className="mt-2 text-gray-400">
                  All your edited videos in one place
                </p>
              </div>
              <Badge
                className="border-purple-500/50 px-4 py-2 text-purple-300"
                variant="outline"
              >
                {projects.length}{" "}
                {projects.length === 1 ? "Project" : "Projects"}
              </Badge>
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-12 text-center">
              <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-purple-400" />
              <h3 className="mb-2 font-semibold text-white text-xl">
                Loading projects...
              </h3>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-12 text-center">
              <FileVideo className="mx-auto mb-4 h-16 w-16 text-purple-400 opacity-50" />
              <h3 className="mb-2 font-semibold text-white text-xl">
                No projects yet
              </h3>
              <p className="mb-6 text-gray-400">
                Start creating videos using templates or reference videos
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/dashboard/templates">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500">
                    Browse Templates
                  </Button>
                </Link>
                <Link href="/dashboard/upload-edit">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500">
                    Upload & Edit
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  className="group overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] transition-all hover:border-purple-500/60"
                  key={project.id}
                >
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-black">
                    {project.videoUrl ? (
                      <video
                        className="h-full w-full object-cover"
                        muted
                        src={videoSrc(project.videoUrl)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-900">
                        <FileVideo className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        className="bg-purple-600 hover:bg-purple-500"
                        onClick={() => handlePreview(project)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                    <Badge className="absolute top-2 left-2 bg-purple-600">
                      {project.type === "template"
                        ? "Template"
                        : "Ref + Target"}
                    </Badge>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="mb-1 line-clamp-1 font-semibold text-white">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.createdAt)}
                      </div>
                    </div>

                    {/* Metadata */}
                    {project.metadata && (
                      <div className="space-y-1 text-xs">
                        {project.metadata.templateName && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Palette className="h-3 w-3 text-purple-400" />
                            <span>{project.metadata.templateName}</span>
                          </div>
                        )}
                        {project.metadata.referenceVideoName && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Music className="h-3 w-3 text-cyan-400" />
                            <span className="line-clamp-1">
                              Ref: {project.metadata.referenceVideoName}
                            </span>
                          </div>
                        )}
                        {project.metadata.effects &&
                          project.metadata.effects.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {project.metadata.effects
                                .slice(0, 3)
                                .map((effect, idx) => (
                                  <Badge
                                    className="border-purple-500/30 text-purple-300 text-xs"
                                    key={idx}
                                    variant="outline"
                                  >
                                    {effect}
                                  </Badge>
                                ))}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {project.videoUrl ? (
                        <Button
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-xs hover:from-purple-500 hover:to-pink-500"
                          onClick={() => handleDownload(project)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      ) : (
                        <Badge
                          className="flex-1 border-yellow-500/30 py-2 text-center text-xs text-yellow-400"
                          variant="outline"
                        >
                          Analysis Only
                        </Badge>
                      )}
                      <Button
                        className="border-red-500/50 text-red-400 text-xs hover:bg-red-900/20"
                        disabled={deleting === project.id}
                        onClick={() => handleDelete(project.id)}
                        variant="outline"
                      >
                        {deleting === project.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="max-w-4xl border-purple-500/50 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] text-white">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold text-2xl text-transparent">
              {selectedProject?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Created on{" "}
              {selectedProject && formatDate(selectedProject.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                {selectedProject.videoUrl ? (
                  <video
                    autoPlay
                    className="h-full w-full"
                    controls
                    src={videoSrc(selectedProject.videoUrl)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                    <FileVideo className="mb-2 h-16 w-16 opacity-50" />
                    <p>No video available — analysis-only project</p>
                  </div>
                )}
              </div>

              {/* Project Details */}
              {selectedProject.metadata && (
                <div className="space-y-2 rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
                  <h4 className="mb-3 font-semibold text-purple-300">
                    Project Details
                  </h4>
                  {selectedProject.metadata.templateName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Template:</span>
                      <span className="font-medium text-white">
                        {selectedProject.metadata.templateName}
                      </span>
                    </div>
                  )}
                  {selectedProject.metadata.referenceVideoName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reference Video:</span>
                      <span className="font-medium text-white">
                        {selectedProject.metadata.referenceVideoName}
                      </span>
                    </div>
                  )}
                  {selectedProject.metadata.targetVideoName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Target Video:</span>
                      <span className="font-medium text-white">
                        {selectedProject.metadata.targetVideoName}
                      </span>
                    </div>
                  )}
                  {selectedProject.metadata.effects &&
                    selectedProject.metadata.effects.length > 0 && (
                      <div className="text-sm">
                        <span className="mb-2 block text-gray-400">
                          Effects Applied:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.metadata.effects.map(
                            (effect, idx) => (
                              <Badge
                                className="border-purple-500/30 text-purple-300"
                                key={idx}
                                variant="outline"
                              >
                                {effect}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {selectedProject.videoUrl && (
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    onClick={() => handleDownload(selectedProject)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Video
                  </Button>
                )}
                <Button
                  className="border-purple-500/50 text-white hover:bg-purple-900/20"
                  onClick={() => setIsDialogOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
