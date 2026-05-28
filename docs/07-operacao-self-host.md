# 07 - Operação e Self-host

## Objetivo do modulo

Apresentar os principais cuidados para operar Langfuse em ambientes reais, principalmente em self-host.

Este modulo deve conectar engenharia LLM com operacao:

- Deploy.
- Healthcheck.
- Banco de dados.
- Rede.
- Persistencia.
- Seguranca.
- Troubleshooting.

## Quando usar Langfuse Cloud

Langfuse Cloud e o caminho mais simples quando o objetivo e reduzir carga operacional.

Bom para:

- Prototipos.
- Times pequenos.
- Workshops.
- Ambientes onde compliance permite SaaS.
- Times que querem focar na aplicacao, nao na plataforma.

## Quando considerar self-host

Self-host faz sentido quando existem requisitos de:

- Controle total dos dados.
- Restricao de residencia.
- Politicas internas de seguranca.
- Integracao com rede privada.
- Chaves proprias.
- Auditoria de infraestrutura.
- Customizacao operacional.

## Docker Compose: local ou VM

Docker Compose e o caminho mais simples para experimentar Langfuse localmente ou em uma VM.

Casos adequados:

- Workshop.
- Prototipo.
- Ambiente de desenvolvimento.
- Demo interna.
- Instancia pequena em VM, sem alta disponibilidade.

Limites importantes:

- Nao oferece alta disponibilidade por padrao.
- Nao resolve escala horizontal sem componentes adicionais, como load balancer.
- Nao entrega estrategia de backup pronta.
- Para alto throughput ou HA, o caminho recomendado e Kubernetes/Helm ou uma arquitetura de producao equivalente.

Ponto de atenção:

> Docker Compose e excelente para aprender e validar. Nao confundir simplicidade de setup com prontidao para producao critica.

## Setup local com Docker Compose

Requisitos:

- `git`.
- Docker.
- Docker Compose.

Fluxo oficial genérico:

```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up
```

Neste repositório, o mesmo objetivo operacional fica encapsulado em:

```bash
make init-env
make langfuse-up
```

Os comandos deste repositório usam `docker-compose --env-file langfuse.env -f docker-compose.yml` por baixo para garantir que a stack leia o arquivo de ambiente correto.

Depois de alguns minutos, o container `langfuse-web` deve indicar que esta pronto. A UI fica disponivel em:

```txt
http://localhost:3000
```

Para workshop, o objetivo desse setup e permitir que o participante veja a plataforma rodando rapidamente, gere projeto, crie chaves e execute o app local.

## Setup em VM

Para uma VM, os pontos principais sao:

- Usar uma maquina com recursos suficientes.
- Instalar Docker e Docker Compose.
- Clonar o repositorio Langfuse.
- Atualizar secrets antes de subir.
- Abrir apenas as portas necessarias.
- Garantir disco suficiente para acumulacao de traces.

Referência de dimensionamento inicial para uma VM simples:

- Pelo menos 4 cores.
- Pelo menos 16 GiB de memoria.
- Armazenamento suficiente, por exemplo 100 GiB, porque dados de observabilidade crescem rapido.

Portas externas:

- `3000` para a UI/web.
- `9090` para MinIO, quando necessario.

Em ambientes reais, restringir acesso via firewall/security group e expor somente o necessario.

## Secrets no Docker Compose

Antes de usar em VM ou ambiente compartilhado, atualize todos os secrets de `langfuse.env`.

Boas praticas:

- Usar senhas longas e aleatorias.
- Nao reaproveitar secrets entre ambientes.
- Persistir chaves que precisam sobreviver a restart/redeploy.
- Nunca commitar secrets reais.
- Documentar a origem de verdade dos envs usados em runtime.

## Cuidados de producao

### Variaveis de ambiente

Validar sempre a configuracao efetiva em runtime.

Pontos comuns:

- URL publica correta.
- Secrets consistentes.
- Chaves de criptografia persistentes.
- Banco apontando para o host correto.
- Configuracao de auth.
- Base URL usada em callbacks e redirects.

### Persistencia

Em self-host, dados de Langfuse nao devem ser tratados como descartaveis.

Evitar acoes destrutivas sem backup, especialmente:

- Remover volumes Docker.
- Prunar volumes sem entender impacto.
- Recriar banco sem dump.
- Apagar diretorios de dados.

Com Docker Compose, usando os atalhos deste repositório:

- `make langfuse-down` para containers e redes.
- `docker-compose --env-file langfuse.env -f docker-compose.yml down -v` tambem remove volumes.

O `-v` deve ser tratado como destrutivo em ambiente com dados que precisam sobreviver.

### Healthchecks

Healthcheck deve validar o caminho real da aplicacao.

Um teste local dentro do container pode passar mesmo quando o caminho usado pelo servico real falha.

### Rede Docker

Problemas de conectividade devem ser validados a partir do mesmo contexto de rede usado pela aplicacao.

