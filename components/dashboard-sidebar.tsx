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
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isAdmin?: boolean;
}

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
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

export function DashboardSidebar({ isAdmin = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  
  const navigation = isAdmin 
    ? adminNavigation
    : baseNavigation;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#0a0a0a] border-r border-purple-900/30 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-purple-900/30">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <FileVideo className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">AUTOMATED</div>
          <div className="text-purple-400 font-bold text-sm">VIDEO EDITOR</div>
        </div>
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
      <nav className="px-4 py-6 space-y-2 pb-24">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-purple-600/20 text-white border border-purple-600/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Help & Support */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-900/30 bg-[#0a0a0a]">
        <Link href="/dashboard/help">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 w-full transition-all">
            <HelpCircle className="w-5 h-5" />
            Help & Support
          </button>
        </Link>
      </div>
    </aside>
  );
}
