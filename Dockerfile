# syntax=docker/dockerfile:1

# ============================================================
# Go build - compile application binary
# ============================================================
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS go-builder

WORKDIR /app
RUN apk add --no-cache git

# Download dependencies first (improves layer caching)
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy Go source files (excluding vendor, test files via .dockerignore)
COPY *.go ./
COPY internal/ ./internal/
COPY internal/config/ ./config/
COPY internal/models/ ./models/
COPY internal/repository/ ./repository/
COPY internal/errors/ ./errors/
COPY internal/database/ ./database/
COPY templates/ ./templates/

ARG TARGETOS
ARG TARGETARCH

# Optimized build with module and build cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 \
    GOOS=${TARGETOS:-linux} \
    GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags="-s -w" -o /portalon .

# ============================================================
# Frontend build - compile CSS/JS assets
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY tsconfig.json tailwind.config.js ./
COPY src/ ./src/
COPY static/css/ ./static/css/
COPY static/js/ ./static/js/
COPY templates/ ./templates/

RUN npm run build

# ============================================================
# Runtime - minimal final image
# ============================================================
FROM alpine:3.22

# Essential packages + non-root user creation
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -g 10001 -S portalon && \
    adduser -u 10001 -S portalon -G portalon && \
    mkdir -p /app/data && chown portalon:portalon /app/data

WORKDIR /app

# Copy Go binary and templates from builder
COPY --from=go-builder --chown=portalon:portalon /portalon ./portalon
COPY --from=go-builder --chown=portalon:portalon /app/templates ./templates

# Copy compiled frontend assets
COPY --from=frontend-builder --chown=portalon:portalon /app/static ./static

# Static files that don't go through build
COPY --chown=portalon:portalon static/icons ./static/icons/
COPY --chown=portalon:portalon static/logo ./static/logo/

# Copy locale files
COPY --chown=portalon:portalon src/locale /src/locale

USER portalon

# Environment variables
ENV PORTALON_DB_PATH=/app/data/portalon.db \
    PORTALON_PORT=8888

EXPOSE 8888

# Health check to verify container is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORTALON_PORT}/health || exit 1

ENTRYPOINT ["./portalon"]