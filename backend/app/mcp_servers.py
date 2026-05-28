from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from dataclasses import dataclass
from typing import Any

from agents.mcp import MCPServerStreamableHttp

from app.config import settings


@dataclass(frozen=True)
class MCPServerSpec:
    id: str
    name: str
    url: str
    auth_token: str = ""


def _all_mcp_specs() -> list[MCPServerSpec]:
    return [
        MCPServerSpec(
            id="deepwiki",
            name="DeepWiki MCP",
            url=settings.deepwiki_mcp_url,
            auth_token=settings.deepwiki_mcp_auth_token,
        ),
    ]


def configured_mcp_specs() -> list[MCPServerSpec]:
    return [spec for spec in _all_mcp_specs() if spec.url]


def mcp_runtime_status() -> list[dict[str, str | bool]]:
    return [
        {
            "id": spec.id,
            "name": spec.name,
            "url": spec.url,
            "configured": bool(spec.url),
            "authConfigured": bool(spec.auth_token),
        }
        for spec in _all_mcp_specs()
    ]


def _params_for(spec: MCPServerSpec) -> dict[str, Any]:
    params: dict[str, Any] = {
        "url": spec.url,
        "timeout": settings.mcp_request_timeout_seconds,
        "sse_read_timeout": settings.mcp_sse_read_timeout_seconds,
    }
    if spec.auth_token:
        params["headers"] = {"Authorization": f"Bearer {spec.auth_token}"}
    return params


@asynccontextmanager
async def open_mcp_servers(*, required: bool = False) -> AsyncIterator[list[MCPServerStreamableHttp]]:
    specs = configured_mcp_specs()
    if not specs:
        if required:
            raise RuntimeError("Nenhum servidor MCP configurado. Defina DEEPWIKI_MCP_URL no .env.")
        yield []
        return

    async with AsyncExitStack() as stack:
        servers: list[MCPServerStreamableHttp] = []
        for spec in specs:
            server = MCPServerStreamableHttp(
                name=spec.name,
                params=_params_for(spec),
                cache_tools_list=settings.mcp_cache_tools_list,
                max_retry_attempts=settings.mcp_max_retry_attempts,
                retry_backoff_seconds_base=settings.mcp_retry_backoff_seconds_base,
                client_session_timeout_seconds=settings.mcp_client_session_timeout_seconds,
            )
            try:
                servers.append(await stack.enter_async_context(server))
            except Exception as exc:
                if required:
                    raise RuntimeError(
                        f"Não foi possível conectar ao servidor MCP {spec.name} em {spec.url}. "
                        "Verifique se o endpoint Streamable HTTP está ativo."
                    ) from exc
                continue
        yield servers
