# syntax=docker/dockerfile:1
FROM node:26.12.1-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV GRID_SELF_HOSTED=1 NODE_ENV=production
RUN node node_modules/vinext/dist/cli.js build

FROM node:26.12.1-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production GRID_SELF_HOSTED=1 PORT=6000 HOST=0.0.0.0 GRID_DB_PATH=/data/grid.sqlite
COPY --from=build --chown=node:node /app/dist/standalone/ ./
COPY --from=build --chown=node:node /app/drizzle/ ./drizzle/
COPY --from=build --chown=node:node /app/deploy/start.mjs ./deploy/start.mjs
COPY --from=build --chown=node:node /app/deploy/check-feeds.mjs ./deploy/check-feeds.mjs
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 6000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "deploy/check-feeds.mjs", "--health"]
CMD ["node", "deploy/start.mjs"]
