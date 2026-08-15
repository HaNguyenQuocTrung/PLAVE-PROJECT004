FROM docker.io/library/node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS dependencies
WORKDIR /workspace/PLAVE-PROJECT004

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

FROM docker.io/library/node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS builder
WORKDIR /workspace/PLAVE-PROJECT004

COPY --from=dependencies /workspace/PLAVE-PROJECT004/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAVE_DOCKER_BUILD=true \
    PLAVE_GRADES_2_9_RELEASE_MODE=HIDDEN \
    PLAVE_CURRICULUM_RUNTIME_ENABLED=false \
    PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED=false \
    PLAVE_CONTROLLED_PILOT_ENABLED=false \
    PLAVE_RETENTION_RUNTIME_ENABLED=false \
    PLAVE_AI_TUTOR_ENABLED=false \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

RUN node -e "for (const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) { if (!process.env[key]) throw new Error('DOCKER_PUBLIC_CONFIGURATION_MISSING') }" \
  && npm run --silent build:docker

FROM docker.io/library/node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="PLAVE application" \
      org.opencontainers.image.description="Application-only Next.js runtime for PLAVE Project004" \
      org.opencontainers.image.version="0.1.0"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=1000:1000 /workspace/PLAVE-PROJECT004/public ./public
COPY --from=builder --chown=1000:1000 /workspace/PLAVE-PROJECT004/.next/standalone ./
COPY --from=builder --chown=1000:1000 /workspace/PLAVE-PROJECT004/.next/static ./.next/static

USER 1000:1000
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live',{cache:'no-store'}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT []
CMD ["node", "server.js"]
