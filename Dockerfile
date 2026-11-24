# ============================================================================
# Stage 1: Build Frontend SPA Assets (Vite 5 + React 18)
# ============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy dependency specifications and lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy shared definitions and frontend source
COPY tsconfig.base.json tsconfig.node.json tsconfig.json ./
COPY shared ./shared
COPY frontend ./frontend

# Build optimized production bundle
RUN npm run build:frontend

# ============================================================================
# Stage 2: Build Backend REST API (TypeScript 5 + Node.js)
# ============================================================================
FROM node:20-alpine AS backend-builder
WORKDIR /app

# Copy dependency specifications and lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy shared definitions and backend source
COPY tsconfig.base.json tsconfig.json ./
COPY shared ./shared
COPY backend ./backend

# Compile TypeScript into production JavaScript (dist/backend)
RUN npm run build:backend

# ============================================================================
# Stage 3: Minimal Production Runtime Container
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install security and process supervision utilities
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=5000

# Copy package descriptors and install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled backend output from builder
COPY --from=backend-builder /app/dist/backend ./dist/backend
COPY --from=backend-builder /app/shared ./shared

# Copy built frontend assets for unified distribution
COPY --from=frontend-builder /app/dist/frontend ./dist/frontend

# Create and set permissions for uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app

# Run as non-privileged security user
USER node

# Expose backend REST API port
EXPOSE 5000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Process management with dumb-init for graceful signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/backend/backend/src/server.js"]

