import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  autoSince, bedSizeFor, capacityFor, hotelListQuery, hotelRowFor, hotelSql, hotelTagsFor, isAdultsOnly, numBedsFor, parseSince, planSync,
  removedAt, rfc3339, roomRowsFor, roomTagsFor, sameCity, samplePricesFor, savedTarget, stripHtml, typicalPrices, unmappedFacilities,
} from '../lib/liteapi/import-mapping.ts'
import { tags as filterTags } from '../app/search/types.ts'

const SF = { countryCode: 'US', cityName: 'San Francisco', city: 'San Francisco', region: 'California', country: 'USA' }

const usd = (amount) => ({ amount, currency: 'USD' })
const offer = (amount, more = {}, rate = {}) => ({
  offerId: `o-${amount}-${rate.mappedRoomId ?? ''}`,
  rates: [{ rateId: 'r', name: 'Standard King Room', boardType: 'RO', retailRate: { total: [usd(amount)] }, ...rate }],
  ...more,
})
const room = (id, more = {}) => ({ id, roomName: `Room ${id}`, maxOccupancy: 2, bedTypes: [{ quantity: 1, bedType: 'Queen bed' }], ...more })
const amenities = (...ids) => ids.map((amenitiesId) => ({ amenitiesId, name: `amenity ${amenitiesId}` }))
const detail = (more = {}) => ({ id: 'lp1', name: 'Detail Name', rooms: [room(1)], ...more })
const summary = (more = {}) => ({ id: 'lp1', name: 'Summary Name', country: 'us', city: 'San Francisco', latitude: 37.78, longitude: -122.41, ...more })

test('bedSizeFor maps the bed type id first, then the width band, then the bed type', () => {
  const size = (bedSize, bedType = 'Bed', id) => bedSizeFor([{ id, quantity: 1, bedType, bedSize }])
  assert.equal(size('151-180 cm wide', 'King bed', 10), 'King', 'a King bed in the Queen width band')
  assert.equal(size('151-180 cm wide', 'Queen bed', 167), 'Queen')
  assert.equal(size('151-180 cm wide', 'Large bed', 100), 'Queen')
  assert.equal(size(undefined, undefined, 10), 'King', 'the id alone')
  assert.equal(size(undefined, 'Bed', 167), 'Queen')
  assert.equal(size(undefined, 'Large bed', 100), 'Queen')
  assert.equal(size('181-210 cm wide', 'Extra-large double bed (Super-king size)', 39), 'King', 'other ids go by width')
  assert.equal(size('151-180 cm wide', 'Large bed', 999), 'Queen')
  assert.equal(size('90-130 cm wide'), 'Twin')
  assert.equal(size('131-150 cm wide'), 'Double')
  assert.equal(size('151-180cm wide'), 'Queen')
  assert.equal(size('181-210 cm wide'), 'King')
  assert.equal(size('151-180cm wide', 'Twin XL bed'), 'Queen', 'width wins over the name')
  assert.equal(size(undefined, 'Twin XL'), 'Twin XL')
  assert.equal(size(undefined, 'Queen bed'), 'Queen')
  assert.equal(size(undefined, 'Super-king bed'), 'King')
  assert.equal(size(undefined, 'Full bed'), 'Double')
  assert.equal(size(undefined, 'Bunk bed'), 'Twin')
  assert.equal(size(undefined, 'Futon'), null)
  assert.equal(size('', 'Mystery sleeper'), null)
  assert.equal(bedSizeFor([]), null)
})

test('bedSizeFor takes the largest bed and ignores sofa beds unless they are all there is', () => {
  assert.equal(bedSizeFor([{ quantity: 2, bedType: 'Single bed' }, { quantity: 1, bedType: 'King bed' }]), 'King')
  assert.equal(bedSizeFor([
    { id: 167, quantity: 1, bedType: 'Queen bed', bedSize: '151-180 cm wide' },
    { id: 10, quantity: 1, bedType: 'King bed', bedSize: '151-180 cm wide' },
  ]), 'King')
  assert.equal(bedSizeFor([{ quantity: 1, bedType: 'Twin bed' }, { quantity: 1, bedType: 'Double sofa bed' }]), 'Twin')
  assert.equal(bedSizeFor([{ quantity: 1, bedType: 'Double sofa bed' }]), 'Double')
})

test('num_beds sums AND layouts, takes the first OR / COMPLEX layout, and is at least 1', () => {
  const beds = [{ quantity: 2, bedType: 'Twin bed' }, { quantity: 1, bedType: 'King bed' }]
  assert.equal(numBedsFor(room(1, { bedTypes: beds, bedRelation: 'AND' })), 3)
  assert.equal(numBedsFor(room(1, { bedTypes: beds })), 3)
  assert.equal(numBedsFor(room(1, { bedTypes: beds, bedRelation: 'OR' })), 2)
  assert.equal(numBedsFor(room(1, { bedTypes: beds, bedRelation: 'COMPLEX' })), 2)
  assert.equal(numBedsFor(room(1, { bedTypes: [] })), 1)
  assert.equal(numBedsFor(room(1, { bedTypes: undefined })), 1)
  assert.equal(numBedsFor(room(1, { bedTypes: [{ quantity: 0, bedType: 'Bed' }] })), 1)
})

test('capacity falls back from maxOccupancy to adults + children, then to 2', () => {
  assert.equal(capacityFor({ id: 1, roomName: 'r', maxOccupancy: 5, maxAdults: 2 }), 5)
  assert.equal(capacityFor({ id: 1, roomName: 'r', maxAdults: 2, maxChildren: 1 }), 3)
  assert.equal(capacityFor({ id: 1, roomName: 'r', maxAdults: 3 }), 3)
  assert.equal(capacityFor({ id: 1, roomName: 'r' }), 2)
  assert.equal(capacityFor({ id: 1, roomName: 'r', maxOccupancy: 0 }), 2)
})

