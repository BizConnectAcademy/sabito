# Socket.IO protocol

## Authentication

The platform backend first requests a 15-minute chat token. For a logged-in user it supplies its
stable user ID:

```http
POST /v1/auth/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/json

{ "external_user_id": "platform-user-123" }
```

For guest chat, send an empty JSON object or omit the body:

```http
POST /v1/auth/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/json

{}
```

Sabito returns a generated `external_user_id` such as `guest:<uuid>` and marks
`identity_type` as `guest`. The platform may keep that guest ID in its server-side session and
send it on a later token request if it wants the guest to resume the same identity.

The client secret must never be sent to a browser or mobile application. The platform backend
returns only the short-lived access token to its client.

The client ID is looked up in Sabito's credential table and maps to exactly one project. After the
secret is verified, the project ID is placed in the signed token. The client secret is hashed,
opaque, and never decoded.

Connect with:

```js
const socket = io(SABITO_URL, {
  auth: { token: accessToken },
  transports: ["websocket"]
});
```

## Client events

### `conversation:start`

Optional. A conversation is also created automatically when `message:send` has no
`conversationId`.

```js
socket.emit("conversation:start", { metadata: { locale: "en" } }, console.log);
```

### `message:send`

```js
socket.emit("message:send", {
  conversationId,
  idempotencyKey: crypto.randomUUID(),
  content: "How do I access my course?"
}, (ack) => {
  // ack.data contains conversationId and userMessageId
});
```

The idempotency key identifies this one message operation. Retrying the same content with the same
key does not run the AI twice. Reusing the key for different content returns
`IDEMPOTENCY_CONFLICT`.

## Server events

- `session:ready`: socket authentication succeeded.
- `message:started`: an assistant database record was created.
- `message:delta`: append `delta` to the visible response.
- `message:complete`: authoritative completed response.
- `message:error`: generation failed; use `code` for retry/error UI.

Socket acknowledgement confirms that a message was durably accepted. It is not the AI response.
