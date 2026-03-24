// Cloudflare Workers environment bindings

export interface Env {
  // JWT configuration
  JWT_SECRET: string;
  JWT_ISSUER: string;

  // Ephemeral verification tokens (verify:{token} → { identity, appId }, TTL 10m)
  AUTH_KV: KVNamespace;

  // Client app registrations (appId → AppConfig JSON)
  APP_REGISTRY: KVNamespace;
}

declare module 'hono' {
  interface ContextVariableMap {
    env: Env;
  }
}
