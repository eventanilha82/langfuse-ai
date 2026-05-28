# 01 - Fundamentos do Langfuse

## Objetivo do modulo

Dar ao participante uma visao clara sobre o que e Langfuse, por que ele existe e qual problema ele resolve em aplicacoes LLM e agentes em producao.

Este modulo deve responder:

- O que e Langfuse?
- Por que usar Langfuse?
- Que problemas ele resolve?
- Como ele se encaixa no ciclo de desenvolvimento de aplicacoes LLM?
- Como adotar de forma incremental, sem uma migracao "big bang"?

## Definicao curta

Langfuse e uma plataforma open-source de engenharia para aplicacoes LLM.

Ela ajuda times a construir, monitorar, depurar e melhorar aplicacoes de IA em producao, reunindo tracing, prompt management, monitoring, metricas e dashboards em um unico lugar.

No recorte deste workshop, o ciclo completo e: subir a stack, gerar traces reais, versionar o prompt usado pela aplicacao e configurar monitores para encontrar sinais importantes sem precisar ler todos os traces manualmente.

## Mapa da plataforma

Para este guia, Langfuse pode ser explicado como quatro blocos principais que se reforcam:

- **Observabilidade:** traces, observations, generations, sessoes, usuarios, timeline, agent graphs e dashboards.
- **Prompt management:** criacao, versionamento, labels de deploy, playground, metricas por versao e link com traces.
- **Monitoring:** evaluators e filtros para encontrar out-of-scope, discordancia do usuario, erros e outros sinais de atencao.
- **Analytics:** dashboards para custo, latencia, volume, uso por usuario, comportamento por sessao e comparacao entre versoes.

Para o participante, esse mapa ajuda a entender que Langfuse nao e apenas uma ferramenta de tracing. Tracing costuma ser a porta de entrada, mas o valor aparece quando o time conecta execucao observada, prompt versionado e monitoramento continuo.

## Problema que o Langfuse resolve

Aplicacoes com LLM deixam de ser simples chamadas de API quando entram em producao.

Elas passam a exigir respostas para perguntas como:

- O que aconteceu nesta execucao?
- Qual prompt foi usado?
- Qual versao do prompt estava em producao?
- Qual modelo respondeu?
- Quanto custou?
- Quanto tempo demorou?
- Qual usuario ou sessao gerou esse comportamento?
- Houve tool calls, retrieval ou passos intermediarios?
- Algum monitor destacou risco, discordancia ou pedido fora de escopo?
- A nova versao melhorou ou piorou?

Logs tradicionais normalmente nao organizam bem essas respostas. Langfuse cria uma camada de engenharia para observar, comparar e melhorar sistemas baseados em LLM.

## Por que usar Langfuse?

Langfuse e apresentado como uma das plataformas open-source mais adotadas para engenharia de LLMs. O valor central esta em oferecer controle, visibilidade e melhoria continua durante todo o ciclo de vida da aplicacao.

### Ciclo completo

Langfuse cobre desde o prototipo ate cargas reais de producao.

No inicio, pode ser usado apenas para tracing. Conforme a aplicacao amadurece, o time pode adicionar prompt management, monitoring, dashboards e controles operacionais.

### Plataforma unificada

Os componentes funcionam de forma independente, mas geram mais valor quando usados juntos:

- Traces mostram o que aconteceu.
- Prompts mostram o que foi enviado ao modelo.
- Evaluators de monitoring destacam sinais que merecem revisao.
- Dashboards acompanham custo, latencia, volume, uso e regressao operacional.

Essa integracao reduz a distancia entre debugging e melhoria. O mesmo trace usado para investigar um problema tambem mostra a versao do prompt, alimenta monitores e aparece em dashboards de operacao.

### Open source

Langfuse e open-source, com licenca MIT na base principal. Isso permite inspecionar o codigo, adotar self-host e manter maior controle sobre dados sensiveis.

Para empresas que precisam de controle de infraestrutura, auditoria ou residencia de dados, self-host e uma parte importante da proposta.

### OpenTelemetry native

Langfuse e nativo em OpenTelemetry. Isso significa que ele usa um padrao conhecido de tracing e pode se integrar com instrumentacao OTEL ja existente.

Na pratica, isso reduz lock-in e facilita integrar Langfuse com stacks de observabilidade e frameworks ja adotados pelo time.

### Integracoes

A documentação oficial destaca um ecossistema amplo de integrações, incluindo frameworks e provedores como:

- LangChain.
- LlamaIndex.
- CrewAI.
- OpenAI Agents.
- Pydantic AI.
- Vercel AI SDK.
- OpenAI.
- Anthropic.

Como Langfuse e compativel com OpenTelemetry, tambem pode funcionar com bibliotecas OTEL e instrumentacoes customizadas.

### Escala

