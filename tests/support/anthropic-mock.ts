import { createServer, type Server } from 'node:http'

// Faux serveur Messages API pour les tests d'API : le serveur Nitro testé y est pointé par ANTHROPIC_BASE_URL.
// POST /__next empile une réponse ({ status?, body }) ; GET /__last renvoie le dernier corps de requête reçu.
export const startAnthropicMock = async () => {
  const queue: { status: number; body: unknown }[] = []
  let last: unknown = null
  const server: Server = createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(body))
      }
      const path = (req.url ?? '').split('?')[0]
      if (req.method === 'POST' && path === '/__next') {
        queue.push({ status: 200, ...JSON.parse(raw) })
        return send(200, { queued: queue.length })
      }
      if (req.method === 'GET' && path === '/__last') return send(200, last)
      if (req.method === 'POST' && path === '/v1/messages') {
        last = JSON.parse(raw)
        const next = queue.shift() ?? { status: 200, body: message({ lignes: [] }) }
        return send(next.status, next.body)
      }
      send(404, { type: 'error', error: { type: 'not_found_error', message: 'unknown route' } })
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  return { url: `http://127.0.0.1:${port}`, stop: () => new Promise<void>(resolve => server.close(() => resolve())) }
}

// Message Claude dont la sortie structurée est `output`
export const message = (output: unknown, overrides: Record<string, unknown> = {}) => ({
  id: 'msg_mock', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
  content: [{ type: 'text', text: JSON.stringify(output) }], stop_reason: 'end_turn', stop_sequence: null,
  usage: { input_tokens: 1000, output_tokens: 200 }, ...overrides
})