test('stripHtml turns markup into plain text', () => {
  assert.equal(
    stripHtml('<p><strong>Location.</strong> Near&nbsp;the bay</p><p>Tom&#39;s &quot;pick&quot; &amp; more<br/>1 &lt; 2 &gt; 0</p>'),
    'Location. Near the bay Tom\'s "pick" & more 1 < 2 > 0',
  )
  assert.equal(stripHtml('A &amp;lt; B'), 'A &lt; B')
  assert.equal(stripHtml('  \n '), '')
})

test('room tags come from room amenity ids and are never null', () => {
  assert.deepEqual(roomTagsFor(room(1, { roomAmenities: amenities(118, 77, 186, 378, 272, 382, 999) })),
    ['Pool', 'ADA Compliant', 'Kitchen', 'Free Wi-Fi', 'Housekeeping', 'Washer & Dryer'].sort((a, b) => filterTags.indexOf(a) - filterTags.indexOf(b)))
  assert.deepEqual(roomTagsFor(room(1)), [])
  assert.deepEqual(roomTagsFor(room(1, { roomAmenities: amenities(158, 194, 193) })), [], 'paid wifi, laundry service and detergent alone')
})

test('hotel and room tags only ever use the 17 filter strings', () => {
  const everything = detail({
    parking: true,
    petsAllowed: true,
    facilities: [
      'Free WiFi', 'Parking garage', 'Gift shop', 'Laundry facilities', 'Housekeeping', 'Pets allowed', 'Spa', 'Restaurant',
    ].map((name, i) => ({ facilityId: i, name })).concat(
      { facilityId: 182, name: 'Electric vehicle charging station' }, { facilityId: 104, name: 'Outdoor pool' }, { facilityId: 11, name: 'Fitness center' },
      { facilityId: 56, name: 'Kids club' }, { facilityId: 28, name: 'Family rooms' },
    ),
    hotelFacilities: ['Free Parking', 'Bar'],
    rooms: [room(1, { maxOccupancy: 6, roomAmenities: amenities(...Array.from({ length: 400 }, (_, i) => i)) })],
  })
  const hotelTags = hotelTagsFor(everything, [offer(100, {}, { boardType: 'BI' })])
  assert.ok(hotelTags.length > 0)
  for (const tag of [...hotelTags, ...roomTagsFor(everything.rooms[0])]) assert.ok(filterTags.includes(tag), tag)
  assert.ok(!hotelTags.includes('ADA Compliant'), 'never hotel-wide')
  assert.equal(new Set(hotelTags).size, hotelTags.length)
})

test('facility names map to hotel tags, with the known false friends left out', () => {
  const tagsFor = (...names) => hotelTagsFor(detail({ facilities: names.map((name, i) => ({ facilityId: i, name })) }), [])
  assert.deepEqual(tagsFor('No parking'), [])
  assert.deepEqual(tagsFor('Laundry service', 'Ironing service'), [])
  assert.deepEqual(tagsFor('Self-service laundry'), ['Washer & Dryer'])
  assert.deepEqual(tagsFor('WiFi'), [], 'not known to be free')
  assert.deepEqual(tagsFor('Free Wi-Fi in all areas'), ['Free Wi-Fi'])
  assert.deepEqual(tagsFor('No pets allowed'), [])
  assert.deepEqual(tagsFor('Family rooms', 'Kids club', 'Babysitting/child services'), [], 'Kids and Families go by facility id')
  assert.deepEqual(tagsFor('Swimming pool', 'Fitness center', 'Electric vehicle charging station'), [], 'so do Pool, Gym and EV Charging')
  assert.deepEqual(hotelTagsFor(detail({ hotelFacilities: ['Gift shop', 'Fitness center'] }), []), ['Gift Shops'])
})

test('EV Charging, Pool and Gym come from facility ids, leaving out nearby pools and gyms and pool extras', () => {
  const tagsFor = (...facilities) => hotelTagsFor(detail({ facilities: facilities.map(([facilityId, name]) => ({ facilityId, name })) }), [])
  for (const id of [182, 765, 2014]) assert.deepEqual(tagsFor([id, `facility ${id}`]), ['EV Charging'], `facility ${id}`)
  // Includes 941 "Wheelchair-accessible pool", 194 "Pool with view" and the "Number of outdoor pools - 1" kind
  for (const id of [103, 104, 120, 122, 192, 193, 194, 195, 196, 197, 301, 781, 830, 832, 835, 837, 941, 1097, 1253, 8995, 9020, 11199, 11469]) {
    assert.deepEqual(tagsFor([id, `facility ${id}`]), ['Pool'], `facility ${id}`)
  }
  // Includes the surcharge ones (757, 6848) and health clubs (530, 749, 2066)
  for (const id of [11, 492, 530, 723, 749, 757, 942, 1725, 2066, 6848]) assert.deepEqual(tagsFor([id, `facility ${id}`]), ['Gym'], `facility ${id}`)
  assert.deepEqual(tagsFor([182]), ['EV Charging'], 'a facility with no name still counts')

  assert.deepEqual(tagsFor([967, 'Electric bicycle charging station'], [2413, 'Electric bicycle charging station']), [])
  assert.deepEqual(tagsFor(
    [169, 'Swimming pool toys'], [199, 'Pool bar'], [579, 'Billiards or pool table'],
    [630, 'Access to nearby indoor pool'], [631, 'Access to nearby outdoor pool'], [916, 'Swimming nearby'],
  ), [])
  assert.deepEqual(tagsFor([258, "Kids' pool"]), ['Families', 'Kids'], 'a wading pool is not Pool')
  assert.deepEqual(tagsFor(
    [537, 'Free use of nearby fitness center'], [569, 'Use of nearby fitness center (discount)'],
    [255, 'Fitness classes'], [256, 'Personal trainer'], [257, 'Fitness/spa locker rooms'],
  ), [])
})

