import { Hono } from 'hono';
import { authHandler } from './auth.handler';
import { zodValidator } from '../../middleware/zod.validator';
import type { Env } from '../../bindings';
import { initiateSchema, verifySchema } from './auth.schema';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/initiate', zodValidator('json', initiateSchema), authHandler.initiate);
auth.post('/verify', zodValidator('json', verifySchema), authHandler.verify);


export { auth };
