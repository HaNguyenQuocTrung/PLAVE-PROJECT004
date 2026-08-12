import type { NextConfig } from "next";
import {
  assertProject004Workspace,
} from "./scripts/project004-identity.ts";
import { productionLocalBuildContract } from "./scripts/production-local-build-contract.ts";

const projectRoot = assertProject004Workspace(process.cwd(), {
  // Vercel checks out builds under an opaque ephemeral directory. Package,
  // Supabase project, and cache identity checks remain mandatory below.
  allowEphemeralDirectoryName: process.env.VERCEL === "1",
});
const isProductionLocal =
  process.env[productionLocalBuildContract.environmentFlag] === "true";
const isOwnerLocalDemo = process.env.PLAVE_OWNER_LOCAL_DEMO === "true";
const isProject004RemoteDevelopment =
  process.env.PLAVE_PROJECT004_REMOTE_RUNTIME_MODE ===
  "REMOTE_DEVELOPMENT";
const isProject004GeneratedPilot =
  isProject004RemoteDevelopment &&
  process.env.PLAVE_PROJECT004_GENERATED_PILOT_RUNTIME === "true";
const isGeneratorV2OwnerReview =
  isProject004RemoteDevelopment &&
  process.env.PLAVE_GENERATOR_V2_OWNER_REVIEW === "true";
const secretBoundaryAuditMode = process.env.PLAVE_SECRET_BOUNDARY_AUDIT_MODE;

const securityHeaders = [
  { key: "Content-Security-Policy", value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

const nextConfig: NextConfig = {
  distDir: secretBoundaryAuditMode === "DEV"
    ? ".next-secret-boundary-dev"
    : secretBoundaryAuditMode === "BUILD"
      ? ".next-secret-boundary-build"
    : isProductionLocal
      ? productionLocalBuildContract.distDirectory
    : isOwnerLocalDemo
    ? ".next-owner-local-project004"
    : isGeneratorV2OwnerReview
      ? ".next-generator-v2-owner-review"
    : isProject004GeneratedPilot
      ? ".next-generated-pilot-project004"
    : isProject004RemoteDevelopment
      ? ".next-remote-dev-project004"
      : ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders] }];
  },
  logging: isOwnerLocalDemo ? { incomingRequests: false } : undefined,
  typescript: {
    tsconfigPath: secretBoundaryAuditMode
      ? "tsconfig.secret-boundary.json"
      : isProductionLocal
      ? productionLocalBuildContract.tsconfigPath
      : isOwnerLocalDemo
      ? "tsconfig.owner-local.json"
      : "tsconfig.next.json",
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
