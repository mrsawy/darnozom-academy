# ── Build context must be the monorepo root ──
# docker build -f apps/server/DockerFile .

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Slow or flaky links to registry.npmjs.org: raise limits + reuse store between builds (BuildKit).
ENV NPM_CONFIG_FETCH_TIMEOUT=600000
ENV NPM_CONFIG_FETCH_RETRIES=15

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY lib/shared-types/package.json lib/shared-types/
COPY scripts scripts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store

FROM deps AS build
COPY apps/server apps/server
COPY lib/shared-types lib/shared-types
COPY tsconfig.json ./
RUN mkdir -p node_modules/@darnozom \
    && ln -snf ../../lib/shared-types node_modules/@darnozom/shared-types
RUN pnpm --filter @darnozom/shared-types run build
RUN pnpm --filter server run build
# Standalone prod tree (hoisted linker requires --legacy). Avoids shipping the
# full monorepo node_modules into the runtime image / GHA cache.
RUN pnpm --filter server deploy --prod --legacy /prod/server \
    && cp -a /app/apps/server/dist /prod/server/dist \
    && rm -rf /prod/server/node_modules/@darnozom/shared-types \
    && mkdir -p /prod/server/node_modules/@darnozom \
    && cp -a /app/lib/shared-types /prod/server/node_modules/@darnozom/shared-types \
    && rm -rf /prod/server/node_modules/@darnozom/shared-types/src \
              /prod/server/node_modules/@darnozom/shared-types/node_modules \
              /prod/server/node_modules/@darnozom/shared-types/coverage

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/server ./
EXPOSE 3000
CMD ["node", "dist/apps/server/src/main.js"]
