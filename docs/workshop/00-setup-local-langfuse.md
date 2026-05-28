# 00 - Setup local com Docker Compose

## Objetivo

Subir uma instância local do Langfuse conforme a documentação oficial de self-host via Docker Compose, com projeto e chaves do workshop criados automaticamente.

## 1. Criar arquivos de ambiente

Na raiz do repositório:

```bash
make init-env
```

Isso cria:

- `.env`
- `langfuse.env`

Para o workshop, as chaves locais já vêm alinhadas:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-workshop
LANGFUSE_SECRET_KEY=sk-lf-workshop
LANGFUSE_BASE_URL=http://localhost:3000
```

## 2. Subir Langfuse

```bash
make langfuse-up
```

Esse comando fica em foreground para mostrar logs. Mantenha esse terminal aberto e aguarde o container `langfuse-web` ficar pronto. A documentação oficial indica que isso costuma levar alguns minutos no primeiro start.

Depois acesse:

```txt
http://localhost:3000
```

Credenciais locais:

```txt
Email: workshop@example.com
Senha: workshop-password
```

## 3. O que existe no Compose

O Compose local inclui:

- `langfuse-web`: UI e API do Langfuse.
- `langfuse-worker`: processamento assíncrono.
- `postgres`: banco relacional.
- `clickhouse`: armazenamento analítico de traces.
- `redis`: filas/cache.
- `minio`: blob storage local.

## 4. Validar a configuração

```bash
docker-compose --env-file langfuse.env -f docker-compose.yml config --quiet
```

Se o comando não imprimir nada e retornar código zero, a configuração YAML está válida.

## 5. Publicar o prompt do laboratório

O backend busca o prompt `production` no Langfuse antes de executar o agente. Publique a versão inicial antes do primeiro chat:

```bash
make seed-prompt
```

Rode esse comando em outro terminal, com o Langfuse ainda aberto.

## 6. MCP do laboratório

O backend não usa mais function tools locais. A ferramenta do laboratório vem de um servidor MCP por Streamable HTTP.

O DeepWiki MCP usa o endpoint remoto:

```txt
https://mcp.deepwiki.com/mcp
```

Essa URL fica em `.env` como `DEEPWIKI_MCP_URL`.

## 7. Cuidados

Este setup é para desenvolvimento local. Antes de expor fora da máquina:

- Troque `SALT`, `ENCRYPTION_KEY`, `NEXTAUTH_SECRET` e senhas.
- Restrinja portas internas.
- Defina backup para Postgres, ClickHouse e MinIO.
- Considere Kubernetes para alta disponibilidade.

## Resultado esperado

Ao final deste passo, você tem Langfuse local em `http://localhost:3000`, o prompt inicial publicado, o MCP auxiliar pronto e um projeto chamado `Oracle AI Lab Workshop`.
