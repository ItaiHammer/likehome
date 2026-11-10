// Extensive Unit Tests for Messages API Routes
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock state controllers
let mockAuthUser = { id: 'user-1' }
let mockAccountType = 'personal'
let mockMessageResult = { data: { id: 'msg-1', hotel_id: 'hotel-1', recipient_id: 'user-1', subject: 'Hello', body: 'Welcome', read_at: null, created_at: new Date().toISOString() }, error: null }
let mockCreateMessagesResult = { data: [{ id: 'msg-1' }], error: null }
let mockMarkReadResult = { data: [{ id: 'msg-1', read_at: new Date().toISOString() }], error: null }
let mockRecipientsResult = { data: [{ account_id: 'acc-1', email: 'guest@example.com', full_name: 'John Doe', last_check_in: null, last_status: null }], error: null }
let mockBusinessMessagesResult = { data: [{ id: 'msg-biz-1' }], error: null }
let mockPersonalMessagesResult = { data: [{ id: 'msg-per-1' }], error: null }
let mockAccountTypeError = null

// Register module mocks once
mock.module('../utils/user.ts', {
  namedExports: {
    getUserId: async () => ({
      userId: mockAuthUser ? mockAuthUser.id : null,
    }),
  },
})

mock.module('../utils/accounts.ts', {
  namedExports: {
    getAccountType: async (userId) => ({
      data: mockAccountTypeError ? null : mockAccountType,
      error: mockAccountTypeError,
    }),
  },
})

mock.module('../utils/messages.ts', {
  namedExports: {
    getMessage: async (id) => mockMessageResult,
    getMessagesByAccount: async (accountId) => mockPersonalMessagesResult,
    getMessagesByHotel: async (hotelId) => mockBusinessMessagesResult,
    createMessages: async (hotelId, recipientIds, subject, body) => mockCreateMessagesResult,
    markMessageRead: async (id) => mockMarkReadResult,
    getHotelRecipients: async (hotelId) => mockRecipientsResult,
  },
})

// Import route handlers after mocks are established
const { PATCH: patchRead } = await import('../app/api/messages/[id]/read/route.ts')
const { GET: getSingleMessage } = await import('../app/api/messages/[id]/route.ts')
const { GET: getRecipients } = await import('../app/api/messages/recipients/route.ts')
const { POST: postMessages, GET: getMessages } = await import('../app/api/messages/route.ts')

beforeEach(() => {
  mockAuthUser = { id: 'user-1' }
  mockAccountType = 'personal'
  mockAccountTypeError = null
  mockMessageResult = { data: { id: 'msg-1', hotel_id: 'hotel-1', recipient_id: 'user-1', subject: 'Hello', body: 'Welcome', read_at: null, created_at: new Date().toISOString() }, error: null }
  mockCreateMessagesResult = { data: [{ id: 'msg-1' }], error: null }
  mockMarkReadResult = { data: [{ id: 'msg-1', read_at: new Date().toISOString() }], error: null }
  mockRecipientsResult = { data: [{ account_id: 'acc-1', email: 'guest@example.com', full_name: 'John Doe', last_check_in: null, last_status: null }], error: null }
  mockBusinessMessagesResult = { data: [{ id: 'msg-biz-1' }], error: null }
  mockPersonalMessagesResult = { data: [{ id: 'msg-per-1' }], error: null }
})

