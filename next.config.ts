import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle in `.next/standalone/`
  // so the Docker `runner` stage can `node server.js` without the full
  // node_modules tree (CLAUDE.md §3 + T-007 Dockerfile.web).
  output: "standalone",
};

export default nextConfig;
