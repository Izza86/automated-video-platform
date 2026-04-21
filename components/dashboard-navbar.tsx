"use client";
import {
  Bell,
  Eye,
  Lock,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  UserCircle,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

interface DashboardNavbarProps {
  currentUser: any;
  onMenuToggle: () => void;
}

export function DashboardNavbar({
  currentUser,
  onMenuToggle,
}: DashboardNavbarProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    await router.prefetch("/login");
    router.push("/login");
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-30 h-16 border-amber-800/30 border-b bg-[#1a1408]/90 backdrop-blur-sm lg:left-64">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left: Hamburger (mobile) + Search */}
        <div className="flex max-w-xl flex-1 items-center gap-3">
          <button
            aria-label="Toggle sidebar"
            className="rounded-lg p-2 transition-colors hover:bg-white/5 lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5 text-gray-400" />
          </button>

          <div className="relative hidden flex-1 sm:block">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
            <input
              className="h-10 w-full rounded-lg border border-purple-900/30 bg-white/5 pr-4 pl-10 text-white placeholder-gray-400 focus:border-purple-600/50 focus:outline-none focus:ring-1 focus:ring-purple-600/30"
              placeholder="Search"
              type="text"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <button className="relative rounded-lg p-2 transition-colors hover:bg-white/5">
            <Bell className="h-5 w-5 text-gray-400 hover:text-white" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Online Status — hidden on mobile */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-400 text-sm">Online</span>
          </div>

          {/* Profile Dropdown */}
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/5">
                  {currentUser.image ? (
                    <img
                      alt={currentUser.name}
                      className="h-8 w-8 rounded-full border-2 border-purple-500 object-cover"
                      src={currentUser.image}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-purple-900/30 bg-[#1a1a1a]"
              >
                <DropdownMenuLabel className="text-white">
                  <div className="flex flex-col space-y-1">
                    <p className="font-semibold text-sm">{currentUser.name}</p>
                    <p className="font-normal text-gray-400 text-xs">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-purple-900/30" />

                {currentUser.role !== "admin" && (
                  <>
                    <DropdownMenuItem
                      asChild
                      className="text-gray-300 focus:bg-purple-600/20 focus:text-white"
                    >
                      <Link
                        className="flex items-center"
                        href="/dashboard/profile"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="text-gray-300 focus:bg-purple-600/20 focus:text-white"
                    >
                      <Link
                        className="flex items-center"
                        href="/dashboard/edit-profile"
                      >
                        <UserCircle className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="text-gray-300 focus:bg-purple-600/20 focus:text-white"
                    >
                      <Link
                        className="flex items-center"
                        href="/dashboard/change-password"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Change Password
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-purple-900/30" />
                  </>
                )}

                <DropdownMenuItem
                  asChild
                  className="text-gray-300 focus:bg-purple-600/20 focus:text-white"
                >
                  <Link
                    className="flex items-center"
                    href="/dashboard/settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-purple-900/30" />
                <DropdownMenuItem
                  className="cursor-pointer text-red-400 focus:bg-red-600/20 focus:text-red-300"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
              <User className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