test('Kids and Families come from facility ids, whatever the name', () => {
  const tagsFor = (...facilities) => hotelTagsFor(detail({ facilities: facilities.map(([facilityId, name]) => ({ facilityId, name })) }), [])
  assert.deepEqual(tagsFor([28, 'Family rooms']), ['Families'])
  assert.deepEqual(tagsFor([28, 'Chambres familiales']), ['Families'])
  // Includes water park (148, 696, 697), baby safety gates (174) and strollers (214)
  for (const id of [21, 56, 144, 148, 172, 173, 174, 176, 177, 214, 258, 495, 570, 652, 696, 697, 737, 770, 890, 891]) {
    assert.deepEqual(tagsFor([id, `facility ${id}`]), ['Families', 'Kids'], `facility ${id}`)
  }
  assert.deepEqual(tagsFor([28, '']), ['Families'], 'a facility with no name still counts')
  assert.deepEqual(tagsFor([214]), ['Families', 'Kids'], 'or with no name at all')
  assert.deepEqual(hotelTagsFor(detail({ hotelFacilities: ['Family rooms', 'Kid meals'] }), []), [], 'a name with no facilities entry has no id')
})

test('adults-only needs facility 149 and rooms that take no children', () => {
  const adultRoom = room(1, { maxAdults: 2, maxChildren: 0, roomAmenities: amenities(168, 74) })
  const hotel = (...rooms) => detail({
    facilities: [{ facilityId: 149, name: 'Adult only' }, { facilityId: 28, name: 'Family rooms' }, { facilityId: 21, name: 'Babysitting/child services' }],
    rooms,
  })

  const adultsOnly = hotel(adultRoom, room(2, { maxAdults: 0, maxChildren: 0 }), room(3))
  assert.equal(isAdultsOnly(adultsOnly), true, 'rooms with no adult limit are unknown and ignored')
  assert.deepEqual(hotelTagsFor(adultsOnly, []), ['Couples'], 'never for kids, families or cribs')

  const takesChildren = hotel(adultRoom, room(2, { maxAdults: 2, maxChildren: 2 }))
  assert.equal(isAdultsOnly(takesChildren), false, '149 can mean an adults-only area')
  assert.deepEqual(hotelTagsFor(takesChildren, []), ['Cribs', 'Families', 'Kids'])

  assert.equal(isAdultsOnly(detail({ facilities: [{ facilityId: 149 }], rooms: [adultRoom] })), true, '149 with no name')
  assert.equal(isAdultsOnly(hotel(room(1, { maxAdults: 0, maxChildren: 0 }), room(2))), false, 'no room with known limits')
  assert.equal(isAdultsOnly(detail({ facilities: [{ facilityId: 1, name: 'Adults only' }], rooms: [adultRoom] })), false, 'the name alone')
  assert.equal(isAdultsOnly(detail({ rooms: [adultRoom] })), false, 'rooms alone')
})

test('"Pets allowed" still gives Pets when petsAllowed is false', () => {
  assert.ok(hotelTagsFor(detail({ petsAllowed: false, facilities: [{ facilityId: 4, name: 'Pets allowed' }] }), []).includes('Pets'))
  assert.ok(hotelTagsFor(detail({ petsAllowed: true }), []).includes('Pets'))
  assert.ok(hotelTagsFor(detail({ rooms: [room(1, { roomAmenities: amenities(250) })] }), []).includes('Pets'))
  assert.ok(!hotelTagsFor(detail({ petsAllowed: false }), []).includes('Pets'))
})

test('a pets policy that says no removes Pets unless a room allows pets; allowing pets or service animals does not', () => {
  const policies = (...descriptions) => descriptions.map((description) => ({ policy_type: 'POLICY_HOTEL_PETS', name: 'Pets', description }))
  const pets = (...descriptions) => hotelTagsFor(detail({ facilities: [{ facilityId: 4, name: 'Pets allowed' }], policies: policies(...descriptions) }), []).includes('Pets')
  assert.ok(!pets('Pets are not allowed.\n'))
  assert.ok(!pets('Pets not allowed', 'Service animals are exempt from fees/restrictions', 'Service animals are allowed'))
  for (const description of [
    'No pets', 'We do not allow pets.', "Pets aren't allowed.", 'Pets are not permitted.', 'No pets or service animals allowed.',
    'No pets allowed, except service animals', 'Pets are not allowed, service animals are welcome.',
    'Only service animals are allowed.', 'We do not allow animals, only service animals are allowed.', 'Please note that only service animals are allowed.',
  ]) assert.ok(!pets(description), description)
  assert.ok(pets('Pets are allowed. Charges may be applicable.\n'))
  assert.ok(pets('Pets are allowed on request. A maximum of 2 pets under 25 lbs, for a fee.'))
  assert.ok(pets('Service animals are allowed'))
  assert.ok(pets('Pets are not allowed in the pool area.'), 'whole sentences only')
  assert.ok(pets('Pets are allowed. No pets allowed over 25 lbs.'))
  assert.ok(pets('Pets allowed on request. Pets not allowed in suites.'))
  assert.ok(pets(undefined))
  assert.ok(pets())
  assert.ok(!hotelTagsFor(detail({ petsAllowed: true, policies: policies('Pets are not allowed.') }), []).includes('Pets'), 'the policy beats petsAllowed')
  const petRooms = detail({ rooms: [room(1, { roomAmenities: amenities(250) })], policies: policies('Pets are not allowed.\n') })
  assert.ok(hotelTagsFor(petRooms, []).includes('Pets'), 'a room that allows pets beats the policy')
  const general = detail({ petsAllowed: true, policies: [{ policy_type: 'POLICY_GENERAL', name: 'General', description: 'Pets are not allowed.' }] })
  assert.ok(hotelTagsFor(general, []).includes('Pets'), 'only pets policies count')
})

