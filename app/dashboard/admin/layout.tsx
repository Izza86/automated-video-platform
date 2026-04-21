import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

/**
 * Admin layout guard — server-side role check.
 * Any non-admin user hitting /dashboard/admin/* gets redirected.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser) || auth.currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { currentUser } = auth;

  return <>{children}</>;
}
