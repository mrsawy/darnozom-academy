# ── Build context must be the monorepo root ──
# docker build -f apps/client/Dockerfile .

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

ENV NPM_CONFIG_FETCH_TIMEOUT=600000
ENV NPM_CONFIG_FETCH_RETRIES=15

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY lib/shared-types/package.json lib/shared-types/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY apps/client apps/client
COPY lib/shared-types lib/shared-types
COPY tsconfig.json ./
RUN pnpm --filter @islamic-academy/shared-types run build
RUN pnpm --filter client run build

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
