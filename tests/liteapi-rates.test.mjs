// Tests for lib/liteapi/rates.ts — run with `npm test`
// fetch is mocked; every response below is a small hand-written fixture.
import { register } from 'node:module'
import { test, mock, beforeEach, afterEach, describe } from 'node:test'
import assert from 'node:assert/strict'

// `server-only` is resolved by Next itself, so give Node an empty module for it
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true }
      return next(s, c)
    }`)
)

process.env.LITEAPI_KEY = 'test'

const { parseRatesResponse, quoteForRoom, getRoomRates, getFromPrices, liveRoomPrice, __clearLiteApiCache } = await import(
  '../lib/liteapi/rates.ts'
)
const { calculateTotalPrice } = await import('../utils/reservation-logic.ts')

const IN = '2026-11-10'
const OUT = '2026-11-13'
const Q = { checkIn: IN, checkOut: OUT, adults: 2, children: [] }

const usd = (amount) => [{ amount, currency: 'USD' }]
const rate = (amount, extra = {}) => ({
  rateId: 'rate',
  name: 'Standard King Room',
  boardType: 'RO',
  retailRate: { total: usd(amount) },
  cancellationPolicies: { refundableTag: 'NRFN' },
  ...extra,
})
const offer = (offerId, amount, rateExtra = {}, offerExtra = {}) => ({ offerId, rates: [rate(amount, rateExtra)], ...offerExtra })
const hotel = (hotelId, ...roomTypes) => ({ hotelId, roomTypes })

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const priced = (...hotels) => json({ data: hotels })

const fetchMock = mock.method(globalThis, 'fetch', async () => priced())
const warn = mock.method(console, 'warn', () => {})

const sentBody = (call = 0) => JSON.parse(fetchMock.mock.calls[call].arguments[1].body)

beforeEach(() => {
  __clearLiteApiCache()
  fetchMock.mock.resetCalls()
  fetchMock.mock.mockImplementation(async () => priced())
  warn.mock.resetCalls()
  process.env.LITEAPI_KEY = 'test'
})

afterEach(() => {
  mock.timers.reset()
})

describe('request', () => {
  test('getRoomRates posts the stay with room mapping', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 300))))
    await getRoomRates(['lp1', 'lp2'], { checkIn: IN, checkOut: OUT, adults: 3, children: [] })

    assert.equal(fetchMock.mock.callCount(), 1)
    const [url, init] = fetchMock.mock.calls[0].arguments
    assert.equal(url, 'https://api.liteapi.travel/v3.0/hotels/rates')
    assert.equal(init.method, 'POST')
    assert.equal(init.headers['X-API-Key'], 'test')
    assert.equal(init.headers['Content-Type'], 'application/json')
    assert.equal(init.cache, 'no-store')
    assert.ok(init.signal instanceof AbortSignal)
    assert.deepEqual(sentBody(), {
      hotelIds: ['lp1', 'lp2'],
      occupancies: [{ adults: 3 }],
      currency: 'USD',
      guestNationality: 'US',
      checkin: IN,
      checkout: OUT,
      timeout: 6,
      limit: 2,
      roomMapping: true,
    })
  })

  test("children are sent as their ages, and left out when there are none", async () => {
    await getRoomRates(['lp1'], { ...Q, children: [8, 8] })
    assert.deepEqual(sentBody(0).occupancies, [{ adults: 2, children: [8, 8] }])
    await getFromPrices(['lp1'], { ...Q, adults: 1, children: [5] })
    assert.deepEqual(sentBody(1).occupancies, [{ adults: 1, children: [5] }])
    await getFromPrices(['lp1'], { ...Q, adults: 4 })
    assert.deepEqual(sentBody(2).occupancies, [{ adults: 4 }])
  })

  test('getFromPrices asks for one rate per hotel, from the same offers the stay page sells', async () => {
    await getFromPrices(['lp1'], Q)
    const body = sentBody()
    assert.equal(body.maxRatesPerHotel, 1)
    // The sandbox's Villa Fontaine Grand Haneda: $291.58 without roomMapping, an offer the mapped rooms never get
    assert.equal(body.roomMapping, true)
    assert.deepEqual(body.occupancies, [{ adults: 2 }])
  })

  test('duplicate and empty ids are sent once', async () => {
    await getRoomRates(['lp1', '', 'lp1', 'lp2'], Q)
    assert.deepEqual(sentBody().hotelIds, ['lp1', 'lp2'])
  })

  test('more than 200 ids are split into batches of at most 200', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `lp${i}`)
    fetchMock.mock.mockImplementation(async (_url, init) =>
      priced(...JSON.parse(init.body).hotelIds.map((id) => hotel(id, offer(`o-${id}`, 100))))
    )
    const result = await getFromPrices(ids, Q)

    assert.equal(fetchMock.mock.callCount(), 3)
    assert.deepEqual([0, 1, 2].map((i) => sentBody(i).hotelIds.length), [200, 200, 50])
    assert.deepEqual([0, 1, 2].map((i) => sentBody(i).limit), [200, 200, 50])
    assert.equal(result.size, 450)
    assert.ok([...result.values()].every((r) => r.status === 'live'))
  })
})

describe('parseRatesResponse', () => {
  test('perNight is total / nights and multiplies back to the exact total', () => {
    const r = parseRatesResponse({ data: [hotel('lp1', offer('o1', 163.66))] }, 3).get('lp1')
    assert.equal(r.cheapest.total, 163.66)
    assert.equal(r.cheapest.perNight, 163.66 / 3)
    assert.equal(calculateTotalPrice(IN, OUT, r.cheapest.perNight), 163.66)

    for (const total of [0.01, 99.99, 100, 163.66, 389.97, 1234.57, 4999.99]) {
      for (const nights of [1, 2, 3, 7, 13, 30]) {
        const perNight = parseRatesResponse({ data: [hotel('h', offer('o', total))] }, nights).get('h').cheapest.perNight
        const out = new Date(Date.UTC(2026, 10, 10 + nights)).toISOString().slice(0, 10)
        assert.equal(calculateTotalPrice(IN, out, perNight), total, `${total} over ${nights} nights`)
      }
    }
  })

  test('skips offers without an offerId, a priced USD total, or a positive amount', () => {
    const body = {
      data: [
        hotel(
          'lp1',
          { rates: [rate(50)] },
          offer('placeholder', 0, { rateId: '', retailRate: { total: null } }),
          offer('euro', 60, { retailRate: { total: [{ amount: 60, currency: 'EUR' }] } }),
          offer('zero', 0),
          { offerId: 'no-rates' },
          { offerId: 'empty-rates', rates: [] },
          { offerId: 'half-priced', rates: [rate(40), rate(0, { retailRate: { total: null } })] },
          offer('good', 120)
        ),
        hotel('lp2', offer('placeholder', 0, { retailRate: { total: null } }), { rates: [rate(10)] }),
        hotel('lp3'),
      ],
    }
    const map = parseRatesResponse(body, 1)

    assert.deepEqual([...map.keys()], ['lp1'])
    const r = map.get('lp1')
    assert.equal(r.cheapest.offerId, 'good')
    assert.deepEqual(Object.values(r.byName).map((q) => q.offerId), ['good'])
  })

  test('accepts money as an object or an array, and reads mappedRoomId from the rate only', () => {
    const body = {
      data: [
        hotel(
          'lp1',
          offer('a', 0, { retailRate: { total: { amount: 210, currency: 'USD' } }, mappedRoomId: 101 }),
          // LiteAPI sets mappedRoomId on the rate; an offer-level one isn't real data
          offer('b', 220, {}, { mappedRoomId: '202' }),
          offer('c', 230, { mappedRoomId: '303' }, { mappedRoomId: 999 })
        ),
      ],
    }
    const r = parseRatesResponse(body, 1).get('lp1')

    assert.equal(r.mapped, true)
    assert.deepEqual(Object.keys(r.byRoom).sort(), ['101', '303'])
    assert.equal(r.byRoom['101'].total, 210)
    assert.equal(r.byRoom['303'].offerId, 'c')
  })

  test('the price is never below the suggested selling price', () => {
    const ssp = (total, suggested) => ({ retailRate: { total: usd(total), suggestedSellingPrice: [{ ...usd(suggested)[0], source: '' }] } })
    const body = {
      data: [
        hotel(
          'lp1',
          // The sandbox probe: retail 289.05, SSP 332.41
          offer('below', 0, { ...ssp(289.05, 332.41), mappedRoomId: 1 }),
          offer('above', 0, { ...ssp(300, 250), mappedRoomId: 2 }),
          offer('no-ssp', 280, { mappedRoomId: 3 }),
          offer('euro-ssp', 0, { retailRate: { total: usd(270), suggestedSellingPrice: [{ amount: 400, currency: 'EUR' }] }, mappedRoomId: 4 })
        ),
      ],
    }
    const r = parseRatesResponse(body, 2).get('lp1')

    assert.equal(r.byRoom['1'].total, 332.41)
    assert.equal(r.byRoom['1'].perNight, 332.41 / 2)
    assert.equal(r.byRoom['2'].total, 300)
    assert.equal(r.byRoom['3'].total, 280)
    assert.equal(r.byRoom['4'].total, 270)
    // The cheapest is picked on the price shown, so the SSP can reorder offers
    assert.equal(r.cheapest.offerId, 'euro-ssp')
    const raised = parseRatesResponse({ data: [hotel('lp2', offer('x', 0, ssp(200, 320)), offer('y', 300))] }, 1).get('lp2')
    assert.equal(raised.cheapest.offerId, 'y')
  })

  test("a refundable rate's free cancellation ends a day before its first fee's GMT date", () => {
    const policy = (refundableTag, ...infos) => ({
      cancellationPolicies: {
        refundableTag,
        hotelRemarks: [],
        cancelPolicyInfos: infos.map(([cancelTime, amount]) => ({ cancelTime, amount, currency: 'USD', type: 'amount', timezone: 'GMT' })),
      },
    })
    const body = {
      data: [
        hotel(
          'lp1',
          offer('two-steps', 300, { ...policy('RFN', ['2026-11-08 10:00:00', 289.05], ['2026-11-11 10:00:00', 289.05]), mappedRoomId: 1 }),
          // Listed out of order, and a 0 fee is still free
          offer('unordered', 300, { ...policy('RFN', ['2026-11-10 20:00:00', 320], ['2026-11-01 08:00:00', 0], ['2026-11-02 20:00:00', 160]), mappedRoomId: 2 }),
          offer('no-fee', 300, { ...policy('RFN'), mappedRoomId: 3 }),
          offer('nrfn', 250, { ...policy('NRFN'), mappedRoomId: 4 }),
          offer('month-start', 300, { ...policy('RFN', ['2026-12-01 05:00:00', 100]), mappedRoomId: 5 })
        ),
      ],
    }
    const r = parseRatesResponse(body, 3).get('lp1')

    assert.deepEqual([r.byRoom['1'].refundable, r.byRoom['1'].cancelBy], [true, '2026-11-07'])
    assert.equal(r.byRoom['2'].cancelBy, '2026-11-01')
    assert.deepEqual([r.byRoom['3'].refundable, r.byRoom['3'].cancelBy], [true, null])
    assert.deepEqual([r.byRoom['4'].refundable, r.byRoom['4'].cancelBy], [false, null])
    assert.equal(r.byRoom['5'].cancelBy, '2026-11-30')
  })

  test('with a party, rates quoted for another party are dropped', () => {
    const party = { adults: 2, children: [8, 8] }
    const quoted = (adultCount, childCount) => ({ maxOccupancy: 4, adultCount, childCount, childrenAges: [8, 8] })
    const body = {
      data: [
        hotel('lp1', offer('match', 200, { ...quoted(2, 2), mappedRoomId: 1 }), offer('as-adults', 150, { ...quoted(4, 0), mappedRoomId: 2 })),
        hotel('lp2', offer('fewer-children', 180, quoted(2, 1))),
        // Without the echo fields there's nothing to check against
        hotel('lp3', offer('plain', 170)),
      ],
    }
    const map = parseRatesResponse(body, 1, party)

    assert.deepEqual(Object.keys(map.get('lp1').byRoom), ['1'])
    assert.equal(map.get('lp1').cheapest.offerId, 'match')
    assert.equal(map.has('lp2'), false)
    assert.equal(map.get('lp3').cheapest.offerId, 'plain')
    // Without a party nothing is checked
    assert.equal(parseRatesResponse(body, 1).get('lp1').cheapest.offerId, 'as-adults')
  })

  test('keeps the cheapest quote per room, per name and overall', () => {
    const body = {
      data: [
        hotel(
          'lp1',
          offer('king-dear', 200, { mappedRoomId: 1 }),
          offer('king-cheap', 150, { mappedRoomId: 1, boardType: 'BB', cancellationPolicies: { refundableTag: 'RFN' } }),
          offer('twin', 120, { mappedRoomId: 2, name: 'Twin Room' }),
          offer('twin-dear', 180, { mappedRoomId: 2, name: 'Twin Room' })
        ),
      ],
    }
    const r = parseRatesResponse(body, 2).get('lp1')

    assert.deepEqual(r.byRoom['1'], {
      total: 150,
      perNight: 75,
      offerId: 'king-cheap',
      rateName: 'Standard King Room',
      boardType: 'BB',
      refundable: true,
      cancelBy: null,
      dueAtProperty: 0,
    })
    assert.equal(r.byRoom['2'].offerId, 'twin')
    assert.equal(r.byName.standardkingroom.offerId, 'king-cheap')
    assert.equal(r.byName.twinroom.offerId, 'twin')
    assert.equal(r.cheapest.offerId, 'twin')
    assert.equal(r.byRoom['2'].refundable, false)
  })

  test('dueAtProperty sums only USD fees that are not included in the total', () => {
    const fees = [
      { included: false, amount: 43.61, currency: 'USD', description: 'Facility Fee' },
      { included: true, amount: 12.5, currency: 'USD', description: 'Tax' },
      { included: false, amount: 5, currency: 'EUR', description: 'City tax' },
      { included: false, amount: 1.39, currency: 'USD', description: 'Resort fee' },
    ]
    const body = { data: [hotel('lp1', offer('o1', 163.66, { retailRate: { total: usd(163.66), taxesAndFees: fees } }))] }
    const q = parseRatesResponse(body, 3).get('lp1').cheapest

    assert.equal(q.total, 163.66)
    assert.equal(q.dueAtProperty, 45)
  })

  test('an offer with several rates is priced as their sum', () => {
    const body = { data: [hotel('lp1', { offerId: 'two', rates: [rate(100.1), rate(50.2)] })] }
    assert.equal(parseRatesResponse(body, 1).get('lp1').cheapest.total, 150.3)
  })

  test('unmapped hotels key only by name', () => {
    const r = parseRatesResponse({ data: [hotel('lp1', offer('o1', 99))] }, 1).get('lp1')
    assert.equal(r.mapped, false)
    assert.deepEqual(r.byRoom, {})
    assert.deepEqual(Object.keys(r.byName), ['standardkingroom'])
  })
})

describe('quoteForRoom', () => {
  const mapped = parseRatesResponse({ data: [hotel('lp1', offer('king', 300, { mappedRoomId: 2617267 }))] }, 3).get('lp1')
  const unmapped = parseRatesResponse({ data: [hotel('lp1', offer('king', 300))] }, 3).get('lp1')

  test('a mapped room with an offer is live', () => {
    const q = quoteForRoom(mapped, { liteapiRoomId: '2617267', name: 'Anything' })
    assert.equal(q.status, 'live')
    assert.equal(q.value.offerId, 'king')
  })

  test('a mapped hotel without an offer for the room is sold out', () => {
    assert.deepEqual(quoteForRoom(mapped, { liteapiRoomId: '42', name: 'Standard King Room' }), { status: 'sold_out' })
    assert.deepEqual(quoteForRoom(mapped, { liteapiRoomId: null, name: 'Standard King Room' }), { status: 'sold_out' })
  })

  test('an unmapped hotel matches on the normalized room name', () => {
    const q = quoteForRoom(unmapped, { liteapiRoomId: '42', name: '  standard-king ROOM ' })
    assert.equal(q.status, 'live')
    assert.equal(q.value.offerId, 'king')
  })

  test('an unmapped hotel with no name match falls back to the stored price', () => {
    assert.deepEqual(quoteForRoom(unmapped, { liteapiRoomId: '42', name: 'Deluxe Suite' }), { status: 'unavailable' })
    assert.deepEqual(quoteForRoom(unmapped, { liteapiRoomId: null, name: '' }), { status: 'unavailable' })
    assert.deepEqual(quoteForRoom(unmapped, { liteapiRoomId: null, name: 'constructor' }), { status: 'unavailable' })
  })
})

describe('sold out', () => {
  test('HTTP 204 marks every requested id sold out', async () => {
    fetchMock.mock.mockImplementation(async () => new Response(null, { status: 204 }))
    const rooms = await getRoomRates(['lp1', 'lp2'], Q)
    assert.deepEqual([...rooms.values()], [{ status: 'sold_out' }, { status: 'sold_out' }])

    __clearLiteApiCache()
    const from = await getFromPrices(['lp1'], Q)
    assert.deepEqual(from.get('lp1'), { status: 'sold_out' })
  })

  test('error 2001 in the body is sold out', async () => {
    fetchMock.mock.mockImplementation(async () => json({ error: { code: 2001, message: 'no availability found' } }))
    const rooms = await getRoomRates(['lp1'], Q)
    assert.deepEqual(rooms.get('lp1'), { status: 'sold_out' })
    assert.equal(warn.mock.callCount(), 0)
  })

  test('a hotel missing from data is sold out', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 100)), hotel('lp3')))
    const rooms = await getRoomRates(['lp1', 'lp2', 'lp3'], Q)
    assert.equal(rooms.get('lp1').status, 'live')
    assert.deepEqual(rooms.get('lp2'), { status: 'sold_out' })
    assert.deepEqual(rooms.get('lp3'), { status: 'sold_out' })
  })

  test('a hotel whose offers have no usable price keeps its stored price', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 0, { retailRate: { total: null } }))))
    const rooms = await getRoomRates(['lp1'], Q)
    assert.deepEqual(rooms.get('lp1'), { status: 'unavailable' })
  })

  test('a hotel that only quoted another party keeps its stored price', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 300, { adultCount: 4, childCount: 0 }))))
    const rooms = await getRoomRates(['lp1'], { ...Q, children: [8, 8] })
    assert.deepEqual(rooms.get('lp1'), { status: 'unavailable' })
  })

  test('liveRoomPrice is sold out when a mapped hotel has no offer for the room', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 300, { mappedRoomId: 1 }))))
    const q = await liveRoomPrice({ liteapiHotelId: 'lp1', liteapiRoomId: '2', roomType: 'Standard King Room' }, Q)
    assert.deepEqual(q, { status: 'sold_out' })
  })
})

describe('unavailable', () => {
  for (const [label, impl] of [
    ['a 500', async () => new Response('oops', { status: 500 })],
    ['a 401', async () => json({ error: { code: 401, message: 'Unauthorized' } }, 401)],
    ['a thrown fetch', async () => { throw new TypeError('fetch failed') }],
    ['an abort', async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError') }],
    ['a 200 without data', async () => json({ sandbox: true })],
  ]) {
    test(`${label} gives unavailable and is logged without the key`, async () => {
      fetchMock.mock.mockImplementation(impl)
      const rooms = await getRoomRates(['lp1', 'lp2'], Q)
      assert.deepEqual([...rooms.values()], [{ status: 'unavailable' }, { status: 'unavailable' }])

      assert.equal(warn.mock.callCount(), 1)
      const args = warn.mock.calls[0].arguments
      assert.equal(args[0], '[liteapi] rates failed')
      assert.ok(!JSON.stringify(args).includes('test'))
    })
  }

  test('the 401 log carries the status and error code', async () => {
    fetchMock.mock.mockImplementation(async () => json({ error: { code: 401, message: 'Unauthorized' } }, 401))
    await getRoomRates(['lp1'], Q)
    assert.deepEqual(warn.mock.calls[0].arguments, ['[liteapi] rates failed', 401, 401])
  })

  test('no key gives unavailable without calling fetch', async () => {
    delete process.env.LITEAPI_KEY
    const rooms = await getRoomRates(['lp1'], Q)
    const from = await getFromPrices(['lp1'], Q)
    const one = await liveRoomPrice({ liteapiHotelId: 'lp1', liteapiRoomId: '1', roomType: 'King' }, Q)

    assert.deepEqual(rooms.get('lp1'), { status: 'unavailable' })
    assert.deepEqual(from.get('lp1'), { status: 'unavailable' })
    assert.deepEqual(one, { status: 'unavailable' })
    assert.equal(fetchMock.mock.callCount(), 0)
  })

  test('stays of 0 or more than 30 nights give unavailable without calling fetch', async () => {
    for (const checkOut of [IN, '2026-12-11', 'not-a-date']) {
      const rooms = await getRoomRates(['lp1'], { ...Q, checkOut })
      assert.deepEqual(rooms.get('lp1'), { status: 'unavailable' }, checkOut)
    }
    const thirty = '2026-12-10'
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 3000))))
    const ok = await getRoomRates(['lp1'], { ...Q, checkOut: thirty })
    assert.equal(ok.get('lp1').status, 'live')
    assert.equal(ok.get('lp1').value.cheapest.perNight, 100)
    assert.equal(fetchMock.mock.callCount(), 1)
  })

  test('no adult, or a child without a whole age from 0 to 17, gives unavailable without calling fetch', async () => {
    for (const party of [
      { adults: 0, children: [] },
      { adults: 1.5, children: [] },
      { adults: 0, children: [8] },
      { adults: 2, children: [-1] },
      { adults: 2, children: [18] },
      { adults: 2, children: [8.5] },
      { adults: 2, children: ['8'] },
      { adults: 2 },
    ]) {
      const rooms = await getRoomRates(['lp1'], { checkIn: IN, checkOut: OUT, ...party })
      assert.deepEqual(rooms.get('lp1'), { status: 'unavailable' }, JSON.stringify(party))
    }
    assert.equal(fetchMock.mock.callCount(), 0)

    await getRoomRates(['lp1'], { ...Q, children: [0, 17] })
    assert.equal(fetchMock.mock.callCount(), 1)
  })

  test('a check-in more than 365 days ahead gives unavailable without calling fetch', async () => {
    mock.timers.enable({ apis: ['Date'], now: Date.now() })
    const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
    const far = await getRoomRates(['lp1'], { ...Q, checkIn: day(366), checkOut: day(367) })
    assert.deepEqual(far.get('lp1'), { status: 'unavailable' })
    assert.equal(fetchMock.mock.callCount(), 0)

    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 100))))
    const lastDay = await getRoomRates(['lp1'], { ...Q, checkIn: day(365), checkOut: day(366) })
    assert.equal(lastDay.get('lp1').status, 'live')
    assert.equal(fetchMock.mock.callCount(), 1)
  })
})

describe('live results', () => {
  test('getFromPrices returns the cheapest quote per hotel', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('a', 300), offer('b', 240, { name: 'Twin' }))))
    const from = await getFromPrices(['lp1'], Q)
    assert.equal(from.get('lp1').status, 'live')
    assert.equal(from.get('lp1').value.offerId, 'b')
    assert.equal(from.get('lp1').value.perNight, 80)
  })

  test('liveRoomPrice quotes the mapped room, or matches an unmapped hotel by room type', async () => {
    fetchMock.mock.mockImplementation(async () =>
      priced(hotel('lp1', offer('king', 163.66, { mappedRoomId: 2617267 })), hotel('lp2', offer('plain', 90)))
    )
    const mapped = await liveRoomPrice({ liteapiHotelId: 'lp1', liteapiRoomId: '2617267', roomType: 'Whatever' }, Q)
    assert.equal(mapped.status, 'live')
    assert.equal(mapped.value.total, 163.66)
    assert.equal(calculateTotalPrice(IN, OUT, mapped.value.perNight), 163.66)

    const byName = await liveRoomPrice({ liteapiHotelId: 'lp2', liteapiRoomId: null, roomType: 'Standard King Room' }, Q)
    assert.equal(byName.status, 'live')
    assert.equal(byName.value.offerId, 'plain')
  })
})

describe('cache', () => {
  test('the same query twice fetches once', async () => {
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 100))))
    const a = await getRoomRates(['lp1'], Q)
    const b = await getRoomRates(['lp1'], Q)
    assert.equal(fetchMock.mock.callCount(), 1)
    assert.deepEqual(a, b)

    await liveRoomPrice({ liteapiHotelId: 'lp1', liteapiRoomId: null, roomType: 'Standard King Room' }, Q)
    assert.equal(fetchMock.mock.callCount(), 1)
  })

  test('concurrent callers share one request', async () => {
    let release
    fetchMock.mock.mockImplementation(() => new Promise((resolve) => { release = () => resolve(priced(hotel('lp1', offer('o1', 100)))) }))
    const both = Promise.all([getRoomRates(['lp1'], Q), getRoomRates(['lp1'], Q)])
    release()
    const [a, b] = await both
    assert.equal(fetchMock.mock.callCount(), 1)
    assert.equal(a.get('lp1').status, 'live')
    assert.equal(b.get('lp1').status, 'live')
  })

  test('a superset of ids fetches only the missing ones', async () => {
    fetchMock.mock.mockImplementation(async (_url, init) =>
      priced(...JSON.parse(init.body).hotelIds.map((id) => hotel(id, offer(`o-${id}`, 100))))
    )
    await getFromPrices(['lp1', 'lp2'], Q)
    const all = await getFromPrices(['lp1', 'lp2', 'lp3', 'lp4'], Q)

    assert.equal(fetchMock.mock.callCount(), 2)
    assert.deepEqual(sentBody(1).hotelIds, ['lp3', 'lp4'])
    assert.equal(sentBody(1).limit, 2)
    assert.deepEqual([...all.keys()], ['lp1', 'lp2', 'lp3', 'lp4'])
    assert.ok([...all.values()].every((r) => r.status === 'live'))
  })

  test('different adults, children, ages, dates or mode fetch again', async () => {
    await getRoomRates(['lp1'], Q)
    await getRoomRates(['lp1'], { ...Q, adults: 3 })
    // Same head count as 3 adults, but a different party and price
    await getRoomRates(['lp1'], { ...Q, children: [8] })
    await getRoomRates(['lp1'], { ...Q, children: [3] })
    await getRoomRates(['lp1'], { ...Q, checkOut: '2026-11-14' })
    await getFromPrices(['lp1'], Q)
    assert.equal(fetchMock.mock.callCount(), 6)
  })

  test('the same children in another order share a quote', async () => {
    await getRoomRates(['lp1'], { ...Q, children: [12, 3] })
    await getRoomRates(['lp1'], { ...Q, children: [3, 12] })
    assert.equal(fetchMock.mock.callCount(), 1)
    assert.ok(globalThis.__likehomeLiteApi.has(`rooms|lp1|${IN}|${OUT}|2|3,12`))
  })

  test('live and sold-out results expire after 15 minutes', async () => {
    mock.timers.enable({ apis: ['Date'], now: Date.now() })
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 100))))
    await getRoomRates(['lp1', 'lp2'], Q)

    mock.timers.tick(15 * 60_000 - 1)
    await getRoomRates(['lp1', 'lp2'], Q)
    assert.equal(fetchMock.mock.callCount(), 1)

    mock.timers.tick(1)
    const again = await getRoomRates(['lp1', 'lp2'], Q)
    assert.equal(fetchMock.mock.callCount(), 2)
    assert.deepEqual(sentBody(1).hotelIds, ['lp1', 'lp2'])
    assert.equal(again.get('lp1').status, 'live')
    assert.deepEqual(again.get('lp2'), { status: 'sold_out' })
  })

  test('unavailable is retried after 60 seconds', async () => {
    mock.timers.enable({ apis: ['Date'], now: Date.now() })
    fetchMock.mock.mockImplementation(async () => new Response('down', { status: 503 }))
    await getRoomRates(['lp1'], Q)

    mock.timers.tick(59_999)
    assert.deepEqual((await getRoomRates(['lp1'], Q)).get('lp1'), { status: 'unavailable' })
    assert.equal(fetchMock.mock.callCount(), 1)

    mock.timers.tick(1)
    fetchMock.mock.mockImplementation(async () => priced(hotel('lp1', offer('o1', 100))))
    const back = await getRoomRates(['lp1'], Q)
    assert.equal(fetchMock.mock.callCount(), 2)
    assert.equal(back.get('lp1').status, 'live')
  })

  test('expired entries are pruned once the cache passes 2000 keys', async () => {
    mock.timers.enable({ apis: ['Date'], now: Date.now() })
    const ids = Array.from({ length: 2001 }, (_, i) => `lp${i}`)
    await getFromPrices(ids, Q)
    assert.equal(fetchMock.mock.callCount(), 11)

    assert.equal(globalThis.__likehomeLiteApi.size, 2001)

    mock.timers.tick(15 * 60_000)
    await getRoomRates(['fresh'], Q)
    assert.deepEqual([...globalThis.__likehomeLiteApi.keys()], [`rooms|fresh|${IN}|${OUT}|2|`])
  })

  test('past 2000 keys with nothing expired, the earliest keys are dropped', async () => {
    const ids = Array.from({ length: 2001 }, (_, i) => `lp${i}`)
    await getFromPrices(ids, Q)
    await getRoomRates(['fresh'], Q)

    const keys = [...globalThis.__likehomeLiteApi.keys()]
    assert.equal(keys.length, 2001)
    assert.ok(!keys.includes(`from|lp0|${IN}|${OUT}|2|`))
    assert.equal(keys[0], `from|lp1|${IN}|${OUT}|2|`)
    assert.equal(keys.at(-1), `rooms|fresh|${IN}|${OUT}|2|`)
  })
})
