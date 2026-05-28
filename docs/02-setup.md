# 02 - Setup

## Objetivo do modulo

Preparar o ambiente para o workshop local.

O participante deve terminar este modulo com:

- Um projeto Langfuse criado.
- Chaves de API configuradas.
- Uma aplicacao de exemplo pronta para instrumentacao.
- Variaveis de ambiente organizadas.
- Um primeiro trace visivel na interface do Langfuse.

## Caminhos possiveis

### Opcao A: Langfuse Cloud

Boa para um workshop com pouco tempo e menor risco operacional.

Fluxo:

1. Criar conta.
2. Criar organizacao/projeto.
3. Gerar public key e secret key.
4. Configurar `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` e `LANGFUSE_BASE_URL`.
5. Rodar smoke test de envio de trace.

### Opcao B: Self-host local com Docker

Boa para um deep dive que inclui operacao.

Fluxo:

1. Subir stack local.
2. Criar usuario inicial.
3. Criar projeto.
4. Gerar chaves.
5. Configurar app de exemplo apontando para o host local.
6. Validar healthcheck e ingestao.

## Variaveis de ambiente

Exemplo:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Para self-host local:

```bash
LANGFUSE_BASE_URL=http://localhost:3000
```

Nota de compatibilidade: alguns exemplos ou projetos existentes podem usar `LANGFUSE_HOST`. Para o material novo do workshop, vamos padronizar em `LANGFUSE_BASE_URL` e validar no SDK escolhido antes de executar a trilha.

## Regioes Cloud

A documentação oficial lista diferentes regioes de Langfuse Cloud. Para este guia, o ponto prático e simples:

- Usar a URL da regiao onde o projeto foi criado.
- Nao misturar chaves de uma regiao com `LANGFUSE_BASE_URL` de outra.
- Em self-host, apontar para a URL publica ou local da instancia.

Exemplos:

```bash
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com
```

## Caminho recomendado neste repositório

Para executar o workshop local, use os comandos da raiz do projeto:

```bash
make init-env
make setup-app
make langfuse-up
make seed-prompt
```

`make langfuse-up` fica em foreground para mostrar logs. Rode `make seed-prompt` em outro terminal depois que a UI estiver pronta.

Depois, em terminais separados:

```bash
make backend
make frontend
```

Esse caminho cria `.env`, `langfuse.env`, sobe o Docker Compose local, instala backend/frontend, publica o prompt `production` e prepara o app para gerar traces.

## Caminhos de instrumentacao

O primeiro trace pode ser criado por diferentes caminhos. A escolha depende da stack da aplicacao.

### OpenAI Agents SDK em Python com OCI

Este é o caminho usado pelo backend do workshop.

Ideia:

- Instalar `openai-agents`, `langfuse` e `openinference-instrumentation-openai-agents`.
- Configurar credenciais do Langfuse e da OCI Generative AI.
- Criar um `Agent` com instruções e servidores MCP via `mcp_servers`.
- Executar com `Runner.run`.
- Passar o endpoint OCI compatível com OpenAI para o provider do Agents SDK.
- Ativar `OpenAIAgentsInstrumentor().instrument()` para enviar spans do agente ao Langfuse via OpenTelemetry.

### Vercel AI SDK

Exemplo de alternativa para outras aplicações que já usam o AI SDK. Não é o caminho implementado neste repositório.

Pontos importantes:

- Inicializar OpenTelemetry com `LangfuseSpanProcessor`.
- Ativar telemetry na chamada do AI SDK, por exemplo com `experimental_telemetry: { isEnabled: true }`.

### LangChain

Exemplo de alternativa para aplicações que já usam chains e agentes existentes. Não é o caminho implementado neste repositório.

Pontos importantes:

- Usar o `CallbackHandler` do Langfuse.
- Passar o callback na execucao da chain ou agente.
- Em Python e JS/TS, o padrao mental e o mesmo: LangChain emite eventos, o handler transforma esses eventos em traces e observations.

### Python SDK direto

Bom quando você quer mostrar controle manual sobre spans e generations.

Permite explicar claramente:

- Span raiz.
- Observation aninhada.
- Generation.
- `update`.
- `flush` em aplicacoes curtas.

### JS/TS SDK direto

Bom para instrumentar qualquer LLM ou agente em Node.

Permite criar observations manualmente e controlar o que entra no trace.

### OpenTelemetry direto

Bom quando a aplicacao, framework ou collector ja emite spans OTEL.

Este e o caminho para setups customizados, stacks existentes de observabilidade ou linguagens alem dos SDKs nativos.

Se a aplicacao ja tem OTEL, o ponto de partida nao deve ser reescrever instrumentacao. O caminho certo e conectar o pipeline OTEL existente ao Langfuse e garantir propagacao de atributos relevantes.

## Checklist de setup

- [ ] A UI do Langfuse abre.
- [ ] O projeto foi criado.
- [ ] As chaves foram geradas.
- [ ] A aplicacao le as variaveis de ambiente.
- [ ] Um trace minimo aparece na UI.
- [ ] O participante consegue abrir o trace e identificar input, output, modelo e metadata.

## Como saber se o setup está pronto

O foco deste modulo nao e explicar todos os recursos. O objetivo e remover atrito para que as próximas etapas funcionem.

Antes de avançar, valide:

- Projeto representa o espaco onde traces, prompts, evaluators, dashboards e configuracoes ficam agrupados.
- Public key e secret key identificam e autenticam a ingestao.
- Base URL muda conforme Cloud, regiao ou self-host.
- O primeiro objetivo e ingerir um trace, nao dominar todos os recursos da plataforma.

## Próximo passo

Depois do setup, siga para [03 - Observabilidade](03-observabilidade.md) para entender o primeiro trace e para [Workshop: setup local](workshop/00-setup-local-langfuse.md) se quiser executar os comandos na prática.
