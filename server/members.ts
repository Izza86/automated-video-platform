"use server";

import { isAdmin } from "./permissions";

/**
 * Placeholder member management.
 * Organization plugin is not enabled on the server-side auth config,
 * so these functions are stubs that return informative errors.
 * Replace with real implementations when the organization feature is enabled.
 */

export const addMember = async (
  organizationId: string,
  userId: string,
  role: string
) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { success: false, error: "You are not authorized to add members." };
    }

    // TODO: Implement when organization plugin is enabled
    console.warn("addMember called but organization plugin is not configured.");
    return { success: false, error: "Organization features are not yet enabled." };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to add member.");
  }
};

export const removeMember = async (memberId: string) => {
  const admin = await isAdmin();

  if (!admin) {
    return {
      success: false,
      error: "You are not authorized to remove members.",
    };
  }

  try {
    // TODO: Implement when organization plugin is enabled
    console.warn("removeMember called but organization plugin is not configured.");
    return { success: false, error: "Organization features are not yet enabled." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to remove member.",
    };
  }
};
