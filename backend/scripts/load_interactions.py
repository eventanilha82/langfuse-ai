from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SCENARIOS = [
    [
        "Como eu ativo tracing no agente do workshop?",
        "Onde eu vejo as chamadas MCP dentro do trace?",
    ],
    [
        "Explique a diferença entre trace, observation e generation no Langfuse.",
        "Quais metadados eu devo filtrar para investigar uma sessão?",
    ],
    [
        "Como mover o system prompt para o Langfuse Prompt Management?",
        "Como faço rollback de uma versão de prompt usando label?",
    ],
    [
        "Se eu mudar a label production do prompt, como valido que o backend pegou a nova versão?",
        "O que o cache de prompt pode esconder durante o teste?",
    ],
    [
        "Como configurar um evaluator de Out-of-Scope Request?",
        "Você pode declarar meu imposto de renda agora?",
    ],
    [
        "Como configurar um evaluator de User Disagreement?",
        "Não, esse menu não existe. Reavalie a resposta anterior.",
    ],
    [
        "Quais métricas mínimas eu devo colocar no dashboard do workshop?",
        "Como comparar custo e latência por promptVersion?",
    ],
    [
        "Use DeepWiki para explicar o repositório langfuse/langfuse em alto nível.",
    ],
    [
        "Como eu preparo massa de traces para demonstrar monitoring?",
        "Quais perguntas ajudam a gerar sinais bons para evaluators?",
    ],
    [
        "Como investigar uma resposta ruim usando a timeline do Langfuse?",
        "Quando o problema costuma ser prompt e quando costuma ser tool call?",
    ],
]


def _json_request(
    method: str,
    url: str,
    *,
    payload: dict[str, Any] | None = None,
    timeout: float,
) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        url,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc.reason}") from exc

    return json.loads(raw) if raw else {}


def _healthcheck(base_url: str, timeout: float) -> None:
    health = _json_request("GET", f"{base_url}/api/health", timeout=timeout)

    if not health.get("modelConfigured"):
        raise RuntimeError(
            "Backend sem modelo configurado. Defina OCI_API_KEY, OCI_BASE_URL e OCI_MODEL_ID "
            "e reinicie o backend antes de gerar massa."
        )

    tracing_available = bool(health.get("tracingAvailable"))
    if not tracing_available:
        raise RuntimeError(
            "Langfuse não está disponível para o backend. Confirme LANGFUSE_PUBLIC_KEY, "
            "LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL e se a UI/API do Langfuse está pronta "
            "antes de gerar massa de traces."
        )

    instrumentation = health.get("openaiAgentsInstrumentation") or {}
    if not instrumentation.get("instrumented"):
        raise RuntimeError(
            "A instrumentação OpenAI Agents ainda não está ativa no backend. "
            "Verifique /api/health e os logs antes de gerar massa de traces."
        )

    print(
        "backend ok: "
        f"env={health.get('env')} "
        f"model={health.get('modelId')} "
        f"prompt={health.get('promptName')}:{health.get('promptLabel')} "
        f"tracingConfigured={health.get('tracingConfigured')} "
        f"tracingAvailable={tracing_available} "
        f"openaiAgentsInstrumented={instrumentation.get('instrumented')}"
    )


def _iter_questions(count: int) -> list[tuple[int, str]]:
    turns: list[tuple[int, str]] = []
    scenario_index = 0

    while len(turns) < count:
        scenario = SCENARIOS[scenario_index % len(SCENARIOS)]
        for question in scenario:
            if len(turns) >= count:
                break
            turns.append((scenario_index, question))
        scenario_index += 1

    return turns


def _post_chat(
    base_url: str,
    *,
    session_id: str,
    user_id: str,
    messages: list[dict[str, str]],
    timeout: float,
) -> dict[str, Any]:
    return _json_request(
        "POST",
        f"{base_url}/api/chat",
        payload={
            "sessionId": session_id,
            "userId": user_id,
            "messages": messages,
        },
        timeout=timeout,
    )


def run_load(args: argparse.Namespace) -> None:
    base_url = args.base_url.rstrip("/")
    _healthcheck(base_url, args.timeout)

    run_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    histories: dict[int, list[dict[str, str]]] = {}
    completed = 0
    warnings = 0

    for index, (scenario_index, question) in enumerate(_iter_questions(args.count), start=1):
        session_id = f"{args.session_prefix}-{run_id}-{scenario_index:02d}"
        user_id = f"{args.user_prefix}-{scenario_index % args.users:02d}"
        history = histories.setdefault(scenario_index, [])
        history_window = history[-args.history_messages :] if args.history_messages else []
        messages = [*history_window, {"role": "user", "content": question}]

        print(f"[{index:02d}/{args.count:02d}] session={session_id} user={user_id}")
        print(f"  user: {question}")

        try:
            response = _post_chat(
                base_url,
                session_id=session_id,
                user_id=user_id,
                messages=messages,
                timeout=args.timeout,
            )
        except RuntimeError as exc:
            print(f"  error: {exc}")
            if not args.continue_on_error:
                raise
            continue

        answer = str(response.get("answer", "")).strip()
        history.append({"role": "user", "content": question})
        if answer:
            history.append({"role": "assistant", "content": answer})

        tools = ", ".join(response.get("usedTools", [])) or "none"
        prompt_version = response.get("traceMeta", {}).get("promptVersion")
        print(f"  ok: tools={tools} promptVersion={prompt_version}")
        if prompt_version is None:
            warnings += 1
            print("  warning: promptVersion vazio; confirme se o prompt está ligado ao trace.")
        if "DeepWiki" in question and "DeepWiki MCP" not in response.get("usedTools", []):
            warnings += 1
            print("  warning: pergunta DeepWiki não registrou uso de DeepWiki MCP.")
        completed += 1

        if args.delay > 0:
            time.sleep(args.delay)

    print(f"load complete: {completed}/{args.count} interactions sent to {base_url}")
    if warnings:
        print(f"load warnings: {warnings}; revise os sinais antes de usar a massa em demo.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate real workshop interactions by calling the local backend."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8787")
    parser.add_argument("--count", type=int, default=30)
    parser.add_argument("--users", type=int, default=5)
    parser.add_argument("--session-prefix", default="trace-load")
    parser.add_argument("--user-prefix", default="load-user")
    parser.add_argument("--history-messages", type=int, default=4)
    parser.add_argument("--timeout", type=float, default=120.0)
    parser.add_argument("--delay", type=float, default=0.0)
    parser.add_argument("--continue-on-error", action="store_true")
    args = parser.parse_args()

    if args.count < 1:
        parser.error("--count precisa ser maior que zero")
    if args.users < 1:
        parser.error("--users precisa ser maior que zero")
    if args.history_messages < 0:
        parser.error("--history-messages não pode ser negativo")

    return args


def main() -> None:
    run_load(parse_args())


if __name__ == "__main__":
    main()
