import type { NextConfig } from "next";

// Runs behind the custom server in server.ts (WebSockets), so no standalone output.
const config: NextConfig = {
  transpilePackages: ["@repo/auth", "@repo/data", "@repo/ui"],
  serverExternalPackages: ["pg"],
};

export default config;
