# Great Spring Solutions - Production Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# STAGE 1: Base dependencies
# =============================================================================
FROM node:24-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc .npmrc 2>/dev/null || true

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# =============================================================================
# STAGE 2: Build stage
# =============================================================================
FROM base AS builder

# Install all dependencies (including devDependencies)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Wasp app
RUN npx wasp build

# =============================================================================
# STAGE 3: Production runtime
# =============================================================================
FROM node:24-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.wasp/out/. /app/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/. /app/node_modules/
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/prisma/. /app/prisma/

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", ".wasp/out/server/index.js"]