# ── Build context must be the monorepo root ──
# docker build -f apps/server/Dockerfile .

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

ENV NPM_CONFIG_FETCH_TIMEOUT=600000
ENV NPM_CONFIG_FETCH_RETRIES=15

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY lib/shared-types/package.json lib/shared-types/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store

FROM deps AS build
COPY apps/server apps/server
COPY lib/shared-types lib/shared-types
COPY tsconfig.json ./
RUN pnpm --filter @islamic-academy/shared-types run build
RUN pnpm --filter server run build
RUN pnpm --filter server deploy --prod --legacy /prod/server \
    && cp -a /app/apps/server/dist /prod/server/dist \
    && rm -rf /prod/server/node_modules/@islamic-academy/shared-types \
    && mkdir -p /prod/server/node_modules/@islamic-academy \
    && cp -a /app/lib/shared-types /prod/server/node_modules/@islamic-academy/shared-types \
    && rm -rf /prod/server/node_modules/@islamic-academy/shared-types/src \
              /prod/server/node_modules/@islamic-academy/shared-types/node_modules

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/server ./
EXPOSE 3000
CMD ["node", "dist/apps/server/src/main.js"]
