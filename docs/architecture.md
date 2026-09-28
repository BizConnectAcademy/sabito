# Architecture

```text
Platform backend
  |-- POST /v1/auth/token (client credentials stay here)
  v
Web/mobile client -- short-lived JWT --> Socket.IO gateway
                                          |
                                          +-- tenant and user authorization
                                          +-- idempotent message persistence
                                          +-- project-specific knowledge search
                                          +-- local answer extraction/summary
                                          +-- conversation/audit persistence
```

Sabito has its own MySQL database. A project is a tenant, and all conversations, messages,
knowledge, credentials, and audit records carry a project boundary.

Project identity comes from the authenticated client ID, not from user-controlled request data.
The credential lookup maps the client ID to a project and verifies its secret. Logged-in platforms
may attach their own stable user ID; guest requests receive a generated `guest:<uuid>` identity.

The knowledge engine uses MySQL full-text search with a keyword fallback, ranks relevant sentences,
and returns only knowledge-backed statements with source labels. It does not send content to an
external AI API. Search can later be upgraded without changing the Socket.IO protocol.

Reviewed source documents are versioned under `knowledge/<project-slug>`. The import command
updates documents by source path, so backend summaries can be reviewed in Git before they become
runtime knowledge.

HTTP is deliberately small:

- `GET /health`
- `POST /v1/auth/token`
- dashboard administration under `/v1/admin`

All end-user conversation traffic uses one persistent Socket.IO connection.
