from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    value = _env(name)
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name, str(default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    app_env: str
    backend_host: str
    backend_port: int

    oci_api_key: str
    oci_base_url: str
    oci_model_id: str

    langfuse_public_key: str
    langfuse_secret_key: str
    langfuse_base_url: str
    langfuse_availability_check: bool
    langfuse_prompt_name: str
    langfuse_prompt_label: str
    langfuse_prompt_cache_ttl_seconds: int

    deepwiki_mcp_url: str
    deepwiki_mcp_auth_token: str
    mcp_request_timeout_seconds: int
    mcp_sse_read_timeout_seconds: int
    mcp_client_session_timeout_seconds: int
    mcp_max_retry_attempts: int
    mcp_retry_backoff_seconds_base: float
    mcp_cache_tools_list: bool

    @property
    def has_model_config(self) -> bool:
        return bool(
            self.oci_api_key
            and not self.oci_api_key.startswith("sk-...")
            and self.oci_base_url
            and self.oci_model_id
        )

    @property
    def oci_route_label(self) -> str:
        return "responses"

    @property
    def model_api_key(self) -> str:
        return self.oci_api_key

    @property
    def model_base_url(self) -> str:
        return self.oci_base_url

    @property
    def model_id(self) -> str:
        return self.oci_model_id

    @property
    def tracing_configured(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key and self.langfuse_base_url)


def load_settings() -> Settings:
    return Settings(
        app_env=_env("APP_ENV", "local"),
        backend_host=_env("BACKEND_HOST", "127.0.0.1"),
        backend_port=_env_int("BACKEND_PORT", 8787),
        oci_api_key=_env("OCI_API_KEY"),
        oci_base_url=_env("OCI_BASE_URL"),
        oci_model_id=_env("OCI_MODEL_ID"),
        langfuse_public_key=_env("LANGFUSE_PUBLIC_KEY", "pk-lf-workshop"),
        langfuse_secret_key=_env("LANGFUSE_SECRET_KEY", "sk-lf-workshop"),
        langfuse_base_url=_env("LANGFUSE_BASE_URL", "http://localhost:3000"),
        langfuse_availability_check=_env_bool("LANGFUSE_AVAILABILITY_CHECK", True),
        langfuse_prompt_name=_env("LANGFUSE_PROMPT_NAME", "oracle-ai-lab-assistant"),
        langfuse_prompt_label=_env("LANGFUSE_PROMPT_LABEL", "production"),
        langfuse_prompt_cache_ttl_seconds=_env_int("LANGFUSE_PROMPT_CACHE_TTL_SECONDS", 0),
        deepwiki_mcp_url=_env("DEEPWIKI_MCP_URL", "https://mcp.deepwiki.com/mcp"),
        deepwiki_mcp_auth_token=_env("DEEPWIKI_MCP_AUTH_TOKEN"),
        mcp_request_timeout_seconds=_env_int("MCP_REQUEST_TIMEOUT_SECONDS", 45),
        mcp_sse_read_timeout_seconds=_env_int("MCP_SSE_READ_TIMEOUT_SECONDS", 300),
        mcp_client_session_timeout_seconds=_env_int("MCP_CLIENT_SESSION_TIMEOUT_SECONDS", 15),
        mcp_max_retry_attempts=_env_int("MCP_MAX_RETRY_ATTEMPTS", 2),
        mcp_retry_backoff_seconds_base=_env_float("MCP_RETRY_BACKOFF_SECONDS_BASE", 2.0),
        mcp_cache_tools_list=_env_bool("MCP_CACHE_TOOLS_LIST", True),
    )


settings = load_settings()


def apply_sdk_environment() -> None:
    """Expose Langfuse settings through env vars because the SDK reads them."""

    values = {
        "LANGFUSE_PUBLIC_KEY": settings.langfuse_public_key,
        "LANGFUSE_SECRET_KEY": settings.langfuse_secret_key,
        "LANGFUSE_BASE_URL": settings.langfuse_base_url,
    }
    for key, value in values.items():
        if value:
            os.environ[key] = value


apply_sdk_environment()
