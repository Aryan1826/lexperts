# ─── LExperts Frontend — Multi-Stage Production Dockerfile ───────────────────

# ── Stage 1: Build React / Vite app ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Vite reads VITE_* env vars at BUILD time.
# In production (Docker / EC2), the frontend talks to Nginx on the same host,
# which proxies /api/* to the backend container — so we use a relative path.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SERVER_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm run build
# Output → /app/dist

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove Nginx's default placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy built React files from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config (handles React Router + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
