# Application-only Docker delivery

## Scope

The Docker image contains only the PLAVE Next.js application. It does not
contain PostgreSQL, Supabase services, migrations, seed data, content release
activation, email infrastructure or an AI provider. Starting the container
never applies database changes.

This workflow is a local delivery and CI artifact proof. It is not a deployment
and no image has been published to a registry.

## Architecture and prerequisites

The multi-stage `Dockerfile` builds Next.js `standalone` output with official
Node.js 22.16.0 `bookworm-slim`, pinned by immutable multi-platform digest. The
same definition supports `linux/arm64` and `linux/amd64`. The final stage runs as
UID/GID `1000:1000`, exposes container port 3000 and uses the side-effect-free
`/api/health/live` route.

Required local tools:

- Docker Engine/Desktop with Compose v2;
- the repository checkout and committed lockfile;
- an approved Supabase public URL and publishable key for authenticated flows.

The two `NEXT_PUBLIC_SUPABASE_*` values are browser-visible configuration. Next.js
embeds them during `docker build`, so rebuilding is required when the intended
public Supabase target changes. They are not database passwords, service-role
keys or substitutes for RLS.

## Safe configuration

Create a private Docker environment file without sending its contents through
chat or committing it:

```bash
cp .env.docker.example .env.docker.local
chmod 600 .env.docker.local
```

Replace only the two synthetic public placeholders. Do not add database
passwords, service-role keys or provider credentials. Compose explicitly keeps
Grades 2–9, adaptive practice, generated practice, on-demand generation and AI
Tutor disabled. Enabling those policies is outside this application-delivery
workflow.

## Build and run

```bash
npm run docker:verify
npm run docker:build
npm run docker:compose:up
```

Open <http://127.0.0.1:3100>. Compose maps loopback host port 3100 to container
port 3000 and never binds host port 3000.

Check status and logs without printing the environment:

```bash
docker compose --env-file .env.docker.local ps
docker compose --env-file .env.docker.local logs --no-log-prefix app
```

The liveness check is application-only:

```bash
curl --fail http://127.0.0.1:3100/api/health/live
```

It does not query Supabase or a provider. Authentication and persisted learning
still require the separately managed, schema-compatible Supabase target.

## Stop and cleanup

```bash
npm run docker:compose:down
```

This removes the application container and Compose network. It does not stop
the canonical localhost application, modify Supabase or remove the local image
cache. Re-run `npm run docker:build` after source or public build configuration
changes.

## Security controls

- final runtime is non-root and uses a direct Node command;
- Compose enables an init process, drops every Linux capability, sets
  `no-new-privileges`, and uses a read-only root filesystem;
- only bounded tmpfs mounts for `/tmp` and the Next.js cache are writable;
- no repository bind mount, named secret volume, Docker socket or host network;
- `.dockerignore` excludes Git metadata, private environment files, tests,
  non-runtime documentation, reports, dumps, logs and development output. The
  one allowlisted curriculum-status JSON file is a traced application build
  input, not handoff documentation;
- no lifecycle command applies migrations, seeds or remote operations;
- health responses expose no environment, commit, hostname or internal path.

## Troubleshooting

- **Port 3100 already in use:** stop only the disposable PLAVE Compose project or
  choose an explicitly reviewed override. Never stop the canonical port-3000
  listener as part of this workflow.
- **Missing variable during Compose parsing:** create `.env.docker.local` from
  the safe example and set both required public values.
- **Login cannot reach Auth:** verify that the image was rebuilt with the same
  intended public URL/key pair supplied at runtime and that the external
  Supabase project is reachable. Do not add a service-role key.
- **Image is unhealthy:** inspect application logs and
  `/api/health/live`. Database reachability is intentionally not part of
  liveness.
- **Source changes are absent:** rebuild; the production-demo service does not
  mount repository source.

Image publication to Docker Hub, GHCR or any other registry has not been
performed and is outside this repository handoff.
