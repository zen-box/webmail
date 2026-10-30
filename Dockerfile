# Stage 1: Build Frontend (React 19 + HeroUI v3)
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Build Backend Single Binary (Go + JMAP + Embed)
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./dist
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /mail-server .

# Stage 3: Minimal Scratch / Distroless Runtime (< 25MB)
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=backend-builder /mail-server /mail-server
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/mail-server"]
