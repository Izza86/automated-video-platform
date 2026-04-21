"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getCurrentUser } from "@/server/users";

/**
 * Check whether the current session user is an admin.
 * Uses the DB-backed role field instead of the organization plugin.
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const auth = await getCurrentUser();
    if (!auth) return false;
    return auth.currentUser.role === "admin";
  } catch (error) {
    // Re-throw Next.js redirect errors — they must not be swallowed.
    if (isRedirectError(error)) {
      throw error;
    }
    console.error(error);
    return false;
  }
};

// Backwards-compatible alias for older imports
export const checkIsAdmin = isAdmin;
