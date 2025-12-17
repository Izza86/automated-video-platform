import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { getCurrentUser } from "@/server/users";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = await getCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="ml-64">
        <DashboardNavbar currentUser={currentUser} />
        {children}
      </div>
    </div>
  );
}
