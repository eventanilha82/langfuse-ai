# Langfuse AI Chat Guide

Projeto guia em português para demonstrar Langfuse de ponta a ponta em uma aplicação LLM com chat, backend agentic e stack local observável.

A ideia é simples: subir Langfuse, backend e frontend; conversar com o agente; abrir o console do Langfuse; e enxergar as principais funcionalidades da plataforma acontecendo em uma execução real.

## O Que Este Projeto Mostra

O chat demonstra, em um único fluxo:

- tracing de uma conversa LLM;
- observations e tool calls MCP;
- sessões, usuários, tags e metadados;
- Prompt Management com prompt versionado por label;
- OpenAI Agents SDK no backend;
- DeepWiki MCP para consulta de documentação de repositórios;
- leitura de anexos textuais e imagens no contexto do chat;
- monitoring com evaluators para sinais importantes;
- base para dashboards de custo, latência e volume.

## Arquitetura

```txt
frontend/              React + Vite, interface do chat
backend/               FastAPI, OpenAI Agents SDK, Langfuse SDK
backend/app/           API, agente, MCP remoto, runtime Langfuse
backend/scripts/       Publicação do prompt e carga de interações
docs/                  Guia conceitual e operacional do projeto
docker-compose.yml     Langfuse local com Postgres, ClickHouse, Redis e MinIO
langfuse.env.example   Variáveis do Langfuse local
.env.example           Variáveis da aplicação
```

## Stack

- Python/FastAPI com `uv`
- React/Vite
- OpenAI Agents SDK
- Langfuse SDK v4
- Langfuse self-host local via Docker Compose
- ClickHouse, Postgres, Redis e MinIO no compose do Langfuse

## Setup Rápido

Crie os arquivos de ambiente:

```bash
make init-env
```

Instale backend e frontend:

```bash
make setup-app
```

Suba Langfuse local:

```bash
make langfuse-up
```

Esse comando fica em foreground para mostrar logs. Mantenha esse terminal aberto.

Publique o prompt inicial:

```bash
make seed-prompt
```

Em outros terminais, suba a API e o frontend:

```bash
make backend
make frontend
```

Acesse:

- App: `http://127.0.0.1:3333`
- Langfuse: `http://localhost:3000`

Credenciais locais do Langfuse:

```txt
Email: workshop@example.com
Senha: workshop-password
```

## Como Usar

1. Publique o prompt no Langfuse com `make seed-prompt`.
2. Abra o app em `http://127.0.0.1:3333`.
3. Faça perguntas sobre tracing, prompt management, monitoring, documentação de repositórios ou anexos.
4. Abra o Langfuse em `http://localhost:3000`.
5. Inspecione a execução `oracle-ai-lab-chat-turn`.
6. Veja as chamadas MCP para `DeepWiki MCP`.
7. Configure monitors para Out-of-Scope Request e User Disagreement.
8. Use traces, evaluators e métricas como base para dashboards e análise.

## Modelo Real

O backend exige modelo real configurado. Sem `OCI_API_KEY`, `OCI_BASE_URL` e `OCI_MODEL_ID`, o agente retorna erro explícito; não há mais fallback determinístico.

O lab usa sempre o padrão nativo do OpenAI Agents SDK sobre o endpoint OpenAI-compatible da OCI.

Para usar OCI Generative AI:

```bash
OCI_API_KEY=...
OCI_BASE_URL=https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/20231130/actions/v1
OCI_MODEL_ID=openai.gpt-5.5
```

Depois reinicie o backend.

## Comandos Principais

```bash
make init-env       # cria .env e langfuse.env
make setup-app      # instala dependências backend/frontend
make langfuse-up    # sobe Langfuse local
make langfuse-down  # para Langfuse local
make backend        # roda FastAPI em 127.0.0.1:8787
make frontend       # roda React em 127.0.0.1:3333
make frontend-build # gera build de produção do frontend
make seed-prompt    # publica o prompt principal no Langfuse
make load-traces    # envia interações reais ao backend para gerar massa de traces
make clear-prompt-cache # limpa cache Redis do prompt no Langfuse local
make test           # roda os testes do backend
make validate       # roda testes do backend e build do frontend
```

No workshop, `LANGFUSE_PROMPT_CACHE_TTL_SECONDS=0` deixa o backend buscar o prompt no Langfuse a cada chamada. Isso torna mudanças na label `production` visíveis sem esperar o cache local do SDK expirar.

## Onde Olhar No Código

- [backend/app/main.py](backend/app/main.py): endpoints FastAPI.
- [backend/app/agent.py](backend/app/agent.py): orquestração do chat com OpenAI Agents SDK e Langfuse.
- [backend/app/mcp_servers.py](backend/app/mcp_servers.py): configuração dos servidores MCP remotos.
- [backend/app/langfuse_runtime.py](backend/app/langfuse_runtime.py): cliente Langfuse, tracing e propagação de atributos.
- [backend/scripts/publish_prompt.py](backend/scripts/publish_prompt.py): publicação do prompt.
- [backend/scripts/load_interactions.py](backend/scripts/load_interactions.py): carga de interações para tracing e monitoring.
- [frontend/src/app/page.tsx](frontend/src/app/page.tsx): experiência do chat.

## Markdown No Chat

As respostas do agente são renderizadas como Markdown com:

- blocos de código com syntax highlighting;
- Mermaid renderizado como diagrama dentro do chat;
- LaTeX/KaTeX com `$...$`, `$$...$$`, `\(...\)`, `\[...\]` e padrões comuns gerados por LLM, como `latex` seguido de fórmula;
- tabelas, listas, links, imagens e código inline.

Se um diagrama Mermaid vier inválido, o frontend mantém o conteúdo como bloco de código em vez de quebrar a conversa.

## Documentação

Use [docs/README.md](docs/README.md) como índice do guia.

Os capítulos principais cobrem:

- fundamentos do Langfuse;
- setup local e cloud;
- observabilidade e tracing;
- Prompt Management;
- operação self-host;
- monitoring, métricas e dashboards.

## Objetivo Final

Este repositório deve funcionar como um guia executável: o código mostra a integração, os docs explicam as decisões e o console do Langfuse mostra o resultado real da execução.
