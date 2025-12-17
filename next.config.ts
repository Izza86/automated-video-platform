import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: '1000mb', // Increase limit to 1GB for video uploads
  },
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'fluent-ffmpeg'],
  },
};

export default nextConfig;
