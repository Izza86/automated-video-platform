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
    <nav className="fixed top-0 left-0 z-50 w-full">
      {/* Animated Rotating Glow Shadow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Outer rotating glow */}
        <div className="absolute inset-[-2px] bg-gradient-to-r from-pink-500 via-purple-500 via-pink-400 via-purple-400 to-pink-500 rounded-none animate-spin-slow opacity-70 blur-sm" style={{ animationDuration: '4s' }} />
        {/* Middle glow layer */}
        <div className="absolute inset-[-1px] bg-gradient-to-r from-purple-500 via-pink-500 via-purple-400 via-pink-400 to-purple-500 rounded-none animate-spin-slow opacity-50 blur-md" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
        {/* Inner subtle glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 animate-pulse opacity-30" />
      </div>
      
      {/* Navbar Content with Pinkish Background */}
      <div className="relative bg-gradient-to-r from-pink-900/95 via-purple-900/95 via-pink-800/95 to-purple-900/95 backdrop-blur-md border-b border-pink-500/30 shadow-lg shadow-pink-500/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <NavLink className="group flex items-center gap-4" href="/">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 drop-shadow-lg drop-shadow-pink-500/30">
            <Image
              alt="Automated Video Editor Logo"
              className="h-full w-full object-contain"
              height={80}
              priority
              src="/logoooooooooooooooo.png"
              width={80}
            />
          </div>
          <span className="font-bold text-lg text-white tracking-wide transition-colors group-hover:text-pink-300 sm:text-xl lg:text-2xl drop-shadow-lg">
            AUTOMATED VIDEO <span className="text-pink-400 drop-shadow-lg drop-shadow-pink-500/50">EDITOR</span>
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
              className={`text-white/90 transition-all duration-300 hover:text-pink-300 ${item.size} relative z-10 px-4 py-2 font-medium`}
              href={item.href}
              key={item.idx}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setHoveredIndex(item.idx)}
            >
              <span className="relative z-10 drop-shadow-md">{item.label}</span>
              <span
                className={`absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500/40 via-purple-400/30 to-pink-500/40 blur-sm transition-all duration-300 ease-out ${hoveredIndex === item.idx ? "scale-110 opacity-100" : "scale-75 opacity-0"}`}
              />
              <span
                className={`absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 transition-all duration-300 ease-out ${hoveredIndex === item.idx ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              />
            </a>
          ))}

          {/* Animated underline - Pink/Purple */}
          <span
            className={`absolute bottom-0 h-0.5 rounded-full bg-gradient-to-r from-pink-400 via-purple-500 to-pink-400 transition-all duration-300 ease-out ${hoveredIndex !== null ? "opacity-100" : "opacity-0"} shadow-lg shadow-pink-500/50`}
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
            className="ml-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 font-medium text-sm text-white shadow-lg shadow-pink-500/50 transition-all duration-300 hover:scale-105 hover:from-pink-400 hover:to-purple-500 hover:shadow-pink-400/50 hover:shadow-xl border border-pink-400/30"
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
        <div className="relative space-y-4 border-pink-500/30 border-t bg-gradient-to-b from-pink-900/95 to-purple-900/95 px-4 py-4 backdrop-blur-md md:hidden shadow-lg shadow-pink-500/20">
          <NavLink
            className="block text-base text-white/90 hover:text-pink-300 transition-colors"
            href="#features"
          >
            Features
          </NavLink>
          <NavLink
            className="block text-base text-white/90 hover:text-pink-300 transition-colors"
            href="#pricing"
          >
            Pricing
          </NavLink>
          <NavLink
            className="block text-base text-white/90 hover:text-pink-300 transition-colors"
            href="#about"
          >
            About
          </NavLink>
          <Link
            className="block w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-center text-base text-white transition-all hover:from-pink-400 hover:to-purple-500 border border-pink-400/30"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
      </div>
    </nav>
  );
}
