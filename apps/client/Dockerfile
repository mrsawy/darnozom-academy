# ── Build context must be the monorepo root ──
# docker build -f apps/client/DockerFile .

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Slow or flaky links to registry.npmjs.org: raise limits + reuse store between builds (BuildKit).
ENV NPM_CONFIG_FETCH_TIMEOUT=600000
ENV NPM_CONFIG_FETCH_RETRIES=15

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY lib/shared-types/package.json lib/shared-types/
# Referenced from the root package.json: pnpm.patchedDependencies, the
# react-native-keyboard-controller `file:` override, and the postinstall script.
COPY patches patches
COPY scripts scripts
COPY apps/lms-mobile/shims apps/lms-mobile/shims
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store

FROM deps AS build
# Build-time public env (GitHub Actions passes these as --build-arg).
# ENV ensures Next.js inlines them into the client bundle during `pnpm build`.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_S3_BUCKET_NAME
ARG NEXT_PUBLIC_S3_REGION
ARG NEXT_PUBLIC_CLOUDFRONT_DOMAIN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_S3_BUCKET_NAME=$NEXT_PUBLIC_S3_BUCKET_NAME \
    NEXT_PUBLIC_S3_REGION=$NEXT_PUBLIC_S3_REGION \
    NEXT_PUBLIC_CLOUDFRONT_DOMAIN=$NEXT_PUBLIC_CLOUDFRONT_DOMAIN

COPY apps/client apps/client
COPY lib/shared-types lib/shared-types
COPY tsconfig.json ./
RUN pnpm --filter @lms-organization/shared-types run build
RUN pnpm --filter client run build

# standalone output (with outputFileTracingRoot = monorepo root) produces:
#   apps/client/.next/standalone/          → node_modules + apps/client/server.js
#   apps/client/.next/static/              → static assets (not in standalone)
#   apps/client/public/                    → public files  (not in standalone)

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/apps/client/.next/standalone ./
COPY --from=build /app/apps/client/.next/static ./apps/client/.next/static
COPY --from=build /app/apps/client/public ./apps/client/public

EXPOSE 3000
WORKDIR /app/apps/client
CMD ["node", "server.js"]