// ============================================================================
// 1. PATCH /api/messages/[id]/read -> mark message as read
// ============================================================================
test('PATCH /api/messages/[id]/read - returns 401 when unauthenticated', async () => {
  mockAuthUser = null
  const req = new Request('http://localhost/api/messages/msg-1/read', { method: 'PATCH' })
  const res = await patchRead(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to mark messages read.')
})

test('PATCH /api/messages/[id]/read - returns 400 when markMessageRead returns error', async () => {
  mockMarkReadResult = { data: null, error: { message: 'Database error' } }
  const req = new Request('http://localhost/api/messages/msg-1/read', { method: 'PATCH' })
  const res = await patchRead(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.deepEqual(json, { data: null, error: 'Failed to mark message read' })
})

test('PATCH /api/messages/[id]/read - returns 400 when markMessageRead returns empty data', async () => {
  mockMarkReadResult = { data: [], error: null }
  const req = new Request('http://localhost/api/messages/msg-1/read', { method: 'PATCH' })
  const res = await patchRead(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.deepEqual(json, { data: null, error: 'Failed to mark message read' })
})

test('PATCH /api/messages/[id]/read - successfully marks message read and returns 200', async () => {
  const req = new Request('http://localhost/api/messages/msg-1/read', { method: 'PATCH' })
  const res = await patchRead(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(json.data)
})

// ============================================================================
// 2. GET /api/messages/[id] -> fetch single message
// ============================================================================
test('GET /api/messages/[id] - returns 401 when unauthenticated', async () => {
  mockAuthUser = null
  const req = new Request('http://localhost/api/messages/msg-1')
  const res = await getSingleMessage(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to view messages.')
})

test('GET /api/messages/[id] - returns 400 when getMessage returns error', async () => {
  mockMessageResult = { data: null, error: { message: 'Not found' } }
  const req = new Request('http://localhost/api/messages/msg-1')
  const res = await getSingleMessage(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.deepEqual(json, { data: null, error: 'Failed to get message with id' })
})

test('GET /api/messages/[id] - successfully fetches single message and returns 200', async () => {
  const req = new Request('http://localhost/api/messages/msg-1')
  const res = await getSingleMessage(req, { params: Promise.resolve({ id: 'msg-1' }) })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(json.data)
})

// ============================================================================
// 3. GET /api/messages/recipients?hotel_id= -> fetch eligible recipients
// ============================================================================
test('GET /api/messages/recipients - returns 401 when unauthenticated', async () => {
  mockAuthUser = null
  const req = new Request('http://localhost/api/messages/recipients?hotel_id=hotel-1')
  const res = await getRecipients(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to view message recipients.')
})

test('GET /api/messages/recipients - returns 400 when hotel_id is missing', async () => {
  const req = new Request('http://localhost/api/messages/recipients')
  const res = await getRecipients(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Required field hotel_id must be one string')
})

test('GET /api/messages/recipients - returns 400 when hotel_id is whitespace or non-string', async () => {
  const req = new Request('http://localhost/api/messages/recipients?hotel_id=   ')
  const res = await getRecipients(req)
  assert.equal(res.status, 400)
})

test('GET /api/messages/recipients - returns 400 when getHotelRecipients errors', async () => {
  mockRecipientsResult = { data: null, error: { message: 'RPC Error' } }
  const req = new Request('http://localhost/api/messages/recipients?hotel_id=hotel-1')
  const res = await getRecipients(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.deepEqual(json, { data: null, error: 'Failed to get recipients for hotel' })
})

test('GET /api/messages/recipients - successfully returns eligible recipients and 200', async () => {
  const req = new Request('http://localhost/api/messages/recipients?hotel_id=hotel-1')
  const res = await getRecipients(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(Array.isArray(json.data))
  assert.equal(json.data.length, 1)
})

// ============================================================================
// 4. POST /api/messages -> send message to recipient(s)
// ============================================================================
test('POST /api/messages - returns 401 when unauthenticated', async () => {
  mockAuthUser = null
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'h-1', subject: 'S', body: 'B', recipient_ids: 'u-1' })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to send messages.')
})

test('POST /api/messages - returns 400 on malformed JSON body', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: 'invalid-json{'
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Invalid JSON body.')
})

test('POST /api/messages - returns 400 when required payload fields have incorrect types', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 123, subject: 'S', body: 'B', recipient_ids: 'u-1' })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Required fields must be strings: hotel_id, subject, body')
})

test('POST /api/messages - returns 400 when required payload fields are empty strings', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: '   ', subject: 'S', body: 'B', recipient_ids: 'u-1' })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Missing required fields: hotel_id, subject, body')
})

test('POST /api/messages - returns 400 when recipient_ids string is empty', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: '   ' })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Missing required field: recipient_ids')
})

