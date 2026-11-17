# Use Node.js 18 LTS as base image
FROM node:20-alpine AS base

# Install dependencies for build (including dev)
FROM base AS deps
WORKDIR /app

# Copy package files from workspace root and api
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies so build tools (devDependencies) are available
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api ./apps/api
WORKDIR /app/apps/api

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application and prisma files from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nestjs

EXPOSE 8085

ENV PORT=8085

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