test('parking PAID and FREE add Parking, NOT_AVAILABLE removes it, anything else changes nothing', () => {
  const parking = (value, ...names) => hotelTagsFor(detail({ parking: value, facilities: names.map((name, i) => ({ facilityId: i, name })) }), []).includes('Parking')
  assert.ok(parking('PAID'))
  assert.ok(parking('FREE'))
  assert.ok(parking(true))
  assert.ok(!parking('NOT_AVAILABLE', 'Parking garage'), 'even with a parking facility')
  for (const value of ['', null, undefined, false]) {
    assert.ok(parking(value, 'Parking garage'), String(value))
    assert.ok(!parking(value), String(value))
  }
})

test('room amenities give hotel-wide pool, gym, cribs, kids and families, even from a room type not imported', () => {
  const tagsFor = (...ids) => {
    const d = detail({ rooms: [room(1), room(2, { roomAmenities: amenities(...ids) })] })
    return hotelTagsFor(d, [], [d.rooms[0]])
  }
  assert.deepEqual(tagsFor(155), ['Pool'])
  assert.deepEqual(tagsFor(123), ['Gym'])
  assert.deepEqual(tagsFor(168), ['Families', 'Kids'])
  assert.deepEqual(tagsFor(72, 176), [], 'connecting rooms: one room per booking')
  assert.deepEqual(tagsFor(73), [], 'cots: a baby bed in the UK, a camp bed in the US')
  for (const id of [74, 121, 362]) assert.deepEqual(tagsFor(id), ['Cribs'], `crib ${id}: its own tag, not Kids`)
  assert.deepEqual(tagsFor(256), [], 'pool view')
})

test('Couples needs adults-only or a private hot tub / pool, never stars or a spa', () => {
  const spa = detail({ starRating: 5, facilities: [{ facilityId: 1, name: 'Spa' }], rooms: [room(1, { roomAmenities: amenities(169, 296, 331) })] })
  assert.ok(!hotelTagsFor(spa, []).includes('Couples'))
  const hotTub = detail({ rooms: [room(1), room(2, { roomAmenities: amenities(160) })] })
  assert.ok(hotelTagsFor(hotTub, []).includes('Couples'))
  assert.ok(!hotelTagsFor(hotTub, [], [hotTub.rooms[0]]).includes('Couples'), 'only rooms being imported count')
  const adultsOnly = detail({ facilities: [{ facilityId: 149, name: 'Adult only' }], rooms: [room(1, { maxAdults: 2, maxChildren: 0 })] })
  assert.ok(hotelTagsFor(adultsOnly, []).includes('Couples'))
})

test('Friends needs one room that sleeps 4 and has a kitchen, living area or extra bathroom', () => {
  const tagsFor = (...rooms) => hotelTagsFor(detail({ rooms }), [])
  assert.ok(tagsFor(room(1, { maxOccupancy: 4, roomAmenities: amenities(183) })).includes('Friends'))
  assert.ok(tagsFor(room(1, { maxOccupancy: 6, roomAmenities: amenities(9) })).includes('Friends'))
  assert.ok(!tagsFor(room(1, { maxOccupancy: 3, roomAmenities: amenities(183) })).includes('Friends'))
  assert.ok(!tagsFor(room(1, { maxOccupancy: 4 }), room(2, { roomAmenities: amenities(183) })).includes('Friends'))
})

test('Free Meals only when every priced sample offer includes meals', () => {
  const meals = (...offers) => hotelTagsFor(detail(), offers).includes('Free Meals')
  assert.ok(meals(offer(100, {}, { boardType: 'BI' }), offer(120, {}, { boardType: 'HB' })))
  assert.ok(!meals(offer(100, {}, { boardType: 'BI' }), offer(90, {}, { boardType: 'RO' })))
  assert.ok(!meals(offer(100, {}, { boardType: '' })))
  assert.ok(!meals())
  const placeholder = { offerId: 'p', rates: [{ rateId: '', boardType: '', retailRate: { total: null } }] }
  assert.ok(meals(offer(100, {}, { boardType: 'AI' }), placeholder), 'unpriced offers do not count')
})

test('samplePricesFor keeps the cheapest priced offer per mapped room and skips the rest', () => {
  const sample = samplePricesFor([
    offer(200, {}, { mappedRoomId: 11 }),
    offer(150, {}, { mappedRoomId: '11' }),
    offer(90, {}, { mappedRoomId: 12, name: 'Twin Room' }),
    // LiteAPI puts mappedRoomId on the rate only; one on the offer is ignored
    offer(80, { mappedRoomId: 13 }, { name: 'Suite' }),
    { rates: [{ retailRate: { total: [usd(10)] } }] },
    offer(5, {}, { retailRate: { total: [{ amount: 5, currency: 'EUR' }] } }),
    offer(0),
  ])
  assert.equal(sample.mapped, true)
  assert.deepEqual([...sample.byRoom], [['11', 150], ['12', 90]])
  assert.equal(sample.cheapest, 80)
  assert.equal(sample.byName.get('twinroom'), 90)
  assert.equal(samplePricesFor([{ offerId: 'p', rates: [{ retailRate: { total: null } }] }]), null)
  assert.equal(samplePricesFor(undefined), null)
  assert.equal(samplePricesFor([{ offerId: 'o', rates: [{ retailRate: { total: usd(240) } }] }], 2).cheapest, 120, 'money as an object')
})

