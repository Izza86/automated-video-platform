"use server";

import { auth } from "@/lib/auth";
import { getCurrentUser } from "./users";
import crypto from "crypto";

interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
}

// In-memory storage for demo (in production, store in database)
const resetTokens = new Map<string, PasswordResetToken>();

export const requestPasswordChange = async () => {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    resetTokens.set(token, {
      token,
      userId: currentUser.id,
      expiresAt,
    });

    // In production, send email with token
    // For now, return the token (user will see it in console/UI)
    const resetUrl = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard/change-password?token=${token}`;

    console.log("===========================================");
    console.log("PASSWORD RESET REQUEST");
    console.log("===========================================");
    console.log("User:", currentUser.email);
    console.log("Token:", token);
    console.log("Reset URL:", resetUrl);
    console.log("Expires:", expiresAt.toLocaleString());
    console.log("===========================================");

    return {
      success: true,
      message: "Password reset link generated (check console for now)",
      token, // Remove this in production
    };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, message: "Failed to generate reset link" };
  }
};

export const changePasswordWithToken = async (
  token: string,
  newPassword: string
) => {
  try {
    // Validate token
    const resetData = resetTokens.get(token);
    if (!resetData) {
      return { success: false, message: "Invalid or expired token" };
    }

    if (new Date() > resetData.expiresAt) {
      resetTokens.delete(token);
      return { success: false, message: "Token has expired" };
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return { success: false, message: "Password must be at least 8 characters" };
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      return {
        success: false,
        message: "Password must contain uppercase, lowercase, and number",
      };
    }

    // Change password using Better Auth
    const result = await auth.api.changePassword({
      body: {
        newPassword,
        currentPassword: "", // Not needed for token-based reset
        revokeOtherSessions: true,
      },
      headers: new Headers(),
      asResponse: false,
    });

    // Delete used token
    resetTokens.delete(token);

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("Password change error:", error);
    return { success: false, message: "Failed to change password" };
  }
};

export const changePasswordDirect = async (
  currentPassword: string,
  newPassword: string
) => {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    // Validate new password strength
    if (newPassword.length < 8) {
      return { success: false, message: "Password must be at least 8 characters" };
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      return {
        success: false,
        message: "Password must contain uppercase, lowercase, and number",
      };
    }

    // Verify current password first
    const signInResult = await auth.api.signInEmail({
      body: {
        email: currentUser.email,
        password: currentPassword,
      },
      headers: new Headers(),
      asResponse: false,
    });

    if (!signInResult) {
      return { success: false, message: "Current password is incorrect" };
    }

    // Change password
    await auth.api.changePassword({
      body: {
        newPassword,
        currentPassword,
        revokeOtherSessions: false,
      },
      headers: new Headers(),
      asResponse: false,
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error: any) {
    console.error("Password change error:", error);
    return {
      success: false,
      message: error?.message || "Failed to change password",
    };
  }
};