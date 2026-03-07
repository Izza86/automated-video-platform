"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

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
      href={href}
      className={className}
      prefetch={href?.startsWith("/") ?? false}
      onClick={() => setOpen(false)}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#1a1408]/90 backdrop-blur-sm border-b border-amber-700/50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <NavLink href="/" className="flex items-center gap-4 group">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <Image
              src="/logoimage.png"
              alt="Automated Video Editor Logo"
              width={80}
              height={80}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="text-lg sm:text-xl lg:text-2xl font-bold tracking-wide text-white group-hover:text-purple-400 transition-colors">
            AUTOMATED VIDEO <span className="text-purple-400">EDITOR</span>
          </span>
        </NavLink>

        {/* Desktop Menu */}
        <div
          className="hidden md:flex items-center space-x-6 relative"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {[
            { label: "Features", href: "#features", idx: 0, size: "text-base" },
            { label: "Pricing", href: "#pricing", idx: 1, size: "text-base" },
            { label: "About", href: "#about", idx: 2, size: "text-sm" },
          ].map((item) => (
            <a
              key={item.idx}
              href={item.href}
              className={`text-white/90 hover:text-white transition-all duration-300 ${item.size} font-medium px-4 py-2 relative z-10`}
              onMouseEnter={() => setHoveredIndex(item.idx)}
              onClick={() => setOpen(false)}
            >
              <span className="relative z-10">{item.label}</span>
              <span
                className={`absolute inset-0 bg-gradient-to-r from-pink-500/30 via-pink-400/25 to-pink-500/30 rounded-lg blur-sm transition-all duration-300 ease-out ${hoveredIndex === item.idx ? "scale-110 opacity-100" : "scale-75 opacity-0"}`}
              />
              <span
                className={`absolute inset-0 bg-pink-500/15 rounded-lg transition-all duration-300 ease-out ${hoveredIndex === item.idx ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              />
            </a>
          ))}

          {/* Animated underline */}
          <span
            className={`absolute bottom-0 h-0.5 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-full transition-all duration-300 ease-out ${hoveredIndex !== null ? "opacity-100" : "opacity-0"}`}
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
            href="/login"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-300 font-medium text-sm shadow-lg shadow-purple-900/50 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 ml-4"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {open && (
        <div className="md:hidden bg-[#1a1408]/90 backdrop-blur-sm px-4 py-4 space-y-4 border-t border-white/10">
          <NavLink href="#features" className="block text-white/80 hover:text-white text-base">
            Features
          </NavLink>
          <NavLink href="#pricing" className="block text-white/80 hover:text-white text-base">
            Pricing
          </NavLink>
          <NavLink href="#about" className="block text-white/80 hover:text-white text-base">
            About
          </NavLink>
          <Link
            href="/login"
            className="block w-full text-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition text-base"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