test('the stored price is never below the suggested selling price', () => {
  const ssp = (total, suggested, rate = {}) => offer(total, {}, { retailRate: { total: [usd(total)], suggestedSellingPrice: [{ ...usd(suggested), source: '' }] }, ...rate })
  const sample = samplePricesFor([
    // The sandbox probe: retail 289.05, SSP 332.41
    ssp(289.05, 332.41, { mappedRoomId: 1 }),
    ssp(300, 250, { mappedRoomId: 2 }),
    offer(280, {}, { mappedRoomId: 3 }),
    offer(270, {}, { mappedRoomId: 4, retailRate: { total: [usd(270)], suggestedSellingPrice: [{ amount: 400, currency: 'EUR' }] } }),
    offer(260, {}, { mappedRoomId: 5, retailRate: { total: [usd(260)], suggestedSellingPrice: usd(310) } }),
  ], 2)
  assert.deepEqual([...sample.byRoom], [['1', 332.41 / 2], ['2', 150], ['3', 140], ['4', 135], ['5', 155]])
  // The cheapest is picked on the price stored, so the SSP can reorder offers
  assert.equal(sample.cheapest, 135)
  const raised = samplePricesFor([ssp(200, 320, { name: 'Twin Room' }), offer(300, {}, { name: 'Twin Room' })])
  assert.equal(raised.cheapest, 300)
  assert.equal(raised.byName.get('twinroom'), 300)
  const twoRooms = { offerId: 'two', rates: [ssp(100, 120).rates[0], ssp(100, 90).rates[0]] }
  assert.equal(samplePricesFor([twoRooms]).cheapest, 220, 'each rate is raised on its own')
  const rows = roomRowsFor([room(1)], samplePricesFor([ssp(289.05, 332.41, { mappedRoomId: 1 })]))
  assert.deepEqual(rows.map((r) => r.price_per_night), [332])
})

test('typicalPrices takes each room median over the sampled nights', () => {
  const night = (...offers) => samplePricesFor(offers)
  const week = typicalPrices([
    night(offer(3, {}, { mappedRoomId: 1 }), offer(90, {}, { mappedRoomId: 2 })),
    night(offer(250, {}, { mappedRoomId: 1 }), offer(2203, {}, { mappedRoomId: 2 })),
    night(offer(240, {}, { mappedRoomId: 1 })),
    null,
    night(offer(260, {}, { mappedRoomId: 1 }), offer(110, {}, { mappedRoomId: 2 })),
  ])
  assert.equal(week.mapped, true)
  assert.equal(week.cheapest, 175, 'the median of each night’s cheapest: 3, 110, 240, 250')
  assert.deepEqual([...week.byRoom], [['1', 245], ['2', 175]], 'a $3 or $2,203 night does not set the price, and no room is below 175')
  assert.equal(typicalPrices([night(offer(120, {}, { name: 'Twin Room' }))]).byName.get('twinroom'), 120)
  assert.equal(typicalPrices([null, null]), null)
  assert.equal(typicalPrices([]), null)
})

test('typicalPrices holds a room offered on one junk night up to the hotel’s typical cheapest night', () => {
  // Flamingo, Nov 15-21: the Fab Room was offered only on the 17th, at $5.64 with an SSP of $6.48
  const night = (cheapest, more = []) => samplePricesFor([offer(cheapest, {}, { mappedRoomId: 'arrival' }), ...more])
  const fab = offer(5.64, {}, { mappedRoomId: 'fab', retailRate: { total: [usd(5.64)], suggestedSellingPrice: [usd(6.48)] } })
  const week = typicalPrices([night(70.87), night(70.56), night(4.47, [fab]), night(62.39), night(95.02), night(194.01), night(250.66)])
  assert.equal(week.cheapest, 70.87)
  assert.equal(week.byRoom.get('fab'), 70.87)
  assert.equal(week.byRoom.get('arrival'), 70.87)
})

test('hotelRowFor takes the location from the target and stars for the rating', () => {
  const row = hotelRowFor(SF, summary({ stars: 4.5, hotelDescription: '<p>Summary</p>' }), detail({
    hotelDescription: '<p>Great <b>views</b></p><p>Tom&#39;s pick</p>', address: '1 Main St', starRating: 3, rating: 9.1,
  }))
  assert.equal(row.liteapi_id, 'lp1')
  assert.equal(row.name, 'Detail Name')
  assert.equal(row.city, 'San Francisco')
  assert.equal(row.region, 'California')
  assert.equal(row.country, 'USA')
  assert.equal(row.description, "Great views Tom's pick")
  assert.equal(row.address, '1 Main St')
  assert.equal(row.rating, 4.5)
  assert.equal(row.latitude, 37.78)
  assert.equal(row.longitude, -122.41)
  assert.ok(!('owner_id' in row))

  const rating = (stars, starRating) => hotelRowFor(SF, summary({ stars }), detail({ starRating })).rating
  assert.equal(rating(7), 5)
  assert.equal(rating(0), null)
  assert.equal(rating(undefined, undefined), null)
  assert.equal(rating(undefined, 3), 3)
  assert.equal(rating(3.25), 3.3)

  const fallback = hotelRowFor(SF, summary({ latitude: undefined, longitude: undefined, address: '2 Side St' }), detail({ location: { latitude: 1.5, longitude: 2.5 } }))
  assert.deepEqual([fallback.latitude, fallback.longitude, fallback.address, fallback.description], [1.5, 2.5, '2 Side St', ''])
})

test('hotelRowFor marks the hotel listed again and synced at the given time, or now', () => {
  const row = hotelRowFor(SF, summary(), detail(), [], undefined, '2026-10-15T08:00:00.000Z')
  assert.equal(row.liteapi_deleted_at, null)
  assert.equal(row.liteapi_synced_at, '2026-10-15T08:00:00.000Z')
  const before = Date.now()
  const synced = Date.parse(hotelRowFor(SF, summary(), detail()).liteapi_synced_at)
  assert.ok(synced >= before && synced <= Date.now())
})

