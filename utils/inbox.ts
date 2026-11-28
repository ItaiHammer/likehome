import { cache } from 'react'
import { toInboxMessages, toStayRefs, type InboxMessage, type StayRef } from '@/lib/messages'
import { getMessagesByAccount } from '@/utils/messages'
import { getReservationsByAccount } from '@/utils/reservations'
import { getViewer } from '@/utils/viewer'

export type InboxRead = { messages: InboxMessage[]; error: string | null }

// Cached per request, so the header bell and the /messages page share one query
export const getInbox = cache(async (): Promise<InboxRead> => {
  const { userId } = await getViewer()
  if (!userId) return { messages: [], error: null }
  const { data, error } = await getMessagesByAccount(userId)
  if (error) return { messages: [], error: error.message }
  return { messages: toInboxMessages(data ?? []), error: null }
})

// The traveler's own reservations, for the messages' stay lines. Best effort: none on any error.
export const getInboxStays = cache(async (): Promise<StayRef[]> => {
  const { userId } = await getViewer()
  if (!userId) return []
  const { data, error } = await getReservationsByAccount(userId)
  if (error) console.error('Reservations read for messages failed:', error.message)
  return error ? [] : toStayRefs(data)
})
