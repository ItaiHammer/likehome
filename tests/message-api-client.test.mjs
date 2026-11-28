import { register } from 'node:module'
import { afterEach, mock, test } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(s, c, next) {
    if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
    return next(s, c)
  }
`))

const { sendRead } = await import('../app/messages/_components/messageApi.ts')
afterEach(() => mock.restoreAll())

test('mark-as-read treats every non-success response, including legacy 400, as a failure', async () => {
  for (const status of [400, 401, 403, 404, 500]) {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status }))
    assert.equal(await sendRead('message-1'), 'failed')
    mock.restoreAll()
  }
})

test('a successful or already-read update is confirmed, and the abort signal is passed through', async () => {
  const controller = new AbortController()
  const fetch = mock.method(globalThis, 'fetch', async () => new Response(null, { status: 200 }))
  assert.equal(await sendRead('message/1', controller.signal), 'marked')
  assert.equal(fetch.mock.calls[0].arguments[0], '/api/messages/message%2F1/read')
  assert.equal(fetch.mock.calls[0].arguments[1].method, 'PATCH')
  assert.equal(fetch.mock.calls[0].arguments[1].signal, controller.signal)
})

test('a connection failure is actionable instead of being treated as a read message', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new TypeError('Connection lost') })
  assert.equal(await sendRead('message-1'), 'failed')
})
