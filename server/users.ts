"use server";

import { eq } from "drizzle-orm";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

export const getCurrentUser = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      redirect("/login");
    }

    const currentUserResult = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    const currentUser = currentUserResult[0];

    if (!currentUser) {
      redirect("/login");
    }

    return {
      ...session,
      currentUser,
    };
  } catch (error) {
    // Re-throw Next.js redirect errors — they must not be swallowed by catch.
    if (isRedirectError(error)) {
      throw error;
    }

    // During `next build` prerendering, headers() throws DYNAMIC_SERVER_USAGE.
    // Return null so callers redirect gracefully instead of triggering a
    // NEXT_REDIRECT chain that lets parallel DB queries crash with ENOTFOUND.
    if (
      error instanceof Error &&
      "digest" in error &&
      error.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      return null;
    }

    // Gracefully handle DB/session query timeouts (e.g. pool exhaustion
    // while FFmpeg is running) instead of crashing the Dashboard Layout.
    const msg = error instanceof Error ? error.message : String(error);
    const isTimeout =
      /timeout|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|connection terminated|too many clients/i.test(
        msg
      );

    if (isTimeout) {
      console.warn(
        "[getCurrentUser] DB query timed out — returning null so the layout can degrade gracefully:",
        msg
      );
      return null;
    }

    console.error("Error getting current user:", error);
    redirect("/login");
  }
};

// Helper function to check if user is admin
export const isAdmin = async () => {
  const result = await getCurrentUser();
  if (!result) return false;
  return result.currentUser.role === "admin";
};

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const authData = await getCurrentUser();
    if (!authData) {
      return { success: false, message: "Not authenticated.", users: [] };
    }
    const { currentUser } = authData;

    // Check if current user is admin
    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can view all users.",
        users: [],
      };
    }

    const allUsers = await db.select({
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
    }).from(user);

    return {
      success: true,
      users: allUsers,
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

// Update user role (admin only)
export const updateUserRole = async (userId: string, newRole: string) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can update user roles.",
      };
    }

    // Prevent admin from changing their own role
    if (currentUser.id === userId) {
      return {
        success: false,
        message: "You cannot change your own role.",
      };
    }

    await db
      .update(user)
      .set({ role: newRole as "admin" | "user" })
      .where(eq(user.id, userId));

    return {
      success: true,
      message: "User role updated successfully.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to update user role.",
    };
  }
};

// Update user information (admin only)
export const updateUserByAdmin = async (
  userId: string,
  name: string,
  email: string,
  role: string
) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can update user information.",
      };
    }

    // Validate inputs
    if (!(name && email)) {
      return {
        success: false,
        message: "Name and email are required.",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Invalid email format.",
      };
    }

    // Check if email is already taken by another user
    const existingUserResult = await db.select().from(user).where(eq(user.email, email)).limit(1);
    const existingUser = existingUserResult[0] || null;

    if (existingUser && existingUser.id !== userId) {
      return {
        success: false,
        message: "This email is already taken by another user.",
      };
    }

    // Update user information
    await db
      .update(user)
      .set({
        name,
        email,
        role: role as "admin" | "user",
      })
      .where(eq(user.id, userId));

    return {
      success: true,
      message: "User information updated successfully.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to update user information.",
    };
  }
};

// Delete user (admin only)
export const deleteUser = async (userId: string) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can delete users.",
      };
    }

    // Prevent admin from deleting themselves
    if (currentUser.id === userId) {
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

// Send email to user (admin only)
export const sendEmailToUser = async (
  userId: string,
  subject: string,
  message: string
) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can send emails to users.",
      };
    }

    const targetUserResult = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    const targetUser = targetUserResult[0];

    if (!targetUser) {
      return {
        success: false,
        message: "User not found.",
      };
    }

    // Here you would integrate with your email service (like Resend, SendGrid, etc.)
    // For now, we'll just return a success message
    console.log(
      `Sending email to ${targetUser.email}: ${subject} - ${message}`
    );

    return {
      success: true,
      message: `Email sent to ${targetUser.email} successfully.`,
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to send email.",
    };
  }
};

// Add new user (admin only)
export const addNewUser = async (
  name: string,
  email: string,
  password: string,
  role: string
) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can add new users.",
      };
    }

    // Validate inputs
    if (!(name && email && password)) {
      return {
        success: false,
        message: "All fields are required.",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Invalid email format.",
      };
    }

    // Validate password strength
    if (password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long.",
      };
    }

    // Check if user already exists
    const existingUserResult = await db.select().from(user).where(eq(user.email, email)).limit(1);
    const existingUser = existingUserResult[0] || null;

    if (existingUser) {
      return {
        success: false,
        message: "A user with this email already exists.",
      };
    }

    // Create user using Better Auth
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    // Update role if not default user
    if (role !== "user") {
      const newUserResult = await db.select().from(user).where(eq(user.email, email)).limit(1);
      const newUser = newUserResult[0];

      if (newUser) {
        await db
          .update(user)
          .set({ role: role as "admin" | "user" })
          .where(eq(user.id, newUser.id));
      }
    }

    return {
      success: true,
      message: "User added successfully.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to add user.",
    };
  }
};

// Helper function to promote user to admin (only for initial setup or by existing admin)
export const promoteToAdmin = async (userId: string) => {
  try {
    const authData = await getCurrentUser();
    if (!authData) return { success: false, message: "Not authenticated." };
    const { currentUser } = authData;

    // Check if current user is admin (for non-initial setup)
    if (currentUser.role !== "admin") {
      return {
        success: false,
        message: "Only admins can promote users.",
      };
    }

    await db.update(user).set({ role: "admin" }).where(eq(user.id, userId));

    return {
      success: true,
      message: "User promoted to admin successfully.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to promote user.",
    };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    return {
      success: true,
      message: "Signed in successfully.",
    };
  } catch (error) {
    const e = error as Error;

    return {
      success: false,
      message: e.message || "An unknown error occurred.",
    };
  }
};

export const signUp = async (
  email: string,
  password: string,
  username: string,
  profilePhoto?: string | null
) => {
  try {
    // Server-side validation
    if (!(email && password && username)) {
      return {
        success: false,
        message: "All fields are required.",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Invalid email format.",
      };
    }

    // Validate password strength
    if (password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long.",
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        success: false,
        message: "Password must contain at least one uppercase letter.",
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        success: false,
        message: "Password must contain at least one lowercase letter.",
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        success: false,
        message: "Password must contain at least one number.",
      };
    }

    // Validate username
    if (username.length < 3 || username.length > 50) {
      return {
        success: false,
        message: "Username must be between 3 and 50 characters.",
      };
    }

    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: username,
        image: profilePhoto || undefined,
      },
    });

    return {
      success: true,
      message:
        "Account created successfully! Welcome to Automated Video Editor.",
    };
  } catch (error) {
    const e = error as Error;

    return {
      success: false,
      message: e.message || "An unknown error occurred.",
    };
  }
};

// Compatibility helper: return users for an organization (simple wrapper)
export const getUsers = async (organizationId: string) => {
  // If you later implement organizations/members tables, replace this
  // with a real lookup filtered by `organizationId`.
  const res = await getAllUsers();
  return res.success ? res.users : [];
};
