"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileVideo,
  BarChart3,
  Settings,
  HelpCircle,
  LayoutDashboard,
  Shield,
  Users,
  Activity,
  Lock,
  FolderOpen,
  Database,
  Mail,
  Sliders,
  CheckSquare,
  Headphones,
  CreditCard,
  X,
} from "lucide-react";
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
  { name: "Content Moderation", href: "/dashboard/admin/content", icon: FolderOpen },
  { name: "Analytics & Reports", href: "/dashboard/admin/analytics", icon: BarChart3 },
  { name: "Billing & Revenue", href: "/dashboard/admin/billing", icon: CreditCard },
  { name: "Communication", href: "/dashboard/admin/communication", icon: Mail },
  { name: "Quota Management", href: "/dashboard/admin/quotas", icon: Database },
  { name: "Bulk Operations", href: "/dashboard/admin/bulk", icon: CheckSquare },
  { name: "User Support", href: "/dashboard/admin/support", icon: Headphones },
];

export function DashboardSidebar({ isAdmin = false, isOpen, onClose }: DashboardSidebarProps) {
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
          "fixed left-0 top-0 z-50 h-screen w-64 bg-[#1a1408] border-r border-amber-800/30 overflow-y-auto transition-transform duration-300 ease-in-out",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:translate-x-0 lg:z-40"
        )}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-purple-900/30">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              <FileVideo className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">AUTOMATED</div>
              <div className="text-purple-400 font-bold text-sm leading-tight">VIDEO EDITOR</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <div className="px-6 py-3 bg-purple-600/10 border-b border-purple-900/30">
            <div className="flex items-center gap-2 text-purple-400">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold">ADMIN PANEL</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-1 pb-24">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-purple-600/20 text-white border border-purple-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Help & Support */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-amber-800/30 bg-[#1a1408]">
          <Link href="/dashboard/help" onClick={onClose}>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 w-full transition-all">
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              Help & Support
            </button>
          </Link>
        </div>
      </aside>
    </>
  );
}
