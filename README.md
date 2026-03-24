# Agnostic Auth

Universal Identity Provider (IdP) built on Cloudflare Workers. Handles magic-link authentication and issues standard JWTs for multiple client applications — no database required.

**Production URL:** `https://agnostic-auth.leolicona-dev.workers.dev`

---

## How it works

```
1. Your app calls POST /auth/initiate  →  receives a token + magicLink
2. Your app sends the magicLink to the user (email, SMS, WhatsApp — your choice)
3. User clicks the link → your app calls POST /auth/verify with the token
4. Service returns a signed JWT with standard claims
```

The service never stores users. It only verifies that a token was legitimately issued and returns a JWT. What you do with that JWT is up to your app.

---

## JWT Claims

All issued tokens follow the standard OIDC structure:

```json
{
  "sub": "+521234567890",
  "iss": "auth-service-agnostic",
  "aud": "your-app-id",
  "iat": 1774378853,
  "exp": 1774379753
}
```

| Claim | Description |
|---|---|
| `sub` | Verified identity (phone number or email) |
| `iss` | Always `auth-service-agnostic` |
| `aud` | Your `appId` — use this to scope tokens to your app |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expires at — 15 minutes by default, configurable per app |

---

## Registering your app

Before calling any endpoint, your app must be registered in the `APP_REGISTRY` KV namespace. Contact the service owner or run:

```bash
wrangler kv key put --binding=APP_REGISTRY --preview false --remote "your-app-id" \
  '{
    "appId": "your-app-id",
    "redirectUrl": "https://your-app.com",
    "callbackUrl": "https://your-app.com/api/auth/callback",
    "tokenTtlSeconds": 900
  }'
```

### App configuration fields

| Field | Required | Description |
|---|---|---|
| `appId` | Yes | Unique identifier for your app. Used in all API requests |
| `redirectUrl` | Yes | Base URL of your app. The magic link is built as `{redirectUrl}/verify?token={token}` |
| `callbackUrl` | No | URL to receive a POST webhook after successful verification |
| `jwtSecret` | No | Per-app signing secret. Falls back to the global secret if not set |
| `tokenTtlSeconds` | No | JWT expiration in seconds. Default: `900` (15 min) |

---

## API Reference

### `POST /auth/initiate`

Generates an ephemeral verification token and returns a magic link.

**Request**
```json
{
  "appId": "your-app-id",
  "identity": "+521234567890"
}
```

| Field | Type | Description |
|---|---|---|
| `appId` | string | Your registered app ID |
| `identity` | string | The user's phone number or email address |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "token": "f91ef98b-9330-4182-943d-07987d76975f",
    "magicLink": "https://your-app.com/verify?token=f91ef98b-9330-4182-943d-07987d76975f"
  }
}
```

| Field | Description |
|---|---|
| `token` | Raw verification token. Valid for **10 minutes**, **single-use** |
| `magicLink` | Ready-to-send URL built from your app's `redirectUrl` |

**What to do next:** send the `magicLink` to the user through your preferred channel (email, SMS, WhatsApp, etc.). When the user clicks it, extract the `token` from the query string and call `/auth/verify`.

---

### `POST /auth/verify`

Consumes the verification token and issues a signed JWT.

**Request**
```json
{
  "appId": "your-app-id",
  "token": "f91ef98b-9330-4182-943d-07987d76975f"
}
```

| Field | Type | Description |
|---|---|---|
| `appId` | string | Must match the `appId` used in `/auth/initiate` |
| `token` | string | Token received from the magic link query string |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "jwt": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIrNTIx..."
  }
}
```

The token is immediately invalidated after a successful verification — replaying the same token returns `400`.

---

### `GET /health`

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-03-24T19:53:28.263Z"
}
```

---

## Error responses

All errors follow this structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable description",
  "timestamp": "2026-03-24T19:53:28.263Z",
  "requestId": "9e17e90e0dcd6725"
}
```

| HTTP Status | `error` | Cause |
|---|---|---|
| `400` | `HTTP_EXCEPTION` | Invalid or expired token, token/appId mismatch |
| `400` | `VALIDATION_ERROR` | Missing or invalid request fields |
| `404` | `HTTP_EXCEPTION` | `appId` not registered |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many requests |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## Integration examples

### Node.js / TypeScript

```typescript
const BASE_URL = 'https://agnostic-auth.leolicona-dev.workers.dev';

// 1. Initiate authentication
async function initiateAuth(appId: string, identity: string) {
  const res = await fetch(`${BASE_URL}/auth/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, identity }),
  });
  const { data } = await res.json();
  // data.magicLink → send to user via your channel
  return data;
}

// 2. Verify token (call this when the user lands on your /verify page)
async function verifyToken(appId: string, token: string) {
  const res = await fetch(`${BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, token }),
  });
  const { data } = await res.json();
  // data.jwt → store in cookie/localStorage, use for authenticated requests
  return data.jwt;
}
```

### Python

```python
import httpx

BASE_URL = "https://agnostic-auth.leolicona-dev.workers.dev"

def initiate_auth(app_id: str, identity: str) -> dict:
    res = httpx.post(f"{BASE_URL}/auth/initiate", json={
        "appId": app_id,
        "identity": identity,
    })
    return res.json()["data"]

def verify_token(app_id: str, token: str) -> str:
    res = httpx.post(f"{BASE_URL}/auth/verify", json={
        "appId": app_id,
        "token": token,
    })
    return res.json()["data"]["jwt"]
```

### cURL

```bash
# 1. Initiate
curl -X POST https://agnostic-auth.leolicona-dev.workers.dev/auth/initiate \
  -H "Content-Type: application/json" \
  -d '{"appId": "your-app-id", "identity": "+521234567890"}'

# 2. Verify
curl -X POST https://agnostic-auth.leolicona-dev.workers.dev/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"appId": "your-app-id", "token": "<token-from-step-1>"}'
```

---

## Callback webhook (optional)

If your app config includes a `callbackUrl`, the service will POST to that URL after every successful verification. Use this to create or update the user record in your own database.

**Payload sent to your `callbackUrl`:**
```json
{
  "identity": "+521234567890",
  "appId": "your-app-id",
  "jwt": "eyJhbGciOiJIUzI1NiJ9...",
  "verifiedAt": "2026-03-24T19:53:28.263Z"
}
```

The callback is fire-and-forget — a failure on your end does not affect the JWT response to the user.

---

## Verifying JWTs in your app

Use any standard JWT library. Verify the `aud` claim matches your `appId` to prevent token reuse across apps.

```typescript
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const { payload } = await jwtVerify(token, secret, {
  issuer: 'auth-service-agnostic',
  audience: 'your-app-id',
});

console.log(payload.sub); // "+521234567890"
```

---

## Self-hosting

### Requirements
- Cloudflare account
- Wrangler CLI (`npm i -g wrangler`)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/leolicona/agnostic-auth.git
cd agnostic-auth
npm install

# 2. Create KV namespaces
wrangler kv namespace create AUTH_KV
wrangler kv namespace create APP_REGISTRY
# Update the IDs in wrangler.jsonc with the returned values

# 3. Set the signing secret
wrangler secret put JWT_SECRET

# 4. Register your first app
wrangler kv key put --binding=APP_REGISTRY --preview false --remote "my-app" \
  '{"appId":"my-app","redirectUrl":"https://my-app.com"}'

# 5. Deploy
npm run deploy
```
