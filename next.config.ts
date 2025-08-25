import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  
};

module.exports = {
  env: {
    MONGO_URI: process.env.MONGO_URI,
  },
  eslint: {
    // ⚠️ Ignores lint errors during `next build`
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;