import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo lives inside a home folder that has its own package-lock.json.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
