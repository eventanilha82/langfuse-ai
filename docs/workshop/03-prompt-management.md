# 03 - Prompt Management

## Objetivo

Mover o system prompt do código para o Langfuse, versionar alterações e usar labels para controlar deploy sem mudar código.

## 1. Publicar o prompt inicial

Com Langfuse local rodando:

```bash
make seed-prompt
```

O script cria ou atualiza o prompt:

```txt
oracle-ai-lab-assistant
```

com label:

```txt
production
```

## 2. Onde está o prompt base

O prompt base que alimenta o seed fica em:

```txt
backend/app/agent.py
```

O script `backend/scripts/publish_prompt.py` envia esse mesmo texto para o Langfuse. Em runtime, o backend busca o prompt por nome e label; se o prompt não existir ou o Langfuse estiver indisponível, a chamada do agente falha explicitamente.

## 3. Testar alteração via UI

No Langfuse:

1. Abra Prompt Management.
2. Edite `oracle-ai-lab-assistant`.
3. Crie uma nova versão com uma alteração pequena, por exemplo:

```txt
Sempre termine com uma pergunta curta sobre o próximo passo do workshop.
```

4. Teste no Playground.
5. Promova a nova versão para `production`.

## 4. Validar no app

Para ver a alteração do prompt afetar a resposta do agente, rode o backend com `OCI_API_KEY`, `OCI_BASE_URL` e `OCI_MODEL_ID` configurados. O app não usa fallback local.

Reinicie o backend se quiser eliminar cache local de processo:

```bash
make backend
```

No workshop, o backend busca o prompt com `LANGFUSE_PROMPT_CACHE_TTL_SECONDS=0`. Isso desabilita o cache em memória do SDK para que a próxima chamada busque a versão atual no Langfuse.

Se quiser limpar também o cache de prompt no Redis do Langfuse local sem apagar outros dados:

```bash
make clear-prompt-cache
```

Para conferir quais chaves seriam removidas sem apagar nada:

```bash
DRY_RUN=true make clear-prompt-cache
```

Envie uma pergunta no frontend e observe:

- A resposta mudou?
- O trace mostra a execução nova?
- O trace mostra `promptName`, `promptLabel` e `promptVersion`?
- A nova versão melhorou ou piorou a resposta?

## 5. Pontos de ensino

- Versão é histórico imutável.
- Label é ponteiro operacional.
- Código deve apontar para label, não para número fixo de versão.
- Rollback é reassociar `production` para uma versão anterior.
- Cache de prompt pode atrasar a percepção de alterações imediatas.

## Resultado esperado

O participante entende que prompt em produção deve ser operado como artefato versionado, testável e revertível.
