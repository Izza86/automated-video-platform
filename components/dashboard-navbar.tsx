
"use client";
import { useState, useEffect } from "react";

import Link from "next/link";
import { Search, Bell, User, Settings, LogOut, Eye, UserCircle, Lock, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface DashboardNavbarProps {
  currentUser: any;
  onMenuToggle: () => void;
}

export function DashboardNavbar({ currentUser, onMenuToggle }: DashboardNavbarProps) {
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
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 h-16 bg-[#1a1408]/90 backdrop-blur-sm border-b border-amber-800/30">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left: Hamburger (mobile) + Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>

          <div className="relative flex-1 hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full h-10 pl-10 pr-4 bg-white/5 border border-purple-900/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/30"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-400 hover:text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Online Status — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-400">Online</span>
          </div>

          {/* Profile Dropdown */}
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 hover:bg-white/5 rounded-lg transition-colors">
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-purple-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-purple-900/30">
                <DropdownMenuLabel className="text-white">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{currentUser.name}</p>
                    <p className="text-xs text-gray-400 font-normal">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-purple-900/30" />

                {currentUser.role !== "admin" && (
                  <>
                    <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-purple-600/20">
                      <Link href="/dashboard/profile" className="flex items-center">
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-purple-600/20">
                      <Link href="/dashboard/edit-profile" className="flex items-center">
                        <UserCircle className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-purple-600/20">
                      <Link href="/dashboard/change-password" className="flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-purple-900/30" />
                  </>
                )}

                <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-purple-600/20">
                  <Link href="/dashboard/settings" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-purple-900/30" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-400 focus:text-red-300 focus:bg-red-600/20 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
