"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileVideo, Download, Trash2, Play, Calendar, Clock, Palette, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getUserProjects, deleteProject } from "@/server/projects";
import type { Project } from "@/db/schema";

interface ProjectMetadata {
  templateName?: string;
  referenceVideoName?: string;
  targetVideoName?: string;
  duration?: number;
  effects?: string[];
}

interface SavedProject extends Project {
  metadata?: ProjectMetadata;
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);
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
        toast.error(result.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (project: SavedProject) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const handleDownload = (project: SavedProject) => {
    const a = document.createElement('a');
    a.href = project.videoUrl;
    a.download = `${project.name}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Video downloaded successfully!');
  };

  const handleDelete = async (projectId: string) => {
    setDeleting(projectId);
    try {
      const result = await deleteProject(projectId);
      if (result.success) {
        setProjects(projects.filter(p => p.id !== projectId));
        toast.success('Project deleted successfully!');
      } else {
        toast.error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  <FileVideo className="w-10 h-10 text-purple-400" />
                  My Projects
                </h1>
                <p className="text-gray-400 mt-2">All your edited videos in one place</p>
              </div>
              <Badge variant="outline" className="border-purple-500/50 text-purple-300 px-4 py-2">
                {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
              </Badge>
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-12 text-center">
              <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-white mb-2">Loading projects...</h3>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-12 text-center">
              <FileVideo className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-6">Start creating videos using templates or reference videos</p>
              <div className="flex gap-3 justify-center">
                <Link href="/dashboard/templates">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white">
                    Browse Templates
                  </Button>
                </Link>
                <Link href="/dashboard/upload-edit">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white">
                    Upload & Edit
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl overflow-hidden hover:border-purple-500/60 transition-all group"
                >
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-black">
                    <video
                      src={project.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handlePreview(project)}
                        className="bg-purple-600 hover:bg-purple-500"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                    <Badge className="absolute top-2 left-2 bg-purple-600">
                      {project.type === "template" ? "Template" : "Ref + Target"}
                    </Badge>
                  </div>

                  {/* Project Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{project.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.createdAt)}
                      </div>
                    </div>

                    {/* Metadata */}
                    {project.metadata && (
                      <div className="space-y-1 text-xs">
                        {project.metadata.templateName && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Palette className="w-3 h-3 text-purple-400" />
                            <span>{project.metadata.templateName}</span>
                          </div>
                        )}
                        {project.metadata.referenceVideoName && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Music className="w-3 h-3 text-cyan-400" />
                            <span className="line-clamp-1">Ref: {project.metadata.referenceVideoName}</span>
                          </div>
                        )}
                        {project.metadata.effects && project.metadata.effects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.metadata.effects.slice(0, 3).map((effect, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                                {effect}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleDownload(project)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        onClick={() => handleDelete(project.id)}
                        disabled={deleting === project.id}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-900/20 text-xs"
                      >
                        {deleting === project.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border-purple-500/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {selectedProject?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Created on {selectedProject && formatDate(selectedProject.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={selectedProject.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              </div>

              {/* Project Details */}
              {selectedProject.metadata && (
                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30 space-y-2">
                  <h4 className="font-semibold text-purple-300 mb-3">Project Details</h4>
                  {selectedProject.metadata.templateName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Template:</span>
                      <span className="text-white font-medium">{selectedProject.metadata.templateName}</span>
                    </div>
                  )}
                  {selectedProject.metadata.referenceVideoName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reference Video:</span>
                      <span className="text-white font-medium">{selectedProject.metadata.referenceVideoName}</span>
                    </div>
                  )}
                  {selectedProject.metadata.targetVideoName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Target Video:</span>
                      <span className="text-white font-medium">{selectedProject.metadata.targetVideoName}</span>
                    </div>
                  )}
                  {selectedProject.metadata.effects && selectedProject.metadata.effects.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-400 mb-2 block">Effects Applied:</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.metadata.effects.map((effect, idx) => (
                          <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300">
                            {effect}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDownload(selectedProject)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-purple-500/50 text-white hover:bg-purple-900/20"
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
