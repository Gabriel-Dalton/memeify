import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project folder. Without this, Turbopack
  // detects the stray C:\Users\Gabriel\package-lock.json and treats the
  // home directory as the root — which also makes it read .env.local from
  // the wrong place, causing "Supabase is not configured" at runtime.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
