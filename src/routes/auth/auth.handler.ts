import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getAppConfig } from '../../core/auth/app.registry';
import { storeVerificationToken, consumeVerificationToken } from '../../core/auth/token.service';
import { dispatchCallback } from '../../core/auth/callback.service';
import { generateToken } from '../../utils/jwt';

export const authHandler = {
  initiate: async (c: Context) => {
    const { appId, identity } = await c.req.json();

    const appConfig = await getAppConfig(c.env.APP_REGISTRY, appId);
    if (!appConfig) {
      throw new HTTPException(404, { message: `Application '${appId}' is not registered` });
    }

    const token = await storeVerificationToken(c.env.AUTH_KV, identity, appId);

    const cleanBaseUrl = appConfig.redirectUrl.replace(/\/$/, '');
    const magicLink = `${cleanBaseUrl}/verify?token=${token}`;

    console.log(`[AuthHandler] Verification initiated for identity=${identity} appId=${appId}`);

    return c.json({
      success: true,
      data: { token, magicLink },
    });
  },

  verify: async (c: Context) => {
    const { appId, token } = await c.req.json();

    const payload = await consumeVerificationToken(c.env.AUTH_KV, token);
    if (!payload) {
      throw new HTTPException(400, { message: 'Invalid or expired verification token' });
    }

    if (payload.appId !== appId) {
      throw new HTTPException(400, { message: 'Token does not belong to this application' });
    }

    const appConfig = await getAppConfig(c.env.APP_REGISTRY, appId);
    if (!appConfig) {
      throw new HTTPException(404, { message: `Application '${appId}' is not registered` });
    }

    const jwt = await generateToken(c.env, { sub: payload.identity, aud: appId }, appConfig);

    console.log(`[AuthHandler] Verification successful for identity=${payload.identity} appId=${appId}`);

    if (appConfig.callbackUrl) {
      const callbackPayload = {
        identity: payload.identity,
        appId,
        jwt,
        verifiedAt: new Date().toISOString(),
      };
      c.executionCtx.waitUntil(dispatchCallback(appConfig.callbackUrl, callbackPayload));
    }

    return c.json({ success: true, data: { jwt } });
  },
};
