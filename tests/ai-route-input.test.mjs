// Audit F12: malformed AI search requests get a 400, not an unhandled 500
import { register } from 'node:module'
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      if (s.startsWith('../../../search/types') && !s.endsWith('.ts')) return next(s + '.ts', c)
      return next(s, c)
    }`)
)

const streamText = mock.fn(() => ({ stream: 'stream' }))
mock.module('ai', {
  namedExports: {
    streamText,
    Output: { object: (o) => o },
    convertToModelMessages: async (messages) => {
      if (!messages.every((m) => m && typeof m === 'object' && Array.isArray(m.parts))) throw new Error('bad message')
      return messages
    },
    createUIMessageStreamResponse: () => new Response('ok', { status: 200 }),
    toUIMessageStream: (x) => x,
  },
})
mock.module('@ai-sdk/google', { namedExports: { google: () => 'model' } })

const { POST } = await import('../app/api/search/ai/route.ts')
const post = (body) => POST(new Request('http://localhost/api/search/ai', { method: 'POST', body }))

test('invalid JSON -> 400', async () => {
  assert.equal((await post('not json')).status, 400)
})

test('{} and empty messages -> 400', async () => {
  assert.equal((await post('{}')).status, 400)
  assert.equal((await post('{"messages":[]}')).status, 400)
  assert.equal((await post('null')).status, 400)
})

test('messages in the wrong shape -> 400', async () => {
  assert.equal((await post('{"messages":["hi"]}')).status, 400)
})

test('a well-formed request reaches the model', async () => {
  const res = await post(JSON.stringify({ messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'beach in May' }] }], tz: 'America/Los_Angeles' }))
  assert.equal(res.status, 200)
  assert.equal(streamText.mock.callCount(), 1)
})

// QA 3.1.5 S2: a paid model call per request, so huge prompts are refused and old history is dropped
const textMessage = (text) => ({ id: String(Math.random()), role: 'user', parts: [{ type: 'text', text }] })

test('a prompt over 500 characters -> 400, without calling the model', async () => {
  const before = streamText.mock.callCount()
  const res = await post(JSON.stringify({ messages: [textMessage('a'.repeat(501))] }))
  assert.equal(res.status, 400)
  assert.equal(streamText.mock.callCount(), before)
})

test('a 500 character prompt is fine', async () => {
  assert.equal((await post(JSON.stringify({ messages: [textMessage('a'.repeat(500))] }))).status, 200)
})

test('only the 10 newest messages reach the model', async () => {
  const messages = Array.from({ length: 25 }, (_, i) => textMessage(`search ${i}`))
  await post(JSON.stringify({ messages }))
  const sentMessages = streamText.mock.calls.at(-1).arguments[0].messages
  assert.equal(sentMessages.length, 10)
  assert.equal(sentMessages.at(-1).parts[0].text, 'search 24')
})
