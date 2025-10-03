.PHONY: help install uninstall test clean build lint

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install CLI globally for local testing (npm link)
	@echo "📦 Installing CLI globally for local testing..."
	npm link
	@echo "✅ Done! You can now run: lint-react-effects <files>"

uninstall: ## Uninstall globally linked CLI
	@echo "🗑️  Uninstalling global CLI..."
	npm unlink -g eslint-plugin-react-you-might-not-need-an-effect
	@echo "✅ Done!"

test: ## Run tests
	@echo "🧪 Running tests..."
	npm test

test-cli: ## Test CLI with sample file
	@echo "🔍 Testing CLI with JSX..."
	@echo "import { useState, useEffect } from 'react';\n\nfunction Test() {\n  const [a, setA] = useState(0);\n  const [b, setB] = useState(0);\n  useEffect(() => { setB(a * 2); }, [a]);\n  return <div>{b}</div>;\n}" > .test-cli-sample.jsx
	@./bin/lint-react-effects.ts .test-cli-sample.jsx || true
	@rm -f .test-cli-sample.jsx
	@echo ""
	@echo "🔍 Testing CLI with TSX..."
	@echo "import { useState, useEffect } from 'react';\n\ninterface Props {\n  value: number;\n}\n\nfunction Test({ value }: Props) {\n  const [doubled, setDoubled] = useState<number>(0);\n  useEffect(() => { setDoubled(value * 2); }, [value]);\n  return <div>{doubled}</div>;\n}" > .test-cli-sample.tsx
	@./bin/lint-react-effects.ts .test-cli-sample.tsx || true
	@rm -f .test-cli-sample.tsx
	@echo "✅ CLI test complete!"

build: ## Build CommonJS distribution
	@echo "🔨 Building..."
	npm run build
	@echo "✅ Build complete!"

lint: ## Run linter
	@echo "🔍 Running linter..."
	npm run lint

clean: ## Clean build artifacts and temp files
	@echo "🧹 Cleaning..."
	rm -rf dist/
	rm -rf node_modules/.cache
	@echo "✅ Clean complete!"

dev-setup: install ## Setup development environment
	@echo "🚀 Development environment ready!"
	@echo ""
	@echo "Quick start:"
	@echo "  lint-react-effects src/**/*.jsx"
	@echo ""
	@echo "Run 'make help' to see all available commands"

check: lint test ## Run all checks (lint + test)
	@echo "✅ All checks passed!"
