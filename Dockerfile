# syntax=docker/dockerfile:1

# ---- Build the static bundle ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the committed lockfile for reproducible builds
COPY package.json package-lock.json* ./
RUN npm ci

# The PocketBase URL is baked into the bundle at BUILD time (Vite env).
# Point this at your existing PocketBase instance.
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

COPY . .
RUN npm run build

# ---- Serve the static files ----
# `serve` is a tiny static file server with SPA fallback (-s). Nginx Proxy
# Manager sits in front of this and handles domains/TLS.
FROM node:22-alpine AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
