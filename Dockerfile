# ── Stage 1: Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

# ── Stage 2: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (non-secret defaults)
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only production artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Memory directory for autonomous agent (writable at runtime)
RUN mkdir -p /app/src/data/memory/hypotheses \
             /app/src/data/memory/sessions \
             /app/src/data/memory/papers \
             /app/src/data/memory/knowledge \
             /app/src/data/memory/evidence && \
    chown -R nextjs:nodejs /app/src/data/memory

# Copy seed data
COPY --from=builder --chown=nextjs:nodejs /app/src/data /app/src/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
