import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Enable React strict mode for better performance
  reactStrictMode: true,
  // Optimize output for production
  compress: true,
  // Generate ETags for caching
  generateEtags: true,
  // Disable powered by header
  poweredByHeader: false,
};

export default nextConfig;
