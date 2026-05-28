# 04 - Monitoring

## Objetivo

Configurar monitoring no Langfuse usando os traces que o app já gera. Este passo não exige mudança de código: a etapa de tracing já registra a observation raiz `oracle-ai-lab-chat-turn`, as chamadas ao modelo e as chamadas MCP do agente.

O foco é encontrar sinais que valem revisão:

- pedidos fora do escopo;
- discordância do usuário depois de uma resposta;
- custo, latência e volume por trace, modelo e prompt.

## 1. Pré-requisitos

Antes de configurar os monitores:

```bash
make langfuse-up
make backend
make frontend
make seed-prompt
```

Mantenha `make langfuse-up`, `make backend` e `make frontend` rodando em terminais próprios. Execute `make seed-prompt` e `make load-traces` em outro terminal.

Para o monitor de fora de escopo mirar a generation final, o app precisa estar com OCI configurado. Sem `OCI_API_KEY`, `OCI_BASE_URL` e `OCI_MODEL_ID`, o backend retorna erro explícito em vez de gerar traces artificiais.

Gere pelo menos três conversas no app:

1. Dentro do escopo: `Como eu ativo tracing no agente?`
2. Tool call MCP: `Use DeepWiki para explicar o repositório langfuse/langfuse.`
3. Discordância: faça uma pergunta normal e depois responda `Não, esse menu não existe.`

Para gerar massa suficiente para dashboards e evaluators, use a carga automatizada:

```bash
make load-traces
```

Ela envia interações de tracing, prompt management, monitoring, fora de escopo e discordância para o backend local. Ajuste o volume com `TRACE_LOAD_COUNT=50 make load-traces`.

## 2. Monitor de fora de escopo

No Langfuse:

1. Abra `Evaluators`.
2. Crie um evaluator a partir do template `Out-of-Scope Request`.
3. Use como alvo a generation final do modelo.
4. Mapeie as variáveis do template para o input/output da generation.
5. Escolha o modelo judge disponível no ambiente.
6. Salve e habilite o evaluator.

Resultado esperado: pedidos fora do escopo passam a aparecer como traces prioritários para revisão.

## 3. Monitor de discordância do usuário

No Langfuse:

1. Abra `Evaluators`.
2. Crie um evaluator a partir do template `User Disagreement`.
3. Use como alvo a observation raiz:

```txt
oracle-ai-lab-chat-turn
```

4. Mapeie o histórico da conversa a partir do input da observation.
5. Salve e habilite o evaluator.

Resultado esperado: quando o usuário corrige ou discorda da resposta, o trace fica destacado para investigação.

## 4. Métricas operacionais

Use dashboards para acompanhar:

- volume de traces por dia;
- latência por modelo ou trace name;
- custo por modelo;
- erros e warnings;
- distribuição dos resultados dos evaluators.

Dimensões úteis neste app:

- execução/observation raiz `oracle-ai-lab-chat-turn`
- `userId`
- `sessionId`
- `tags`
- `promptName`
- `promptVersion`
- `model`

## Resultado esperado

Ao final, o participante consegue usar Langfuse para decidir quais traces merecem atenção sem ler todas as execuções manualmente.
