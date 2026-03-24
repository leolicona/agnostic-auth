export interface CallbackPayload {
  identity: string;
  appId: string;
  jwt: string;
  verifiedAt: string;
}

export const dispatchCallback = async (
  callbackUrl: string,
  payload: CallbackPayload
): Promise<void> => {
  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Service': 'agnostic-auth',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[CallbackService] Callback to ${callbackUrl} failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`[CallbackService] Failed to dispatch callback to ${callbackUrl}:`, error);
  }
};
