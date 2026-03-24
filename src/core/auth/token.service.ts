export interface VerificationPayload {
  identity: string;
  appId: string;
}

const KV_TTL_SECONDS = 600; // 10 minutes

export const storeVerificationToken = async (
  kv: KVNamespace,
  identity: string,
  appId: string
): Promise<string> => {
  const token = crypto.randomUUID();
  const payload: VerificationPayload = { identity, appId };
  await kv.put(`verify:${token}`, JSON.stringify(payload), { expirationTtl: KV_TTL_SECONDS });
  return token;
};

export const consumeVerificationToken = async (
  kv: KVNamespace,
  token: string
): Promise<VerificationPayload | null> => {
  const raw = await kv.get(`verify:${token}`);
  if (!raw) return null;

  await kv.delete(`verify:${token}`);
  return JSON.parse(raw) as VerificationPayload;
};
