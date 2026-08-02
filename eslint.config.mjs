import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".next-owner-local-project004/**",
    ".next-remote-dev-project004/**",
    ".next-generated-pilot-project004/**",
    ".sprint-10b-runtime-*/**",
    ".sprint-10b-secret-*/**",
    "out/**",
    "build/**",
    "supabase/.temp/**",
    "next-env.d.ts",
  ]),
]);