test('hotelRowFor puts the default image first, prefers HD, removes duplicates and keeps 12', () => {
  const hotelImages = [
    { url: 'a.jpg', order: 2 },
    { url: 'b.jpg', urlHd: 'b-hd.jpg', order: 1 },
    { url: 'main.jpg', order: 9, defaultImage: true },
    { url: 'a.jpg', order: 3 },
    ...Array.from({ length: 20 }, (_, i) => ({ url: `x${i}.jpg`, order: 10 + i })),
  ]
  const photos = hotelRowFor(SF, summary(), detail({ hotelImages })).photo_urls
  assert.deepEqual(photos.slice(0, 4), ['main.jpg', 'b-hd.jpg', 'a.jpg', 'x0.jpg'])
  assert.equal(photos.length, 12)
  assert.equal(new Set(photos).size, 12)

  assert.deepEqual(hotelRowFor(SF, summary({ main_photo: 's.jpg' }), detail({ main_photo: '' })).photo_urls, ['s.jpg'])
  assert.deepEqual(hotelRowFor(SF, summary(), detail()).photo_urls, [])
})

test('roomRowsFor keeps priced rooms first, then the cheapest, up to --max-rooms', () => {
  const sample = samplePricesFor([offer(180.4, {}, { mappedRoomId: 3 }), offer(99.6, {}, { mappedRoomId: 2 })])
  const rooms = [
    room(1, { roomName: '  Standard King Room ', bedTypes: [{ id: 10, quantity: 1, bedType: 'King bed', bedSize: '151-180 cm wide' }] }),
    room(2, { roomAmenities: amenities(118) }),
    room(3),
    room(4),
  ]
  const rows = roomRowsFor(rooms, sample, 3)
  assert.deepEqual(rows.map((r) => r.liteapi_room_id), ['2', '3', '1'])
  assert.deepEqual(rows.map((r) => r.price_per_night), [100, 180, 100], 'unpriced rooms get the hotel cheapest')
  assert.deepEqual(rows[0].tags, ['Free Wi-Fi'])
  assert.ok(rows.every((r) => Array.isArray(r.tags)))
  assert.deepEqual(rows[2], {
    liteapi_room_id: '1', room_type: 'Standard King Room', capacity: 2, max_adults: null, max_children: null, num_beds: 1, bed_size: 'King',
    price_per_night: 100, tags: [],
  })
  assert.equal(roomRowsFor(rooms, sample, 10).length, 4)
})

test('roomRowsFor drops rooms without an id or name and repeated ids', () => {
  const sample = samplePricesFor([offer(100)])
  const rows = roomRowsFor([room(1), room(1, { roomName: 'Copy' }), room(undefined), room(2, { roomName: '  ' })], sample)
  assert.deepEqual(rows.map((r) => [r.liteapi_room_id, r.room_type]), [['1', 'Room 1']])
  assert.deepEqual(roomRowsFor(undefined, sample), [])
})

test('roomRowsFor matches by rate name only when the hotel is not mapped', () => {
  const unmapped = samplePricesFor([offer(300, {}, { name: 'Deluxe Suite!' }), offer(100, {}, { name: 'Basic' })])
  const rows = roomRowsFor([room(1, { roomName: 'deluxe suite' }), room(2)], unmapped)
  assert.deepEqual(rows.map((r) => [r.liteapi_room_id, r.price_per_night]), [['1', 300], ['2', 100]])
})

test('roomRowsFor keeps the room limits, treating a room with 0 max adults as unknown', () => {
  const sample = samplePricesFor([offer(100)])
  const limits = (rooms, adultsOnly) => roomRowsFor(rooms, sample, 10, adultsOnly).map((r) => [r.liteapi_room_id, r.max_adults, r.max_children])
  const rooms = [
    room(1, { maxAdults: 0, maxChildren: 0, maxOccupancy: 4 }),
    room(2, { maxAdults: 2, maxChildren: 0, maxOccupancy: 2 }),
    room(3, { maxAdults: 4, maxChildren: 3, maxOccupancy: 4 }),
    room(4, { maxAdults: 2 }),
    room(5, { maxAdults: 2, maxChildren: 1.5 }),
  ]
  assert.deepEqual(limits(rooms), [['1', null, null], ['2', 2, 0], ['3', 4, 3], ['4', 2, null], ['5', 2, null]])
  assert.deepEqual(limits(rooms, true), [['1', null, 0], ['2', 2, 0], ['3', 4, 0], ['4', 2, 0], ['5', 2, 0]], 'adults-only rooms take no children')
})

test('unmappedFacilities lists the names no rule matched, leaving out adults-only', () => {
  const d = detail({
    facilities: [{ facilityId: 1, name: 'Spa' }, { facilityId: 11, name: 'Fitness center' }, { facilityId: 3 }],
    hotelFacilities: ['Restaurant', 'spa', ' '],
  })
  assert.deepEqual(unmappedFacilities(d), ['spa', 'restaurant'], 'no empty names')
  const family = detail({
    facilities: [{ facilityId: 28, name: 'Family rooms' }, { facilityId: 149, name: 'Adult only' }],
    hotelFacilities: ['Family Rooms', 'Adult only', 'Kids club'],
  })
  assert.deepEqual(unmappedFacilities(family), ['kids club'], 'hotelFacilities names take the id of the same facility')
})

