.PHONY: help dev build-renderer build-electron package-win docker-build docker-run cli clean test

help:
	@echo "Invoice Merger - Makefile Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Run Next.js dev server and Electron"
	@echo "  make cli              - Run CLI locally via tsx"
	@echo ""
	@echo "Build:"
	@echo "  make build-renderer   - Build Next.js static export"
	@echo "  make build-electron   - Build Electron app"
	@echo "  make package-win      - Package Windows .exe (requires Windows or Wine)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build Docker image for CLI"
	@echo "  make docker-run       - Run Docker container (example)"
	@echo ""
	@echo "Utilities:"
	@echo "  make test             - Run tests"
	@echo "  make clean            - Clean build artifacts"

# Development
dev:
	npm run dev

cli:
	npm run cli -- $(ARGS)

# Build
build-renderer:
	npm run build:renderer

build-electron:
	npm run build:electron

package-win:
	npm run make -- --platform=win32 --arch=x64

# Docker
docker-build:
	docker build -t invoice-merger:latest .

docker-run:
	@echo "Example: Scan base directory"
	docker run --rm \
		-v "$(PWD)/test-data:/data" \
		-v "$(PWD)/output:/out" \
		invoice-merger:latest \
		scan --base /data

docker-merge:
	@echo "Example: Merge for a client"
	docker run --rm \
		-v "$(PWD)/test-data:/data" \
		-v "$(PWD)/output:/out" \
		invoice-merger:latest \
		merge --base /data --client "Acme Corp" --fy 25 --month 04-25 --out /out

# Testing
test:
	npm test

# Clean
clean:
	npm run clean
	@echo "Cleaned build artifacts"

clean-all:
	npm run clean
	rm -rf node_modules package-lock.json
	@echo "Cleaned everything - run npm install to reinstall"

