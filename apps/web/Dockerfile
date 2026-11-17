# Use Node.js 18 LTS as base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files from root and apps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies (npm ci installs all dependencies from lockfile)
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# Build the application
# We need to set NEXT_PUBLIC_API_URL here if it's baked in, but for docker, we usually rely on runtime config or simple fetch.
# But often NEXT_PUBLIC vars are inlined at build time.
# The user env vars are in docker-compose.
ENV NEXT_TELEMETRY_DISABLED 1

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXTAUTH_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
# In standalone mode, Next.js outputs the necessary files to .next/standalone

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 5176

ENV PORT=5176
# HOSTNAME needs to be 0.0.0.0 for docker
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
