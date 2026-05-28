from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.agent as agent_module
import app.langfuse_runtime as langfuse_runtime
import app.main as main_module
import app.mcp_servers as mcp_servers
from app.agent import (
    _clean_agent_output,
    _ensure_model_configured,
    _extract_prompt_text,
    run_support_conversation,
)
from app.main import app
from app.models import ChatRequest, ChatResponse


def _chat_request(question: str) -> ChatRequest:
    return ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": question}],
            "sessionId": "session-test",
            "userId": "user-test",
        }
    )


def test_chat_request_rejects_unknown_model_field() -> None:
    with pytest.raises(ValueError, match="Extra inputs are not permitted"):
        ChatRequest.model_validate(
            {
                "sessionId": "session-test",
                "model": "front-end-shadow-model",
                "messages": [{"role": "user", "content": "oi"}],
            }
        )


def test_chat_request_requires_user_message() -> None:
    with pytest.raises(ValueError, match="mensagem de usuário"):
        ChatRequest.model_validate(
            {
                "sessionId": "session-test",
                "messages": [{"role": "assistant", "content": "oi"}],
            }
        )


@pytest.mark.asyncio
async def test_mcp_is_optional_for_regular_chat(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        mcp_servers,
        "settings",
        SimpleNamespace(deepwiki_mcp_url="", deepwiki_mcp_auth_token=""),
    )

    async with mcp_servers.open_mcp_servers() as servers:
        assert servers == []

    with pytest.raises(RuntimeError, match="Nenhum servidor MCP configurado"):
        async with mcp_servers.open_mcp_servers(required=True):
            pass


def test_auth_session_is_explicitly_disabled() -> None:
    response = TestClient(app).get("/api/auth/session")

    assert response.status_code == 200
    assert response.json() == {
        "authEnabled": False,
        "authenticated": False,
        "user": None,
    }


def test_health_reports_tracing_availability(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main_module, "langfuse_available", lambda: True)

    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["tracingConfigured"] is True
    assert body["tracingAvailable"] is True
    assert "instrumented" in body["openaiAgentsInstrumentation"]
    assert body["promptName"] == "oracle-ai-lab-assistant"


def test_langfuse_availability_uses_public_health_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, str | float] = {}

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    def fake_urlopen(request, timeout: float):
        seen["url"] = request.full_url
        seen["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(
        langfuse_runtime,
        "settings",
        SimpleNamespace(
            tracing_configured=True,
            langfuse_availability_check=True,
            langfuse_base_url="http://localhost:3000",
        ),
    )
    monkeypatch.setattr(langfuse_runtime, "_availability_checked_at", 0.0)
    monkeypatch.setattr(langfuse_runtime, "_availability_result", None)
    monkeypatch.setattr(langfuse_runtime, "urlopen", fake_urlopen)

    assert langfuse_runtime.langfuse_available() is True
    assert seen == {
        "url": "http://localhost:3000/api/public/health",
        "timeout": 2.0,
    }


