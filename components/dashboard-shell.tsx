"use client";

import { useCallback, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

interface DashboardShellProps {
  isAdmin: boolean;
  currentUser: any;
  children: React.ReactNode;
}

export function DashboardShell({
  isAdmin,
  currentUser,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-[#1a1408]">
      <DashboardSidebar
        isAdmin={isAdmin}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      <div className="transition-all duration-300 lg:ml-64">
        <DashboardNavbar
          currentUser={currentUser}
          onMenuToggle={toggleSidebar}
        />
        {children}
      </div>
    </div>
  );
}
