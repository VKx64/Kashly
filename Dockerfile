# syntax=docker/dockerfile:1

FROM node:22-alpine
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

# Serve the static build with Vite's built-in preview server (SPA fallback included)
EXPOSE 80
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "80"]