test('POST /api/messages - successfully parses single string recipient_id', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: ' user-2 ' })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 201)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(json.data)
})

test('POST /api/messages - returns 400 when recipient_ids array contains non-string items', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: ['user-2', 123] })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Required field recipient_ids must be of type string or string[]')
})

test('POST /api/messages - returns 400 when recipient_ids array is empty or all whitespace', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: ['   ', ''] })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Missing required field: recipient_ids')
})

test('POST /api/messages - returns 400 when recipient_ids is an unsupported type (e.g. object)', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: { id: 'u-2' } })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Incorrect type of required field: recipient_ids')
})

test('POST /api/messages - returns 400 when createMessages fails or returns empty data', async () => {
  mockCreateMessagesResult = { data: null, error: { message: 'Insert failed' } }
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: ['user-2'] })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Failed to create messages')
})

test('POST /api/messages - successfully creates messages for array of recipient IDs and returns 201', async () => {
  const req = new Request('http://localhost/api/messages', {
    method: 'POST',
    body: JSON.stringify({ hotel_id: 'hotel-1', subject: 'S', body: 'B', recipient_ids: ['user-2', 'user-3'] })
  })
  const res = await postMessages(req)
  assert.equal(res.status, 201)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(json.data)
})

// ============================================================================
// 5. GET /api/messages -> fetch inbox (personal) or sent (business, with ?hotel_id=)
// ============================================================================
test('GET /api/messages - returns 401 when unauthenticated', async () => {
  mockAuthUser = null
  const req = new Request('http://localhost/api/messages')
  const res = await getMessages(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to view messages.')
})

test('GET /api/messages - returns 401 when getAccountType fails or returns null', async () => {
  mockAccountTypeError = { message: 'Account error' }
  const req = new Request('http://localhost/api/messages')
  const res = await getMessages(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'Failed to retrieve logged in user\'s account type.')
})

test('GET /api/messages - returns 401 on unexpected account type', async () => {
  mockAccountType = 'superuser'
  const req = new Request('http://localhost/api/messages')
  const res = await getMessages(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'Unexpected logged in user\'s account type.')
})

test('GET /api/messages - successfully returns personal inbox messages for personal accounts', async () => {
  mockAccountType = 'personal'
  const req = new Request('http://localhost/api/messages')
  const res = await getMessages(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(Array.isArray(json.data))
})

test('GET /api/messages - returns 400 when personal messages query errors', async () => {
  mockAccountType = 'personal'
  mockPersonalMessagesResult = { data: null, error: { message: 'DB Error' } }
  const req = new Request('http://localhost/api/messages')
  const res = await getMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Failed to get messages for user')
})

test('GET /api/messages - returns 400 for business accounts when hotel_id query param is missing', async () => {
  mockAccountType = 'business'
  const req = new Request('http://localhost/api/messages')
  const res = await getMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Required field hotel_id must be one string')
})

test('GET /api/messages - returns 400 for business accounts when hotel_id is blank', async () => {
  mockAccountType = 'business'
  const req = new Request('http://localhost/api/messages?hotel_id=   ')
  const res = await getMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Required field hotel_id must be one string')
})

test('GET /api/messages - returns 400 when business messages query errors', async () => {
  mockAccountType = 'business'
  mockBusinessMessagesResult = { data: null, error: { message: 'DB Error' } }
  const req = new Request('http://localhost/api/messages?hotel_id=hotel-1')
  const res = await getMessages(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Failed to get messages for hotel id')
})

test('GET /api/messages - successfully returns sent messages for business accounts with valid hotel_id', async () => {
  mockAccountType = 'business'
  const req = new Request('http://localhost/api/messages?hotel_id=hotel-1')
  const res = await getMessages(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.error, null)
  assert.ok(Array.isArray(json.data))
})