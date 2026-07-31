import type { NextConfig } from "next";
import {
  assertProject004Workspace,
} from "./scripts/project004-identity.ts";

const projectRoot = assertProject004Workspace();
const isOwnerLocalDemo = process.env.PLAVE_OWNER_LOCAL_DEMO === "true";
const isProject004RemoteDevelopment =
  process.env.PLAVE_PROJECT004_REMOTE_RUNTIME_MODE ===
  "REMOTE_DEVELOPMENT";
const isProject004GeneratedPilot =
  isProject004RemoteDevelopment &&
  process.env.PLAVE_PROJECT004_GENERATED_PILOT_RUNTIME === "true";

const nextConfig: NextConfig = {
  distDir: isOwnerLocalDemo
    ? ".next-owner-local-project004"
    : isProject004GeneratedPilot
      ? ".next-generated-pilot-project004"
    : isProject004RemoteDevelopment
      ? ".next-remote-dev-project004"
      : ".next",
  poweredByHeader: false,
  logging: isOwnerLocalDemo ? { incomingRequests: false } : undefined,
  typescript: {
    tsconfigPath: isOwnerLocalDemo
      ? "tsconfig.owner-local.json"
      : "tsconfig.next.json",
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
