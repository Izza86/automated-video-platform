"use server";

import { getCurrentUser } from "./users";

/**
 * Check whether the current session user is an admin.
 * Uses the DB-backed role field instead of the organization plugin.
 */
export const isAdmin = async (): Promise<boolean | { success: false; error: string }> => {
  try {
    const { currentUser } = await getCurrentUser();
    return currentUser.role === "admin";
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to check permissions",
    };
  }
};

// Backwards-compatible alias for older imports
export const checkIsAdmin = isAdmin;
