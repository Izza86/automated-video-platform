import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_EAGER_COMPONENT_BUNDLE: "true",
  },
  // ─── Externalize heavy backend-only / AI libraries ───────────────
  // These are never needed in the browser bundle and would massively
  // slow down Turbopack compilation if it tried to resolve them.
  serverExternalPackages: [
    "torch",
    "tensorflow",
    "canvas",
    "onnxruntime-node",
    "sharp",
    "@ffmpeg/ffmpeg",
    "@ffmpeg/util",
    "child_process",
    "fluent-ffmpeg",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Proxy timeout must cover the full processing duration.
    // 600 000 ms = 10 minutes — matches the route-level maxDuration.
    proxyTimeout: 600_000,
    serverSourceMaps: false,
    // Optimise barrel-file re-exports: tree-shake unused members at
    // module-graph level so `export *` barrels don't pull everything.
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@react-email/components",
    ],
  },
  // Turbopack configuration (top-level in Next.js 15+)
  turbopack: {
    rules: {
      // Skip source-map processing for heavy deps
      "*.map": { loaders: [] },
    },
    resolveAlias: {
      // Force Turbopack to skip source-map resolution for noisy packages
    },
  },
  // Suppress noisy source-map warnings in dev terminal
  webpack: (config, { dev }) => {
    if (dev) {
      config.ignoreWarnings = [
        { message: /Invalid source map/ },
        { message: /sourceMapURL could not be parsed/ },
      ];
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  reactStrictMode: true,
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
};

export default nextConfig;
