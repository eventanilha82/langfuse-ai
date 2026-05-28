# 01 - Aplicação base FastAPI + React

## Objetivo

Rodar o app hands-on de ponta a ponta: frontend React, backend FastAPI e assistente corporativo do Oracle AI Lab.

## 1. Instalar backend

```bash
make setup-app
```

Rodar a API:

```bash
make backend
```

Validar:

```bash
curl http://127.0.0.1:8787/api/health
```

## 2. Instalar frontend

Em outro terminal:

```bash
make frontend
```

Acesse:

```txt
http://127.0.0.1:3333
```

## 3. Fluxo do app

O frontend chama:

- `POST /api/chat/stream`: envia a conversa para o agente e recebe a resposta em streaming.
- renderiza respostas em Markdown com código, tabelas, Mermaid e LaTeX/KaTeX.

O backend executa:

1. Abre uma observation principal `oracle-ai-lab-chat-turn`.
2. Exige OpenAI Agents SDK apontando para OCI com `OCI_API_KEY`, `OCI_BASE_URL` e `OCI_MODEL_ID`.
3. Busca o prompt versionado no Langfuse e usa esse texto como instrução do agente.
4. Conecta o servidor MCP remoto DeepWiki.
5. Retorna resposta, tools usadas, prompt version e metadados para o frontend.

## 4. Primeiro teste

No app, envie:

```txt
Como instrumentar um agente corporativo com Langfuse?
```

Sem configuração de modelo, o backend deve retornar erro explícito. Não há fallback determinístico; tracing, prompt management e monitoring usam uma generation real.

## Arquivos principais

- `backend/app/main.py`: endpoints FastAPI.
- `backend/app/agent.py`: orquestração com OpenAI Agents SDK, prompt do Langfuse e streaming.
- `backend/app/mcp_servers.py`: configuração dos servidores MCP remotos.
- `backend/scripts/load_interactions.py`: carga opcional de interações reais para gerar massa de traces.
- `frontend/src/app/page.tsx`: UI do chat.
- `frontend/src/app/components/chat/ChatMessage.tsx`: renderização Markdown, código, Mermaid e LaTeX.

## Resultado esperado

Você tem um app funcional e previsível antes de entrar nos recursos do Langfuse. Isso separa problema de produto de problema de observabilidade.
