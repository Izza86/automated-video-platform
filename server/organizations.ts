"use server";

// Minimal placeholder for organization lookups used by pages during build.
// Replace with real DB logic when organizations table is available.
export async function getOrganizationBySlug(slug: string) {
  // Return a lightweight object that contains the properties callers expect.
  return {
    id: slug,
    name: `Organization ${slug}`,
    members: [],
  };
}
