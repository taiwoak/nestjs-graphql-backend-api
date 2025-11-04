# ---------- Stage 1: Build ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (include dev for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build

# ---------- Stage 2: Production ----------
FROM node:18-alpine

WORKDIR /app

# Copy only necessary artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

EXPOSE 3000

# Health check endpoint (use the /health route from your app)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start app
CMD ["node", "dist/main.js"]
