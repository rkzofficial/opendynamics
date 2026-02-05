# ============================================
# Stage 1: Dependencies
# ============================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy package files for dependency caching
COPY package.json bun.lock* ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (convex/_generated is committed per Convex best practices)
COPY . .

# Build the Nuxt application with bun preset
ENV NITRO_PRESET=bun
RUN bun run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nuxt && \
    adduser --system --uid 1001 --ingroup nuxt nuxt

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy only the built output (minimal footprint)
COPY --from=builder --chown=nuxt:nuxt /app/.output ./.output

# Switch to non-root user
USER nuxt

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["bun", "run", ".output/server/index.mjs"]
