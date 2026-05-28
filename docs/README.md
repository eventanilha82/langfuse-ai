# Guia de leitura da documentação

Esta pasta é a trilha principal para compreender o recorte do workshop de Langfuse de ponta a ponta: setup, tracing, prompt management e monitoring. A ordem foi pensada para uma pessoa que já conhece aplicações LLM, mas precisa ver esses conceitos funcionando em uma aplicação real.

## Caminho recomendado

1. [Fundamentos](01-fundamentos.md): entenda o problema que o Langfuse resolve e o mapa mental da plataforma.
2. [Setup](02-setup.md): escolha Cloud ou self-host local e configure as chaves do projeto.
3. [Observabilidade](03-observabilidade.md): envie traces, organize sessions, observations, metadata e entenda execuções reais.
4. [Prompt Management](04-prompt-management.md): tire prompts críticos do código, versione e promova por labels.
5. [Operação e Self-host](07-operacao-self-host.md): entenda os cuidados para rodar Langfuse localmente ou em VM.
6. [Monitoring, Métricas e Dashboards](08-metricas-dashboards.md): configure monitores e acompanhe custo, latência e volume.

## Workshop local

Depois de ler os três primeiros capítulos, você já pode executar o workshop:

1. [Setup local com Docker Compose](workshop/00-setup-local-langfuse.md)
2. [Aplicação base FastAPI + React](workshop/01-base-app-fastapi-react.md)
3. [Tracing e observabilidade](workshop/02-tracing.md)
4. [Prompt Management](workshop/03-prompt-management.md)
5. [Monitoring](workshop/04-monitoring.md)
6. [Operação local e troubleshooting](workshop/05-operacao-local.md)

O workshop usa o mesmo vocabulário dos capítulos principais: trace, observation, generation, session, prompt, MCP tool call, evaluator, monitor, dashboard e métricas.

## Como navegar

- Para aprender o conceito, leia os capítulos principais.
- Para executar comandos, siga `docs/workshop/`.
- Para operar a stack local, use [Operação local e troubleshooting](workshop/05-operacao-local.md).
- Para detalhes finos de API, schema, planos, disponibilidade e integrações, use a documentação oficial do Langfuse.
