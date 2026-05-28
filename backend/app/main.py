from __future__ import annotations

from contextlib import asynccontextmanager
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.agent import run_support_conversation, stream_support_conversation
from app.config import settings
from app.langfuse_runtime import (
    flush_langfuse,
    instrument_openai_agents,
    langfuse_available,
    openai_agents_instrumentation_status,
)
from app.mcp_servers import mcp_runtime_status
from app.models import ChatRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        yield
    finally:
        flush_langfuse()


app = FastAPI(title="Langfuse Workshop API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3333",
        "http://127.0.0.1:3333",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    if langfuse_available():
        instrument_openai_agents()

    return {
        "ok": True,
        "env": settings.app_env,
        "modelConfigured": settings.has_model_config,
        "ociRoute": settings.oci_route_label,
        "modelId": settings.model_id,
        "modelBaseUrlConfigured": bool(settings.model_base_url),
        "tracingConfigured": settings.tracing_configured,
        "tracingAvailable": langfuse_available(),
        "openaiAgentsInstrumentation": openai_agents_instrumentation_status(),
        "langfuseBaseUrl": settings.langfuse_base_url,
        "promptName": settings.langfuse_prompt_name,
        "promptLabel": settings.langfuse_prompt_label,
        "mcpServers": mcp_runtime_status(),
    }


@app.get("/api/auth/session")
async def auth_session():
    return {
        "authEnabled": False,
        "authenticated": False,
        "user": None,
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    response = await run_support_conversation(request)
    return response.model_dump(by_alias=True)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    async def events():
        try:
            async for event in stream_support_conversation(request):
                yield _sse(event)
        except Exception as exc:
            yield _sse(
                {
                    "type": "error",
                    "message": f"A chamada do chat falhou: {exc}",
                }
            )

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
