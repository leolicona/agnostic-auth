import { SignJWT, jwtVerify } from 'jose';
import type { AppConfig } from '../core/auth/app.registry';

interface TokenClaims {
  sub: string;
  aud: string;
}

export const generateToken = async (
  env: { JWT_SECRET: string; JWT_ISSUER: string },
  claims: TokenClaims,
  appConfig?: AppConfig
): Promise<string> => {
  const signingSecret = appConfig?.jwtSecret ?? env.JWT_SECRET;
  const secret = new TextEncoder().encode(signingSecret);
  const ttl = appConfig?.tokenTtlSeconds ? `${appConfig.tokenTtlSeconds}s` : '15m';

  return await new SignJWT({ sub: claims.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(claims.aud)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret);
};

export const verifyToken = async (
  env: { JWT_SECRET: string },
  token: string
): Promise<Record<string, unknown> | null> => {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
};
