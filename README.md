# Sabito-BCA

Sabito-BCA is an independent, multi-project AI agent service for BizConnect Academy and other BCA
team products. It uses Node.js, TypeScript, MySQL, and Socket.IO.

Production domain: `https://sabito.bizconnectacademy.com`

## What is implemented

- Isolated projects with one-time client secrets and credential rotation.
- Short-lived user-scoped JWTs; client secrets remain on platform backends.
- Guest chat tokens when no platform user is signed in.
- Real-time chat acknowledgements and streamed responses over Socket.IO.
- Tenant-scoped conversations and durable, idempotent messages.
- Per-project instructions and MySQL full-text knowledge retrieval.
- Minimal dashboard API for projects, credentials, and manual knowledge.
- Same-origin administration dashboard at the service root.
- Fully self-hosted knowledge search and extractive answer generation.
- Source labels on every knowledge-backed answer and a safe unknown response.
- Rate limits, request validation, audit records, security headers, and secret redaction.

## Local setup

Requirements: Node.js 20+, npm, Docker Desktop (or a compatible MySQL 8 server).

1. Copy `.env.example` to `.env` and replace all three security values.
2. Start MySQL: `docker compose up -d mysql`
3. Install packages: `npm install`
4. Create tables: `npm run migrate`
5. Start Sabito: `npm run dev`
6. Check `http://localhost:4100/health`
7. Open `http://localhost:4100` and sign in with `ADMIN_API_KEY`

Generate secure values with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run it three times for `JWT_SECRET`, `CLIENT_SECRET_PEPPER`, and `ADMIN_API_KEY`.

## Create the first project

```powershell
npm run project:create -- --slug bca --name "BizConnect Academy" --prompt "You are Sabito, the official BizConnect Academy assistant. Answer only from approved BCA knowledge and connected tools."
```

The command displays a client ID and client secret once. Store the secret in the BCA backend, not
in frontend code.

Import the reviewed BCA backend summaries after creating the `bca` project:

```powershell
npm run knowledge:import -- --project bca
```

The Markdown sources live in `knowledge/bca`. Re-running the command updates existing documents
by source path instead of duplicating them.

The same operation is available to a dashboard through `POST /v1/admin/projects` with the
`X-Admin-Key` header. See [Socket.IO protocol](docs/socket-protocol.md) and
[architecture](docs/architecture.md). Production DNS, TLS, Nginx, and firewall guidance is in
[deployment](docs/deployment.md).

## Knowledge policy

Sabito does not call OpenAI or another external model API. Project knowledge is stored in Sabito's
own MySQL database. Answers are selected and summarized from approved knowledge chunks and include
their source title. If the database does not contain a relevant answer, Sabito says that it does
not know instead of inventing information.

The next ingestion stage will analyze the BCA backend, produce reviewed summaries, and insert them
as BCA project knowledge. Live user data should remain in BCA and be exposed later through narrowly
authorized internal tools rather than copied into the knowledge database.