Exemplo de principio:

> Se `langfuse-web` conecta em `langfuse-postgres` pela rede Docker, o teste confiavel deve simular essa rota, nao apenas conectar via `127.0.0.1` dentro do container do banco.

## Troubleshooting: Prisma P1000

Sintoma:

- Langfuse falha ao conectar no Postgres.
- Logs mostram erro de autenticacao Prisma `P1000`.

Causa comum:

- A senha persistida no usuario do Postgres dentro do volume nao bate com a senha usada pelo servico Langfuse na `DATABASE_URL`.
- Alterar apenas `langfuse.env` nao corrige automaticamente o usuario ja existente no banco.

Abordagem correta:

1. Inspecionar a `DATABASE_URL` efetiva usada pelo container.
2. Validar conectividade a partir de outro container na mesma rede Docker.
3. Reconciliar a senha do usuario no Postgres, se necessario.
4. Recriar apenas os servicos afetados.
5. Validar novamente pelo caminho real.

Ponto de atenção:

> Nao tratar deploy como tentativa e erro. Primeiro validar o caminho runtime real, depois alterar configuracao ou script.

## Troubleshooting: redirects para localhost

Sintoma:

- Login, logout ou callback redirecionam para `localhost`.

Causa comum:

- `NEXTAUTH_URL` ou base URL equivalente esta com fallback local.
- A URL publica de deploy nao esta sendo propagada corretamente.

Abordagem:

1. Confirmar URL publica desejada.
2. Inspecionar env efetivo do container.
3. Remover fallback inseguro para `localhost`.
4. Recriar servico web.
5. Testar fluxo de auth.

## Troubleshooting: disco cheio

Em hosts pequenos, observabilidade e deploys podem falhar por disco cheio.

Limpezas normalmente seguras, quando validadas no host:

- Logs JSON antigos de containers.
- Journals antigos.
- Cache de pacotes.
- Releases antigas mantendo atual e rollback imediato.

Evitar sem autorizacao explicita:

- `docker volume prune`.
- Remover volumes de banco.
- Apagar dados ativos de Langfuse.
- Remover imagens/containers sem saber se estao ativos.

VMs precisam de disco suficiente para acumular traces. Em observabilidade, volume de dados cresce naturalmente com trafego.

## Troubleshooting: multimodal tracing e MinIO

No setup Docker Compose, MinIO e usado como blob storage por padrao.

Problema comum:

- Tracing multimodal ou upload direto de midia nao funciona quando MinIO nao esta acessivel fora da rede Docker.

Abordagem:

1. Confirmar se o caso exige upload direto de midia.
2. Verificar se MinIO precisa estar acessivel externamente.
3. Revisar configuracao de blob storage antes de culpar o SDK.

## Upgrade com Docker Compose

Fluxo simples de upgrade:

```bash
docker-compose --env-file langfuse.env -f docker-compose.yml down
docker-compose --env-file langfuse.env -f docker-compose.yml up --pull always
```

Antes de upgrade em ambiente com dados importantes:

- Confirmar backup.
- Ler guia de upgrade da versao alvo.
- Verificar mudancas de v2 para v3, se aplicavel.
- Validar healthcheck depois.
- Validar ingestao de trace depois.

## Shutdown

Se o compose estiver rodando no terminal, `Ctrl+C` para os containers.

Se estiver rodando em background:

```bash
docker-compose --env-file langfuse.env -f docker-compose.yml down
```

Evitar `docker-compose --env-file langfuse.env -f docker-compose.yml down -v` salvo quando a intencao for remover dados persistidos.

Em VM de cloud, tambem parar a instancia quando nao estiver em uso para evitar custo desnecessario.

## Exercicio central

Simular um problema operacional controlado:

1. Subir Langfuse local.
2. Atualizar secrets de exemplo.
3. Validar UI e primeiro trace.
4. Validar healthcheck.
5. Quebrar uma configuracao de URL ou banco em ambiente isolado.
6. Inspecionar logs.
7. Validar a rota real.
8. Corrigir.
9. Documentar causa raiz.

## Mensagem-chave

Operar Langfuse exige o mesmo rigor de qualquer plataforma de producao:

- Configuracao efetiva.
- Persistencia.
- Rede real.
- Healthcheck confiavel.
- Backup.
- Validacao antes e depois da mudanca.

## Resumo prático: Docker Compose

- Melhor caminho para local, workshop e VM simples.
- Atualizar todos os secrets de `langfuse.env`.
- Expor apenas portas necessarias.
- Planejar disco para traces.
- `docker-compose --env-file langfuse.env -f docker-compose.yml down -v` remove volumes.
- Para HA/alto throughput, considerar Kubernetes/Helm.

## Próximo passo

Depois de entender a operação básica, avance para [08 - Monitoring, Métricas e Dashboards](08-metricas-dashboards.md). Para comandos locais deste repositório, use [Operação local e troubleshooting](workshop/05-operacao-local.md).