Langfuse usa ClickHouse como parte do backend analitico para permitir consultas em alto volume de traces e observations.

O ponto prático nao e "guardar logs", mas sim consultar comportamento de aplicacoes LLM em escala.

### Assincrono por padrao

Tracing nao deve bloquear a aplicacao.

Os SDKs enviam dados em background, com batching e filas automaticas. A proposta e manter impacto de latencia baixo, enquanto a aplicacao continua executando normalmente.

### Producao

Langfuse deve ser tratado como ferramenta para cargas reais, nao apenas uma demo de tracing. Quando precisar citar números públicos de adoção, use a documentação oficial ou o site do Langfuse como fonte atualizada.

## O que o Langfuse ajuda a fazer?

### Debugging e observabilidade

Langfuse permite inspecionar traces detalhados de uma execucao LLM.

Um trace pode mostrar:

- Entrada do usuario.
- Prompt montado.
- Chamada ao modelo.
- Latencia.
- Tokens.
- Custo.
- Resposta.
- Erros.
- Tool calls.
- Retrieval.
- Embeddings.
- Chamadas de API.
- Etapas intermediarias de agentes ou pipelines.

Isso permite depurar sistemas LLM de forma muito mais precisa do que olhando apenas logs textuais.

Em fluxos agenticos, Langfuse tambem pode representar agentes como grafos. Isso ajuda a visualizar decisoes, bifurcacoes, chamadas de ferramentas e passos intermediarios de workflows mais complexos.

### Prompt management

Langfuse permite criar, versionar, colaborar e promover prompts entre ambientes.

O valor para o time e separar iteracao de prompt de deploy de codigo. Um prompt pode ser atualizado, comparado e promovido com controle de versao.

O fluxo completo inclui criar prompts pela UI, SDK ou API, testar no playground, versionar mudancas, promover por labels, linkar prompts aos traces e comparar custo, latencia e comportamento entre versoes.

### Monitoring

Langfuse permite criar monitores baseados em evaluators para separar sinal de ruido em producao.

No workshop, o foco sao dois sinais:

- **Out-of-Scope Request:** o usuario pediu algo que o agente nao deveria resolver.
- **User Disagreement:** o usuario contestou a resposta anterior, indicando alta chance de erro.

Esses monitores usam traces reais. A ideia e encontrar rapidamente os casos que merecem leitura humana, ajuste de prompt, ajuste de ferramenta ou revisao de escopo.

### Custos e performance

Langfuse ajuda a acompanhar:

- Custo por modelo.
- Latencia por provedor.
- Uso por usuario.
- Uso por sessao.
- Comparacao entre fluxos, prompts e versoes.

Isso torna possivel discutir qualidade e custo com dados, nao apenas opiniao.

## Adoção incremental

Um ponto importante para o workshop: Langfuse nao exige adocao completa desde o primeiro dia.

Um caminho natural:

1. Comecar apenas com tracing.
2. Adicionar user_id, session_id, metadata e tags.
3. Versionar prompts.
4. Configurar monitores para sinais importantes.
5. Criar dashboards de custo, latencia e volume.
6. Operar com processos de producao.

Mensagem para reforcar:

> Comece com tracing. Evolua para prompt management, monitoring e operacao em escala.

## Onde comecar

Para um time novo, a ordem mais pragmatica e:

1. **Integrar tracing da aplicacao ou agente.** Primeiro tornar o comportamento observavel.
2. **Integrar prompt management.** Depois remover prompts criticos do codigo e criar controle de versao.
3. **Configurar monitoring.** Por fim, destacar automaticamente traces fora de escopo, discordancias e comportamentos que merecem revisao.

Essa ordem evita tentar implantar todo o processo de uma vez. O time comeca vendo o que acontece hoje e evolui para controlar e melhorar o que sera publicado amanha.

## Resumo do capítulo

Uma aplicacao LLM em producao nao falha apenas com erro 500.

Ela pode falhar respondendo com baixa qualidade, usando o prompt errado, chamando a ferramenta errada, gastando demais, demorando demais ou piorando depois de uma mudanca aparentemente pequena.

Langfuse entra para tornar esses comportamentos observaveis, comparaveis e mensuraveis.

O objetivo nao e apenas "ver logs bonitos". O objetivo e criar uma base confiavel para responder:

- O que aconteceu?
- Por que aconteceu?
- Qual prompt, modelo, ferramenta, usuario e sessao estavam envolvidos?
- Algum monitor destacou comportamento suspeito?
- A mudanca melhorou ou piorou?

## Próximo passo

No próximo capítulo, você prepara o ambiente e decide entre Langfuse Cloud ou self-host local.

No workshop, o primeiro contraste prático será:

- Antes: uma chamada LLM com `print()` e logs soltos.
- Depois: a mesma chamada instrumentada no Langfuse, com trace, generation, custo, latencia, usuario, sessao e metadados.
