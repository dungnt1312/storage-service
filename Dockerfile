# Build stage for frontend
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/client
COPY client/package.json client/bun.lockb* ./
RUN bun install --frozen-lockfile
COPY client/ ./
RUN bun run build

# Build stage for backend
FROM golang:1.24-bookworm AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o storage-service cmd/main.go

# Final stage
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

# Copy binary
COPY --from=backend-builder /app/storage-service .

# Copy frontend dist
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8080

# Set environment variables
ENV GIN_MODE=release

CMD ["./storage-service"]
