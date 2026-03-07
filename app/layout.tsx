import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import ClientMonitor from "@/components/client-monitor";
import ClientNavHelpers from "./ClientNavHelpers";

// Lazy-load non-critical client components to reduce initial compilation
// Remove dynamic imports for client components; use client wrappers instead

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Automated Video Editor — AI-Powered Video Style Transfer",
    template: "%s | Automated Video Editor",
  },
  description:
    "Professional AI-powered video editing platform. Clone any reference video's style — color grade, speed ramps, transitions — onto your target footage in one click.",
  keywords: ["video editor", "AI video", "style transfer", "video processing", "color grading", "speed ramp"],
  authors: [{ name: "Automated Video Editor" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Automated Video Editor",
    title: "Automated Video Editor — AI-Powered Video Style Transfer",
    description: "Clone any reference video's style onto your footage in one click.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Automated Video Editor",
    description: "AI-Powered Video Style Transfer Platform",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <ClientNavHelpers />
          <ClientMonitor />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}