import { Hono } from 'hono'
import type { Env } from './bindings'
import { corsMiddleware } from './middleware/cors'
import { securityHeaders } from './middleware/security.headers'
import { globalErrorHandler } from './middleware/error.handler'
import { auth } from './routes/auth'

const app = new Hono<{ Bindings: Env }>()

app.onError(globalErrorHandler)
app.use('*', securityHeaders())
app.use('*', corsMiddleware)

app.route('/auth', auth)

app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Agnostic Auth — Identity Provider',
    version: '2.0.0',
    endpoints: {
      initiate: 'POST /auth/initiate',
      verify: 'POST /auth/verify',
      health: 'GET /auth/health',
    },
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

export default app
