# Production domain

Sabito's canonical endpoint is:

```text
https://chat.bizconnectacademy.com
```

## DNS

Create an `A` record for `sabito.bizconnectacademy.com` pointing to the production server's
public IPv4 address. Add an `AAAA` record only when IPv6 is configured on that server.

## Reverse proxy and TLS

1. Set strong `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` production values.
2. Run Sabito on `127.0.0.1:4100`; do not expose MySQL publicly.
3. Copy `deploy/nginx/sabito.bizconnectacademy.com.conf` into the server's Nginx configuration.
4. Obtain a Let's Encrypt certificate for `sabito.bizconnectacademy.com`.
5. Test with `nginx -t`, then reload Nginx.
6. Verify `https://chat.bizconnectacademy.com/health`.

The dedicated `/socket.io/` block is required. It forwards the WebSocket upgrade headers and
disables response buffering so real-time message deltas arrive immediately.

## Allowed origins

`CORS_ORIGINS` contains browser origins allowed to connect. Add each future BCA-team application
explicitly. This is separate from project authentication: every platform must still use its own
client ID and secret to obtain short-lived user tokens. Sabito automatically allows its own
`PUBLIC_URL`; in development it also allows `localhost` and `127.0.0.1` on the configured
`PORT`.

## Firewall

Expose only ports 80 and 443 publicly. Keep port 4100 bound to localhost or a private container
network, and keep MySQL port 3306/3307 private.
