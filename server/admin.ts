"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import type { User } from "@/db/schema";
import { getCurrentUser } from "./users";

// Get all users (Admin only)
export const getAllUsers = async () => {
  try {
    const authData = await getCurrentUser();
    if (!authData)
      return { success: false, message: "Not authenticated.", users: [] };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized. Admin access required.",
        users: [],
      };
    }

    const users = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      image: user.image,
      profilePhoto: user.profilePhoto,
      stripeCustomerId: user.stripeCustomerId,
      updatedAt: user.updatedAt,
    }).from(user) as User[];

    return {
      success: true,
      users,
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to fetch users.",
      users: [],
    };
  }
};

// Delete user (Admin only)
export const deleteUser = async (userId: string) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized. Admin access required.",
      };
    }

    // Prevent admin from deleting themselves
    if (userId === currentUser.id) {
      return {
        success: false,
        message: "You cannot delete your own account.",
      };
    }

    await db.delete(user).where(eq(user.id, userId));

    return {
      success: true,
      message: "User deleted successfully.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to delete user.",
    };
  }
};

// Update user profile (User can update their own profile)
export const updateUserProfile = async (data: {
  name?: string;
  profilePhoto?: string | null;
}) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.profilePhoto !== undefined) updateData.image = data.profilePhoto;

    await db.update(user).set(updateData).where(eq(user.id, currentUser.id));

    return {
      success: true,
      message: "Profile updated successfully.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to update profile.",
    };
  }
};
