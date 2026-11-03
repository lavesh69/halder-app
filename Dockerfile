# SPDX-License-Identifier: Apache-2.0
# HALDER — Production & Staging Multi-Stage Container

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS web-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/data/halder.db
ENV UPLOAD_DIR=/app/uploads

# Install SQLite CLI and curl for healthchecks
RUN apk add --no-cache sqlite curl bash

# Copy backend source & dependencies
COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY tsconfig*.json ./
COPY --from=web-builder /app/dist ./dist

# Create persistent storage directories
RUN mkdir -p /app/data /app/uploads /app/server/backups && \
    chown -R node:node /app

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

CMD ["node", "--import", "tsx", "server/src/server.ts"]
