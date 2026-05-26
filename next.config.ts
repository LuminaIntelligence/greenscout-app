import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle in `.next/standalone/`
  // so the Docker `runner` stage can `node server.js` without the full
  // node_modules tree (CLAUDE.md §3 + T-007 Dockerfile.web).
  output: "standalone",

  experimental: {
    // Hotfix — image uploads moved from `POST /api/uploads` (Route
    // Handler) to a Server Action because production nginx returned
    // 502 specifically on the multipart Route Handler path while
    // forwarding Server Actions correctly. The default Server Action
    // bodySizeLimit is 1 MB; SPEC §4.6 allows images up to 10 MB. We
    // budget 15 MB to cover 10 MB payload + multipart-encoding
    // overhead. See DECISIONS.md → "Hotfix: Upload via Server Action
    // statt Route Handler".
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
