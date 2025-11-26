.PHONY: all build run test clean deps docker-build docker-run setup help
SHELL := /bin/bash

# Variables
APP_NAME=storage-service
MAIN_FILE=cmd/main.go

all: build

build: ## Build the application
	go build -o $(APP_NAME) $(MAIN_FILE)

run: ## Run the application
	go run $(MAIN_FILE)

test: ## Run tests
	go test -v ./...

clean: ## Clean build artifacts
	rm -f $(APP_NAME)

help: ## Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
