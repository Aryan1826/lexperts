# ─── LExperts Backend — Production Dockerfile ────────────────────────────────
FROM node:20-alpine

# dumb-init: ensures Node.js receives SIGTERM properly (graceful shutdown)
RUN apk add --no-cache dumb-init

# Non-root user already exists in node:alpine as uid 1000
WORKDIR /app

# Copy package files first — Docker caches this layer
# Only reinstalls when package.json / package-lock.json change
COPY package.json package-lock.json ./

# Install production deps only (no nodemon, no axios devDep)
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Create upload + log directories
# (Docker named volumes will mount here — files persist across restarts)
RUN mkdir -p uploads/bookings uploads/sanad logs \
    && chown -R node:node /app

# Switch to non-root user for security
USER node

EXPOSE 5001

# dumb-init wraps node so SIGTERM is forwarded correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
