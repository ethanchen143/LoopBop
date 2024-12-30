import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
};

module.exports = {
  env: {
    MONGO_URI: process.env.MONGO_URI,
  },
};

export default nextConfig;