import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getCurrentUser();

  // getCurrentUser returns null when the DB is temporarily unreachable
  // (e.g. pool exhaustion during heavy FFmpeg processing).
  if (!result) {
    redirect("/login");
  }

  const { currentUser } = result;
  const isAdmin = currentUser?.role === "admin";

  return (
    <DashboardShell currentUser={currentUser} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}
