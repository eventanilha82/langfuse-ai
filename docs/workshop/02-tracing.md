# 02 - Tracing e observabilidade

## Objetivo

Gerar traces reais no Langfuse a partir do app local e aprender a inspecionar o que aconteceu em cada execução.

## 1. Pré-requisitos

Langfuse local deve estar rodando:

```bash
make langfuse-up
```

Esse comando fica em foreground para mostrar logs. Em outro terminal, depois que a UI estiver pronta, publique o prompt:

```bash
make seed-prompt
```

Backend e frontend devem estar em execução:

```bash
make backend
make frontend
```

## 2. Gerar um trace

Abra `http://127.0.0.1:3333` e envie uma pergunta:

```txt
Como monitorar custo, latência e qualidade em produção?
```

Depois vá para `http://localhost:3000` e abra a lista de traces.

## 3. Gerar massa opcional de traces

Para popular a lista de traces com dezenas de interações reais, mantenha Langfuse e o backend rodando e execute:

```bash
make load-traces
```

Por padrão, o comando envia 30 interações para `http://127.0.0.1:8787/api/chat`. Para mudar volume ou endpoint:

```bash
TRACE_LOAD_COUNT=50 TRACE_LOAD_BASE_URL=http://127.0.0.1:8787 make load-traces
```

Essa carga chama o mesmo backend usado pelo frontend. Ela não cria traces artificiais: cada item passa por prompt management, OCI, instrumentação do agente e envio ao Langfuse.

Antes de enviar a carga, o script consulta `/api/health` e só continua se `modelConfigured` e `tracingAvailable` estiverem verdadeiros. Isso evita gerar respostas sem massa de traces no Langfuse.

## 4. O que procurar no trace

Na execução `oracle-ai-lab-chat-turn`, observe:

- `input`: mensagens enviadas pelo frontend.
- `output`: resposta final do agente.
- `metadata.sessionId`: sessão do chat.
- `metadata.userId`: usuário lógico do workshop.
- `tags`: tags de busca propagadas no trace.
- `metadata.promptName` e `metadata.promptVersion`: prompt usado na execução.
- observations de ferramentas MCP:
  - `DeepWiki MCP`

O backend usa OpenAI Agents SDK apontando para OCI. Os spans do agente, das chamadas MCP e das chamadas ao modelo são capturados pela instrumentação OpenInference e enviados ao Langfuse via OpenTelemetry.

## 5. Exercício

Rode três perguntas:

1. Uma pergunta simples de tracing.
2. Uma pergunta que chama DeepWiki MCP: `Use DeepWiki para explicar o repositório langfuse/langfuse.`
3. Uma pergunta com anexo de texto ou imagem para observar como o input aparece no trace.

Compare os traces:

- O input mudou?
- As ferramentas foram chamadas?
- A resposta final respeitou os limites?
- O tempo total ficou claro na timeline?

## 6. Discussão

O ponto do tracing não é “logar tudo”. É permitir reconstruir o comportamento da aplicação:

- Qual prompt estava ativo?
- Qual versão de prompt foi usada?
- Que ferramenta retornou qual informação?
- O modelo respondeu com base em dados ou inventou?
- Qual etapa aumentou latência?

## Resultado esperado

O participante deve conseguir abrir um trace, explicar o fluxo de execução e apontar onde instrumentaria mais dados.
