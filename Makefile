.PHONY: all build frontend backend run clean

all: build

build: frontend backend

frontend:
	@echo "==> Building Frontend..."
	cd frontend && pnpm install && pnpm build

backend:
	@echo "==> Embedding and Building Go Single-Binary..."
	mkdir -p backend/dist
	cp -r frontend/dist/* backend/dist/
	cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o ../mail-server .

run:
	cd backend && go run .

clean:
	rm -rf frontend/dist backend/dist mail-server backend/mail-server.exe
