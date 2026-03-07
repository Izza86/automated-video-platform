import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/users";

/**
 * Admin layout guard — server-side role check.
 * Any non-admin user hitting /dashboard/admin/* gets redirected.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = await getCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
