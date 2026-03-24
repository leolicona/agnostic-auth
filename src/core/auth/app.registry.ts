export interface AppConfig {
  appId: string;
  redirectUrl: string;
  callbackUrl?: string;
  jwtSecret?: string;
  tokenTtlSeconds?: number;
  allowedChannels?: string[];
}

export const getAppConfig = async (
  registry: KVNamespace,
  appId: string
): Promise<AppConfig | null> => {
  return registry.get<AppConfig>(appId, 'json');
};
