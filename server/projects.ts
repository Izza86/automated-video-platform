"use server";

import { db } from "@/server/db";
import { project } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "./users";
import * as fs from "fs";
import * as path from "path";

export interface ProjectMetadata {
  templateName?: string;
  referenceVideoName?: string;
  targetVideoName?: string;
  duration?: number;
  effects?: string[];
}

export interface CreateProjectInput {
  name: string;
  type: "template" | "reference-target";
  videoUrl: string;
  thumbnail?: string;
  metadata?: ProjectMetadata;
}

export async function createProject(input: CreateProjectInput) {
  // Generate a unique ID using timestamp and random string so it's available
  // even if DB insertion fails and we need to fallback to disk storage.
  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const user = await getCurrentUser();

    if (!user) {
      console.error("Project creation failed: User not authenticated");
      return { error: "User not authenticated" };
    }

    console.log("Creating project for user:", user.currentUser.id);
    console.log("Project input:", { ...input, videoUrl: input.videoUrl.substring(0, 50) + "..." });

    const newProject = await db.insert(project).values({
      id: projectId,
      userId: user.currentUser.id,
      name: input.name,
      type: input.type,
      videoUrl: input.videoUrl,
      thumbnail: input.thumbnail || null,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log("Project created successfully:", newProject[0].id);
    return { success: true, project: newProject[0] };
  } catch (error) {
    console.error("Error creating project:", error);
    const errMsg = error instanceof Error ? error.message : String(error);

    // Development fallback: if DB or auth is down locally, persist project
    // to a local file so the user doesn't lose work. Do NOT enable this in
    // production.
    if (process.env.NODE_ENV !== "production") {
      try {
        const devDir = path.join(process.cwd(), "dev-data", "projects");
        await fs.promises.mkdir(devDir, { recursive: true });

        const fallback = {
          id: projectId,
          userId: (error as any)?.user?.id || "dev-guest",
          name: input.name,
          type: input.type,
          videoUrl: input.videoUrl,
          thumbnail: input.thumbnail || null,
          metadata: input.metadata || null,
          createdAt: new Date().toISOString(),
        };

        const fallbackPath = path.join(devDir, `${projectId}.json`);
        await fs.promises.writeFile(fallbackPath, JSON.stringify(fallback, null, 2), "utf8");
        console.log("Saved fallback project to disk:", fallbackPath);

        return { success: true, project: fallback };
      } catch (fsErr) {
        console.error("Fallback write failed:", fsErr);
      }
    }

    // Return the underlying error message for debugging in non-production
    return { error: errMsg || "Failed to create project" };
  }
}

export async function getUserProjects() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { error: "User not authenticated" };
    }

    const projects = await db
      .select()
      .from(project)
      .where(eq(project.userId, user.currentUser.id))
      .orderBy(desc(project.createdAt));

    return { success: true, projects };
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { error: "Failed to fetch projects" };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { error: "User not authenticated" };
    }

    // Verify the project belongs to the user
    const existingProject = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);

    if (existingProject.length === 0) {
      return { error: "Project not found" };
    }

    if (existingProject[0].userId !== user.currentUser.id) {
      return { error: "Unauthorized" };
    }

    await db.delete(project).where(eq(project.id, projectId));

    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { error: "Failed to delete project" };
  }
}

export async function getProject(projectId: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { error: "User not authenticated" };
    }

    const projectData = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);

    if (projectData.length === 0) {
      return { error: "Project not found" };
    }

    if (projectData[0].userId !== user.currentUser.id) {
      return { error: "Unauthorized" };
    }

    return { success: true, project: projectData[0] };
  } catch (error) {
    console.error("Error fetching project:", error);
    return { error: "Failed to fetch project" };
  }
}