def test_prompt_management_fetches_prompt_by_configured_label(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakePrompt:
        prompt = "prompt remoto versionado"

    class FakeLangfuse:
        def get_prompt(
            self,
            name: str,
            label: str | None = None,
            cache_ttl_seconds: int | None = None,
        ):
            assert name == agent_module.settings.langfuse_prompt_name
            assert label == agent_module.settings.langfuse_prompt_label
            assert cache_ttl_seconds == agent_module.settings.langfuse_prompt_cache_ttl_seconds
            return FakePrompt()

    monkeypatch.setattr(agent_module, "get_langfuse_client", lambda: FakeLangfuse())

    prompt_text, prompt = _extract_prompt_text()

    assert prompt_text == "prompt remoto versionado"
    assert isinstance(prompt, FakePrompt)


def test_observation_propagates_body_exceptions(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeObservation:
        pass

    class FakeObservationManager:
        def __enter__(self):
            return FakeObservation()

        def __exit__(self, exc_type, exc, traceback):
            return False

    class FakeLangfuse:
        def start_as_current_observation(self, *, name: str, as_type: str):
            assert name == "test-observation"
            assert as_type == "agent"
            return FakeObservationManager()

    monkeypatch.setattr(langfuse_runtime, "get_langfuse_client", lambda: FakeLangfuse())

    with pytest.raises(ValueError, match="body failed"):
        with langfuse_runtime.observation("test-observation", as_type="agent"):
            raise ValueError("body failed")


@pytest.mark.asyncio
async def test_chat_turn_records_root_observation_and_tool_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root_updates: list[dict] = []
    observed: list[tuple[str, str]] = []
    propagated: list[dict] = []

    class FakeRootObservation:
        def update(self, **kwargs):
            root_updates.append(kwargs)

    @contextmanager
    def fake_observation(name: str, as_type: str = "span", **kwargs):
        observed.append((name, as_type))
        assert kwargs["prompt"].prompt == "prompt remoto do teste"
        yield FakeRootObservation()

    @contextmanager
    def fake_propagate_trace_attributes(**kwargs):
        propagated.append(kwargs)
        yield

    class FakePrompt:
        prompt = "prompt remoto do teste"
        name = "oracle-ai-lab-assistant"
        version = 7

    class FakeLangfuse:
        def get_prompt(self, *args, **kwargs):
            return FakePrompt()

    async def fake_run_agent(request, prompt_text, prompt_info):
        assert prompt_text == "prompt remoto do teste"
        return ChatResponse(
            answer="resposta do agente",
            usedTools=["DeepWiki MCP"],
            traceMeta=agent_module._trace_meta(prompt_info),
        )

    monkeypatch.setattr(
        agent_module,
        "settings",
            SimpleNamespace(
                has_model_config=True,
                app_env="local",
                oci_route_label="responses",
                model_id="openai.gpt-5.5",
                langfuse_prompt_name="oracle-ai-lab-assistant",
            langfuse_prompt_label="production",
            langfuse_prompt_cache_ttl_seconds=0,
        ),
    )
    monkeypatch.setattr(agent_module, "get_langfuse_client", lambda: FakeLangfuse())
    monkeypatch.setattr(agent_module, "_run_agent", fake_run_agent)
    monkeypatch.setattr(agent_module, "observation", fake_observation)
    monkeypatch.setattr(agent_module, "propagate_trace_attributes", fake_propagate_trace_attributes)

    response = await run_support_conversation(_chat_request("Como configurar monitoring?"))

    assert observed == [("oracle-ai-lab-chat-turn", "agent")]
    assert response.trace_meta.mode == "oci"
    assert response.trace_meta.prompt_version == "7"
    assert response.used_tools == ["DeepWiki MCP"]
    assert root_updates[0]["input"]["sessionId"] == "session-test"
    assert root_updates[0]["metadata"]["agentRuntime"] == "oci-openai-agents-mcp"
    assert root_updates[0]["metadata"]["environment"] == "local"
    assert root_updates[0]["metadata"]["release"] == agent_module.WORKSHOP_RELEASE
    assert root_updates[0]["metadata"]["model"] == "openai.gpt-5.5"
    assert root_updates[-1]["output"]["traceMeta"]["mode"] == "oci"
    assert propagated[0]["user_id"] == "user-test"
    assert propagated[0]["session_id"] == "session-test"
    assert propagated[0]["tags"] == agent_module.WORKSHOP_TAGS


def test_agent_requires_real_model_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent_module, "settings", SimpleNamespace(has_model_config=False))

    with pytest.raises(RuntimeError, match="não usa mais fallback"):
        _ensure_model_configured()


def test_non_fatal_tool_error_is_sanitized() -> None:
    raw = (
        "Antes.\n"
        "Error running tool (non-fatal): {'tool_name': 'mcp_DeepWiki_MCP__ask_question', "
        "'error': 'Timed out while waiting for response to ClientRequest. Waited 15.0 seconds.'}\n"
        "Depois."
    )

    cleaned = _clean_agent_output(raw)

    assert "Error running tool" not in cleaned
    assert "Timed out while waiting" not in cleaned
    assert "A consulta ao DeepWiki MCP excedeu o tempo limite" in cleaned
    assert "Antes." in cleaned
    assert "Depois." in cleaned


def test_monitoring_docs_stay_in_current_scope() -> None:
    root = Path(__file__).resolve().parents[2]
    docs = "\n".join(path.read_text() for path in (root / "docs").rglob("*.md"))

    assert "workshop/04-monitoring.md" in docs
    assert "Out-of-Scope Request" in docs
    assert "User Disagreement" in docs
    removed_topic = "data" + "set"
    assert f"run-{removed_topic}" not in docs
    removed_exp = "exper" + "imentos"
    assert f"05-{removed_topic}s-e-{removed_exp}.md" not in docs
    assert "09-" + "api-data-platform.md" not in docs
