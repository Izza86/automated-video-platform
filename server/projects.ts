"use server";

import { db } from "@/server/db";
import { project } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "./users";

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
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.error("Project creation failed: User not authenticated");
      return { error: "User not authenticated" };
    }

    console.log("Creating project for user:", user.id);
    console.log("Project input:", { ...input, videoUrl: input.videoUrl.substring(0, 50) + '...' });

    // Generate a unique ID using timestamp and random string
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newProject = await db.insert(project).values({
      id: projectId,
      userId: user.id,
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
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return { error: "Failed to create project" };
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
      .where(eq(project.userId, user.id))
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

    if (existingProject[0].userId !== user.id) {
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

    if (projectData[0].userId !== user.id) {
      return { error: "Unauthorized" };
    }

    return { success: true, project: projectData[0] };
  } catch (error) {
    console.error("Error fetching project:", error);
    return { error: "Failed to fetch project" };
  }
}
