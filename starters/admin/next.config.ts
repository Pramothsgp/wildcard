import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so workspace packages end up in the standalone build.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: ["@repo/auth", "@repo/data", "@repo/ui"],
  serverExternalPackages: ["pg"],
};

export default config;
