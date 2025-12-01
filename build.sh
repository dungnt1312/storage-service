go build -o storage-service cmd/main.go
cd client
bun install
rm -rf dist
bun run build