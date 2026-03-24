import { z } from 'zod';

export const initiateSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  identity: z.string().min(1, 'identity (phone or email) is required'),
});

export const verifySchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  token: z.string().min(1, 'token is required'),
});
