# Multi-stage build for Invoice Merger CLI

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY electron ./electron
COPY cli ./cli

# Build TypeScript
RUN npm run build --if-present || npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/electron ./electron
COPY --from=builder /app/cli ./cli

# Create mount points for data
VOLUME ["/data", "/out"]

# Set CLI as entrypoint
ENTRYPOINT ["node", "cli/index.js"]

# Default command shows help
CMD ["--help"]

