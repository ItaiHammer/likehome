import { cache } from 'react'
import { toInboxMessages, type InboxMessage } from '@/lib/messages'
import { getMessagesByAccount } from '@/utils/messages'
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
