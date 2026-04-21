"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface NavLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
}

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const NavLink = ({ href, className, children }: NavLinkProps) => (
    <Link
      className={className}
      href={href}
      onClick={() => setOpen(false)}
      prefetch={href?.startsWith("/") ?? false}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-amber-700/50 border-b bg-[#1a1408]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <NavLink className="group flex items-center gap-4" href="/">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20">
            <Image
              alt="Automated Video Editor Logo"
              className="h-full w-full object-contain"
              height={80}
              priority
              src="/logoimage.png"
              width={80}
            />
          </div>
          <span className="font-bold text-lg text-white tracking-wide transition-colors group-hover:text-purple-400 sm:text-xl lg:text-2xl">
            AUTOMATED VIDEO <span className="text-purple-400">EDITOR</span>
          </span>
        </NavLink>

        {/* Desktop Menu */}
        <div
          className="relative hidden items-center space-x-6 md:flex"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {[
            { label: "Features", href: "#features", idx: 0, size: "text-base" },
            { label: "Pricing", href: "#pricing", idx: 1, size: "text-base" },
            { label: "About", href: "#about", idx: 2, size: "text-sm" },
          ].map((item) => (
            <a
              className={`text-white/90 transition-all duration-300 hover:text-white ${item.size} relative z-10 px-4 py-2 font-medium`}
              href={item.href}
              key={item.idx}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setHoveredIndex(item.idx)}
            >
              <span className="relative z-10">{item.label}</span>
              <span
                className={`absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500/30 via-pink-400/25 to-pink-500/30 blur-sm transition-all duration-300 ease-out ${hoveredIndex === item.idx ? "scale-110 opacity-100" : "scale-75 opacity-0"}`}
              />
              <span
                className={`absolute inset-0 rounded-lg bg-pink-500/15 transition-all duration-300 ease-out ${hoveredIndex === item.idx ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              />
            </a>
          ))}

          {/* Animated underline */}
          <span
            className={`absolute bottom-0 h-0.5 rounded-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 transition-all duration-300 ease-out ${hoveredIndex !== null ? "opacity-100" : "opacity-0"}`}
            style={{
              width: hoveredIndex !== null ? "60px" : "0px",
              left:
                hoveredIndex === 0
                  ? "0px"
                  : hoveredIndex === 1
                    ? "100px"
                    : hoveredIndex === 2
                      ? "200px"
                      : "0px",
              transform: "translateX(12px)",
            }}
          />

          <Link
            className="ml-4 rounded-xl bg-purple-600 px-4 py-2 font-medium text-sm text-white shadow-lg shadow-purple-900/50 transition-all duration-300 hover:scale-105 hover:bg-purple-700 hover:shadow-purple-500/50 hover:shadow-xl"
            href="/login"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button className="text-white md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {open && (
        <div className="space-y-4 border-white/10 border-t bg-[#1a1408]/90 px-4 py-4 backdrop-blur-sm md:hidden">
          <NavLink
            className="block text-base text-white/80 hover:text-white"
            href="#features"
          >
            Features
          </NavLink>
          <NavLink
            className="block text-base text-white/80 hover:text-white"
            href="#pricing"
          >
            Pricing
          </NavLink>
          <NavLink
            className="block text-base text-white/80 hover:text-white"
            href="#about"
          >
            About
          </NavLink>
          <Link
            className="block w-full rounded-xl bg-purple-600 px-4 py-2 text-center text-base text-white transition hover:bg-purple-700"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
