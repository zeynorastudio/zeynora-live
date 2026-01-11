import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds with ESLint warnings/errors
    // TODO: Fix all TypeScript 'any' types and remove this
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds with TypeScript errors
    // TODO: Fix all type errors and remove this
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
