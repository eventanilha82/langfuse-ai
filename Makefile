APP_ENV_FILE ?= .env
LANGFUSE_ENV_FILE ?= langfuse.env
LANGFUSE_COMPOSE ?= docker-compose.yml
DOCKER_COMPOSE ?= docker-compose
UV_CACHE_DIR ?= /private/tmp/langfuse-ai-uv-cache
NPM_CONFIG_CACHE ?= /private/tmp/langfuse-ai-npm-cache
TRACE_LOAD_BASE_URL ?= http://127.0.0.1:8787
TRACE_LOAD_COUNT ?= 30
TRACE_LOAD_DELAY ?= 0

.PHONY: init-env setup-app langfuse-up langfuse-down langfuse-logs backend frontend frontend-build seed-prompt load-traces trace-load clear-prompt-cache prompt-cache-clear test validate

init-env:
	cp -n .env.example .env || true
	cp -n langfuse.env.example $(LANGFUSE_ENV_FILE) || true

setup-app:
	cd backend && UV_CACHE_DIR=$(UV_CACHE_DIR) uv sync
	cd frontend && npm_config_cache=$(NPM_CONFIG_CACHE) npm install

langfuse-up: init-env
	$(DOCKER_COMPOSE) --env-file $(LANGFUSE_ENV_FILE) -f $(LANGFUSE_COMPOSE) up

langfuse-down:
	$(DOCKER_COMPOSE) --env-file $(LANGFUSE_ENV_FILE) -f $(LANGFUSE_COMPOSE) down

langfuse-logs:
	$(DOCKER_COMPOSE) --env-file $(LANGFUSE_ENV_FILE) -f $(LANGFUSE_COMPOSE) logs -f langfuse-web langfuse-worker

backend:
	cd backend && UV_CACHE_DIR=$(UV_CACHE_DIR) uv run uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload

frontend:
	cd frontend && npm_config_cache=$(NPM_CONFIG_CACHE) npm run dev

frontend-build:
	cd frontend && npm_config_cache=$(NPM_CONFIG_CACHE) npm run build

seed-prompt:
	cd backend && UV_CACHE_DIR=$(UV_CACHE_DIR) uv run python scripts/publish_prompt.py

load-traces:
	cd backend && UV_CACHE_DIR=$(UV_CACHE_DIR) uv run python scripts/load_interactions.py --base-url $(TRACE_LOAD_BASE_URL) --count $(TRACE_LOAD_COUNT) --delay $(TRACE_LOAD_DELAY)

trace-load: load-traces

clear-prompt-cache:
	scripts/clear_langfuse_prompt_cache.sh

prompt-cache-clear: clear-prompt-cache

test:
	cd backend && UV_CACHE_DIR=$(UV_CACHE_DIR) uv run pytest

validate: test frontend-build
