"use client";

import {
  Activity,
  BarChart3,
  CheckSquare,
  CreditCard,
  Database,
  FileVideo,
  FolderOpen,
  Headphones,
  HelpCircle,
  Home,
  LayoutDashboard,
  Lock,
  Mail,
  Settings,
  Shield,
  Sliders,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Upload & Edit", href: "/dashboard/upload-edit", icon: Sliders },
  { name: "My Projects", href: "/dashboard/my-projects", icon: FileVideo },
  { name: "Templates", href: "/dashboard/templates", icon: LayoutDashboard },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNavigation = [
  { name: "User Management", href: "/dashboard/admin/users", icon: Users },
  { name: "Role & Permissions", href: "/dashboard/admin/roles", icon: Shield },
  { name: "User Activity", href: "/dashboard/admin/activity", icon: Activity },
  { name: "Account Management", href: "/dashboard/admin/accounts", icon: Lock },
  {
    name: "Content Moderation",
    href: "/dashboard/admin/content",
    icon: FolderOpen,
  },
  {
    name: "Analytics & Reports",
    href: "/dashboard/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "Billing & Revenue",
    href: "/dashboard/admin/billing",
    icon: CreditCard,
  },
  { name: "Communication", href: "/dashboard/admin/communication", icon: Mail },
  { name: "Quota Management", href: "/dashboard/admin/quotas", icon: Database },
  { name: "Bulk Operations", href: "/dashboard/admin/bulk", icon: CheckSquare },
  { name: "User Support", href: "/dashboard/admin/support", icon: Headphones },
];

export function DashboardSidebar({
  isAdmin = false,
  isOpen,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const navigation = isAdmin ? adminNavigation : baseNavigation;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 overflow-y-auto border-amber-800/30 border-r bg-[#1a1408] transition-transform duration-300 ease-in-out",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:z-40 lg:translate-x-0"
        )}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between border-purple-900/30 border-b px-6 py-6">
          <Link
            className="flex items-center gap-3"
            href="/dashboard"
            onClick={onClose}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
              <FileVideo className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">
                AUTOMATED
              </div>
              <div className="font-bold text-purple-400 text-sm leading-tight">
                VIDEO EDITOR
              </div>
            </div>
          </Link>
          <button
            className="rounded-lg p-1 transition-colors hover:bg-white/10 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <div className="border-purple-900/30 border-b bg-purple-600/10 px-6 py-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Shield className="h-4 w-4" />
              <span className="font-semibold text-xs">ADMIN PANEL</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1 px-4 py-6 pb-24">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200",
                  isActive
                    ? "border border-purple-600/30 bg-purple-600/20 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
                href={item.href}
                key={item.name}
                onClick={onClose}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Help & Support */}
        <div className="absolute right-0 bottom-0 left-0 border-amber-800/30 border-t bg-[#1a1408] p-4">
          <Link href="/dashboard/help" onClick={onClose}>
            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-medium text-gray-400 text-sm transition-all hover:bg-white/5 hover:text-white">
              <HelpCircle className="h-5 w-5 flex-shrink-0" />
              Help & Support
            </button>
          </Link>
        </div>
      </aside>
    </>
  );
}
