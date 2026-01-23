import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static01.nyt.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.nyt.com",
        pathname: "/**",
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
