from __future__ import annotations

from contextlib import contextmanager
from contextlib import nullcontext
import json
import time
from typing import Any, Iterator
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.config import settings
from app.config import apply_sdk_environment


class NoopObservation:
    def update(self, **_: Any) -> None:
        return None


_availability_checked_at = 0.0
_availability_result: bool | None = None
_openai_agents_instrumented = False
_openai_agents_instrumentation_error: str | None = None


def _propagation_metadata(metadata: dict[str, Any] | None) -> dict[str, str] | None:
    if metadata is None:
        return None

    result: dict[str, str] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, str):
            result[key] = value
        elif isinstance(value, bool):
            result[key] = "true" if value else "false"
        elif isinstance(value, int | float):
            result[key] = str(value)
        else:
            result[key] = json.dumps(value, ensure_ascii=False, default=str)
    return result


def _is_langfuse_available() -> bool:
    global _availability_checked_at, _availability_result

    if not settings.tracing_configured:
        return False
    if not settings.langfuse_availability_check:
        return True

    now = time.monotonic()
    if _availability_result is not None and now - _availability_checked_at < 5:
        return _availability_result

    try:
        request = Request(settings.langfuse_base_url, method="GET")
        with urlopen(request, timeout=1.0) as response:
            _availability_result = response.status < 500
    except (OSError, TimeoutError, URLError):
        _availability_result = False

    _availability_checked_at = now
    return _availability_result


def langfuse_available() -> bool:
    return _is_langfuse_available()


def get_langfuse_client():
    apply_sdk_environment()
    if not _is_langfuse_available():
        raise RuntimeError(f"Langfuse is not reachable at {settings.langfuse_base_url}")
    from langfuse import get_client

    return get_client()


def instrument_openai_agents() -> None:
    global _openai_agents_instrumented, _openai_agents_instrumentation_error

    if _openai_agents_instrumented or not _is_langfuse_available():
        return

    apply_sdk_environment()
    try:
        from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor

        OpenAIAgentsInstrumentor().instrument()
        _openai_agents_instrumented = True
        _openai_agents_instrumentation_error = None
    except Exception:
        _openai_agents_instrumentation_error = "OpenAI Agents instrumentation failed"
        return


def openai_agents_instrumentation_status() -> dict[str, str | bool | None]:
    return {
        "instrumented": _openai_agents_instrumented,
        "error": _openai_agents_instrumentation_error,
    }


@contextmanager
def observation(name: str, as_type: str = "span", **kwargs: Any) -> Iterator[Any]:
    try:
        client = get_langfuse_client()
    except Exception:
        yield NoopObservation()
        return

    with client.start_as_current_observation(name=name, as_type=as_type, **kwargs) as obs:
        yield obs


@contextmanager
def propagate_trace_attributes(
    *,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    version: str | None = None,
) -> Iterator[None]:
    try:
        get_langfuse_client()
        from langfuse import propagate_attributes

        manager = propagate_attributes(
            user_id=user_id,
            session_id=session_id,
            tags=tags,
            metadata=_propagation_metadata(metadata),
            version=version,
        )
    except Exception:
        manager = nullcontext()

    with manager:
        yield


def flush_langfuse() -> None:
    try:
        get_langfuse_client().flush()
    except Exception:
        return None
