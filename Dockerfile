# syntax=docker/dockerfile:1.7

# ---- Base image ------------------------------------------------------------
# Node 22 LTS on Alpine — slim, fast cold starts, matches devDependencies.
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

# ---- Dependencies stage ----------------------------------------------------
# Install full deps (dev + prod) once and reuse via the cache mount.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build stage -----------------------------------------------------------
# Compiles client (Vite → dist/public) and server (esbuild → dist/index.js).
# VITE_* values are baked here; pass them via --build-arg if you have them.
FROM base AS build
ARG VITE_OAUTH_PORTAL_URL=""
ARG VITE_APP_ID=""
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Runtime stage ---------------------------------------------------------
# Slim image with only production deps + built artifacts.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

# Reinstall only production deps to keep the image lean.
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Bring in the built bundle.
COPY --from=build /app/dist ./dist

# Run as the unprivileged node user that ships with the base image.
USER node

EXPOSE 3000

# Lightweight TCP healthcheck — succeeds once Express is listening.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "start"]
