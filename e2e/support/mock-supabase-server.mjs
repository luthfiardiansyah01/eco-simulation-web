import { createServer } from 'node:http'

const port = Number(process.env.E2E_SUPABASE_PORT ?? 54329)

function corsHeaders(request) {
  return {
    'access-control-allow-origin': request.headers.origin ?? '*',
    'access-control-allow-headers':
      'authorization, apikey, content-type, x-client-info, prefer, x-supabase-api-version',
    'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
    vary: 'Origin',
  }
}

function send(request, response, status, body) {
  response.writeHead(status, {
    ...corsHeaders(request),
    'content-type': 'application/json',
  })
  response.end(JSON.stringify(body))
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(request))
    response.end()
    return
  }

  if (url.pathname === '/health') {
    send(request, response, 200, { ok: true })
    return
  }

  // The default server-side test state is a guest. Browser tests that need a
  // signed-in state install a Playwright route with richer fixtures.
  if (url.pathname === '/auth/v1/user') {
    send(request, response, 401, {
      code: 'session_not_found',
      message: 'Session not found',
    })
    return
  }

  if (url.pathname.startsWith('/auth/v1/')) {
    send(request, response, 200, {})
    return
  }

  if (url.pathname === '/rest/v1/rpc/get_leaderboard') {
    send(request, response, 200, [])
    return
  }

  if (url.pathname.startsWith('/rest/v1/')) {
    send(request, response, 200, [])
    return
  }

  send(request, response, 404, { message: 'Not found in the e2e Supabase server' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`E2E Supabase mock listening on http://127.0.0.1:${port}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