test('hotelSql writes idempotent upserts with escaped strings and text arrays', () => {
  const hotel = hotelRowFor(SF, summary({ stars: 4 }), detail({ name: "Tom's Inn", facilities: [{ facilityId: 1, name: 'Free WiFi' }] }), [], undefined,
    '2026-10-15T08:00:00.000Z')
  const rooms = roomRowsFor([room(7, { roomName: "King's Room" }), room(8, { bedTypes: [], maxAdults: 2, maxChildren: 1 })], samplePricesFor([offer(120)]))
  const sql = hotelSql(hotel, rooms)
  assert.match(sql, /insert into public\.hotels \(liteapi_id, name, description, address, city, region, country, photo_urls, rating, latitude, longitude, tags, liteapi_deleted_at, liteapi_synced_at\)/)
  assert.match(sql, /values \('lp1', 'Tom''s Inn', '', '', 'San Francisco', 'California', 'USA', array\[\]::text\[\], 4, 37\.78, -122\.41, array\['Free Wi-Fi'\]::text\[\], null, '2026-10-15T08:00:00\.000Z'\)/)
  assert.match(sql, /on conflict \(liteapi_id\) do update set name = excluded\.name, .*tags = excluded\.tags, liteapi_deleted_at = excluded\.liteapi_deleted_at, liteapi_synced_at = excluded\.liteapi_synced_at;/)
  assert.ok(!/excluded\.liteapi_id|owner_id/i.test(sql))
  assert.match(sql, /insert into public\.rooms \(hotel_id, liteapi_room_id, room_type, capacity, max_adults, max_children, num_beds, bed_size, price_per_night, tags\)/)
  // An all-null VALUES column is typed text, so the limits are cast for their integer columns
  assert.match(sql, /select h\.id, v\.liteapi_room_id, v\.room_type, v\.capacity, v\.max_adults::integer, v\.max_children::integer, v\.num_beds, v\.bed_size, /)
  assert.match(sql, /\('7', 'King''s Room', 2, null, null, 1, 'Queen', 120, array\[\]::text\[\]\)/)
  assert.match(sql, /\('8', 'Room 8', 2, 2, 1, 1, null, 120, array\[\]::text\[\]\)/)
  assert.match(sql, /join public\.hotels h on h\.liteapi_id = 'lp1'\non conflict \(hotel_id, liteapi_room_id\) do update set room_type = excluded\.room_type, capacity = excluded\.capacity, max_adults = excluded\.max_adults, max_children = excluded\.max_children/)
  assert.ok(!hotelSql(hotel, []).includes('public.rooms'))
})

test('hotelSql removes room types this run left out, unless a reservation needs them, which get the cheapest price', () => {
  const hotel = hotelRowFor(SF, summary(), detail(), [], undefined, '2026-10-15T08:00:00.000Z')
  const rooms = roomRowsFor([room(7), room(8)], samplePricesFor([offer(300, {}, { mappedRoomId: 7 }), offer(120, {}, { mappedRoomId: 8 })]))
  const sql = hotelSql(hotel, rooms)
  const stale = "r.hotel_id = h.id and h.liteapi_id = 'lp1' and r.liteapi_room_id is not null\n  and r.liteapi_room_id not in ('8', '7')"
  assert.ok(sql.includes(`delete from public.rooms r using public.hotels h\nwhere ${stale}\n  and not exists (select 1 from public.reservations res where res.room_id = r.id);`))
  assert.ok(sql.includes(`update public.rooms r set price_per_night = 120 from public.hotels h\nwhere ${stale};`))
  assert.ok(sql.indexOf('delete from') > sql.indexOf('insert into public.rooms'), 'the new rooms are written first')
  assert.ok(!hotelSql(hotel, []).includes('delete from'), 'no rooms imported: nothing is removed')
})

const NOW = new Date('2026-10-15T10:17:00.000Z')

test('parseSince takes auto, hours or days back from now, or a past ISO timestamp with a zone', () => {
  const since = (raw) => {
    const value = parseSince(raw, NOW)
    return value instanceof Date ? value.toISOString() : value
  }
  assert.equal(since('auto'), 'auto')
  assert.equal(since(' 48h '), '2026-10-13T10:17:00.000Z')
  assert.equal(since('1h'), '2026-10-15T09:17:00.000Z')
  assert.equal(since('7d'), '2026-10-08T10:17:00.000Z')
  assert.equal(since('2026-10-08T00:00:00Z'), '2026-10-08T00:00:00.000Z')
  assert.equal(since('2026-10-08T00:00:00.5Z'), '2026-10-08T00:00:00.500Z')
  assert.equal(since('2026-10-08T00:00-07:00'), '2026-10-08T07:00:00.000Z')
  assert.equal(since('2026-10-08'), '2026-10-08T00:00:00.000Z', 'a date alone is midnight UTC')
  assert.equal(since('2026-10-15T10:17:00Z'), '2026-10-15T10:17:00.000Z', 'now itself is fine')
  for (const bad of [undefined, '', 'Auto', 'yesterday', '0h', '05d', '-1d', '1w', '1.5h', '2026-10-08T00:00:00', '2026-13-01',
    '2026-10-15T10:18:00Z', '99999999999d', '1700000000']) {
    assert.equal(since(bad), null, String(bad))
  }
})

test('autoSince goes back a week from the last sync, or from now without one', () => {
  assert.equal(autoSince('2026-10-14T10:17:03.120Z', NOW).toISOString(), '2026-10-07T10:17:03.120Z')
  assert.equal(autoSince('2026-10-14T10:17:03+00:00', NOW).toISOString(), '2026-10-07T10:17:03.000Z', 'Postgres timestamptz text')
  assert.equal(autoSince(null, NOW).toISOString(), '2026-10-08T10:17:00.000Z')
  assert.equal(autoSince(undefined, NOW).toISOString(), '2026-10-08T10:17:00.000Z')
  assert.equal(autoSince('not a date', NOW).toISOString(), '2026-10-08T10:17:00.000Z')
  assert.equal(autoSince('2026-10-16T00:00:00Z', NOW).toISOString(), '2026-10-08T10:17:00.000Z', 'a sync in the future counts as now')
})

