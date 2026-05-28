# 05 - Operação local e troubleshooting

## Objetivo

Dar ao participante comandos claros para operar a versão local do workshop e resolver os problemas mais comuns.

## Comandos principais

```bash
make init-env
make langfuse-up
make backend
make frontend
make seed-prompt
make test
```

`make langfuse-up`, `make backend` e `make frontend` ficam rodando em foreground. Use terminais separados para esses comandos e rode `make seed-prompt`, `make load-traces` e `make test` em outro terminal.

Para parar Langfuse:

```bash
make langfuse-down
```

Para remover volumes também:

```bash
docker-compose --env-file langfuse.env -f docker-compose.yml down -v
```

## Health checks

FastAPI:

```bash
curl http://127.0.0.1:8787/api/health
```

Campos importantes:

- `modelConfigured`: confirma se `OCI_API_KEY`, `OCI_BASE_URL` e `OCI_MODEL_ID` foram carregados.
- `tracingConfigured`: confirma se as variáveis do Langfuse existem no backend.
- `tracingAvailable`: confirma se o backend consegue alcançar o Langfuse agora.
- `openaiAgentsInstrumentation.instrumented`: confirma se a instrumentação do OpenAI Agents SDK foi ativada.

Langfuse UI:

```txt
http://localhost:3000
```

## Problema: app responde, mas trace não aparece

Checklist:

1. `LANGFUSE_BASE_URL` aponta para `http://localhost:3000`.
2. `LANGFUSE_PUBLIC_KEY` e `LANGFUSE_SECRET_KEY` batem com `langfuse.env`.
3. Langfuse está pronto, não apenas subindo.
4. O backend foi reiniciado depois de alterar `.env`.
5. Scripts curtos chamam `flush()` no final.

Se `/api/health` mostrar `tracingConfigured=true` e `tracingAvailable=false`, as variáveis foram carregadas, mas o backend ainda não consegue acessar a UI/API do Langfuse.

## Problema: Docker Compose demora no primeiro start

Normal no primeiro uso. Ele precisa baixar imagens e inicializar Postgres, ClickHouse, Redis e MinIO.

Use:

```bash
make langfuse-logs
```

## Problema: porta ocupada

Portas padrão:

- `3000`: Langfuse.
- `3333`: frontend.
- `8787`: backend.
- `5432`, `6379`, `8123`, `9000`: serviços internos presos em `127.0.0.1`.

Altere a porta no `Makefile`, no `vite.config.ts` ou no Compose se necessário.

## Problema: sem chave de modelo

Isso não é mais suportado como modo de demonstração. O backend exige modelo real para que tracing, prompt management e monitoring usem generations reais.

Para conectar OCI Generative AI, defina no `.env`:

```bash
OCI_API_KEY=...
OCI_BASE_URL=https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/20231130/actions/v1
OCI_MODEL_ID=openai.gpt-5.5
```

O backend usa o padrão do OpenAI Agents SDK sobre o endpoint OpenAI-compatible configurado em `OCI_BASE_URL`.

Depois reinicie o backend.

## Upgrade do Langfuse local

```bash
docker-compose --env-file langfuse.env -f docker-compose.yml up --pull always
```

## Resultado esperado

O participante consegue rodar, parar, reiniciar e diagnosticar a stack local com autonomia.
