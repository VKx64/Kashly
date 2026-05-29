# syntax=docker/dockerfile:1

# ---- Build the Vite/React frontend ----
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

# ---- Serve the static build with nginx ----
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