test('hotelListQuery adds offset and an RFC3339 lastUpdatedAt only with --since', () => {
  assert.equal(rfc3339(new Date('2026-10-08T07:05:09.999Z')), '2026-10-08T07:05:09Z')
  assert.equal(hotelListQuery(SF, 15).toString(), 'countryCode=US&cityName=San+Francisco&limit=15', 'a normal run lists as before')
  const query = hotelListQuery(SF, 1000, new Date('2026-10-08T07:05:09.999Z'), 2000)
  assert.equal(query.toString(), 'countryCode=US&cityName=San+Francisco&limit=1000&offset=2000&lastUpdatedAt=2026-10-08T07%3A05%3A09Z')
  assert.equal(hotelListQuery(SF, 1000, new Date('2026-10-08T00:00:00Z')).get('offset'), '0')
})

test('planSync updates imported hotels, hides deleted ones and caps new ones', () => {
  const at = NOW.toISOString()
  const listed = [
    summary({ id: 'kept' }),
    summary({ id: 'relisted' }),
    summary({ id: 'gone', deletedAt: '2026-10-14T03:00:00Z' }),
    summary({ id: 'gone-again', deletedAt: '2026-10-01T00:00:00Z' }),
    summary({ id: 'gone-odd', deletedAt: 'sometime' }),
    summary({ id: 'never-ours', deletedAt: '2026-10-14T03:00:00Z' }),
    summary({ id: 'new1' }), summary({ id: 'new2' }), summary({ id: 'new3' }),
  ]
  const existing = new Map([
    ['kept', null], ['relisted', '2026-09-01T00:00:00+00:00'], ['gone', null], ['gone-again', '2026-10-02T00:00:00+00:00'], ['gone-odd', null],
    ['elsewhere', null],
  ])
  const plan = planSync(listed, existing, 2, at)
  const ids = (list) => list.map((item) => item.id ?? item.s.id)
  assert.deepEqual(ids(plan.update), ['kept', 'relisted'], 'a hotel listed again is updated, which clears liteapi_deleted_at')
  assert.deepEqual(ids(plan.add), ['new1', 'new2'])
  assert.deepEqual(plan.remove.map(({ s, at }) => [s.id, at]), [['gone', '2026-10-14T03:00:00.000Z'], ['gone-odd', at]])
  assert.deepEqual(plan.skip.map(({ s, reason }) => [s.id, reason]), [
    ['gone-again', 'already marked removed'],
    ['never-ours', 'deleted at LiteAPI'],
    ['new3', 'new, over --max-new 2'],
  ])

  assert.deepEqual(ids(planSync(listed, existing, 0, at).add), [], '--max-new 0 only refreshes')
  const blind = planSync(listed, null, 3, at)
  assert.deepEqual([ids(blind.update), ids(blind.add), blind.remove], [[], ['kept', 'relisted', 'new1'], []], 'no database: all new')
  assert.equal(blind.skip.filter(({ reason }) => reason === 'deleted at LiteAPI').length, 4)

  assert.equal(removedAt('2026-10-14T03:00:00+02:00', at), '2026-10-14T01:00:00.000Z')
  assert.equal(removedAt('', at), at)
})

test('planSync adds the hotel one of ours was merged into, even over --max-new', () => {
  const at = NOW.toISOString()
  const merged = (id, primaryHotelId) => summary({ id, deletedAt: '2026-10-14T03:00:00Z', primaryHotelId })
  const listed = [
    summary({ id: 'new1' }),
    summary({ id: 'survivor', primaryHotelId: null }),
    merged('ours', 'survivor'),
    merged('ours-hidden', 'elsewhere'),
    merged('ours-into-ours', 'kept'),
    merged('ours-into-itself', 'ours-into-itself'),
    merged('not-ours', 'stranger'),
  ]
  const existing = new Map([['ours', null], ['ours-hidden', '2026-10-14T03:00:00+00:00'], ['ours-into-ours', null], ['ours-into-itself', null], ['kept', null]])
  const plan = planSync(listed, existing, 0, at)
  assert.deepEqual(plan.add.map((s) => s.id), ['survivor'])
  assert.deepEqual(plan.remove.map(({ s }) => s.id), ['ours', 'ours-into-ours', 'ours-into-itself'])
  assert.deepEqual(plan.unlisted.map((s) => [s.id, s.primaryHotelId]), [['ours-hidden', 'elsewhere']],
    'an already hidden hotel still looks for its replacement, so a failed add is retried')

  const found = summary({ id: 'elsewhere' })
  const again = planSync([...listed, found], existing, 0, at)
  assert.deepEqual([again.add.map((s) => s.id), again.unlisted], [['survivor', 'elsewhere'], []])
  assert.deepEqual(planSync(listed, null, 0, at).unlisted, [], 'no database: nothing is ours')
})

test('sameCity compares country and city, ignoring case and spaces', () => {
  const sf = summary({ country: 'US', city: 'San Francisco' })
  assert.equal(sameCity(summary({ country: 'us', city: ' san francisco ' }), sf), true)
  assert.equal(sameCity(summary({ country: 'US', city: 'Oakland' }), sf), false)
  assert.equal(sameCity(summary({ country: 'CA', city: 'San Francisco' }), sf), false)
  assert.equal(sameCity(summary({ city: undefined, country: undefined }), summary({ city: undefined, country: undefined })), false)
})

test('a saved hotel refreshed by id keeps the location it was saved with', () => {
  const target = savedTarget({ liteapi_id: 'lp9', city: 'Paris', region: null, country: 'France' })
  assert.deepEqual(target, { countryCode: '', cityName: 'Paris', city: 'Paris', region: null, country: 'France' })
  const row = hotelRowFor(target, summary({ city: 'Somewhere else', country: 'fr' }), detail(), [], undefined, '2026-10-16T00:00:00.000Z')
  assert.deepEqual([row.city, row.region, row.country], ['Paris', null, 'France'])
  assert.deepEqual(savedTarget({ liteapi_id: 'lp9', city: null, region: null, country: null }),
    { countryCode: '', cityName: '', city: '', region: null, country: '' })
})
