import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "198.18.0.1"],
  devIndicators: false,
  experimental: {
    serverActions: {
      allowedOrigins: ["127.0.0.1", "127.0.0.1:3001", "localhost", "localhost:3001", "198.18.0.1:3001"]
    }
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
