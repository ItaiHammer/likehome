import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// One-way hotel -> guest messages, one row per recipient (read_at is that recipient's read status).
// RLS: a guest sees only their own messages, an owner sees only messages from hotels they own.
// Messages are kept for reference, so there is no update or delete. The only change allowed after
// sending is read_at, which markMessageRead sets.

// Send one message to one guest. The hotel must be owned by the signed-in user.
export async function createMessage(message: {
  hotel_id: string
  recipient_id: string
  subject: string
  body: string
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
  return { data, error }
}

// Send the same message to many guests (one row each) in a single insert.
export async function createMessages(
  hotelId: string,
  recipientIds: string[],
  subject: string,
  body: string
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('messages')
    .insert(
      recipientIds.map((recipientId) => ({
        hotel_id: hotelId,
        recipient_id: recipientId,
        subject,
        body,
      }))
    )
    .select()
  return { data, error }
}

export async function getMessage(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('messages')
    .select('*, hotels(name)')
    .eq('id', id)
    .single()
  return { data, error }
}

// A traveler's inbox, newest first. read_at is null for unread.
export async function getMessagesByAccount(accountId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('messages')
    .select('*, hotels(name)')
    .eq('recipient_id', accountId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// What a hotel has sent, newest first, with each recipient's read_at.
export async function getMessagesByHotel(hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Sets read_at the first time only; marking an already-read message again changes nothing.
export async function markMessageRead(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
    .select()
  return { data, error }
}

// Guests who have a reservation at this hotel, for picking recipients. Empty unless the
// signed-in user owns the hotel. Each row: account_id, email, full_name, last_check_in, last_status.
export async function getHotelRecipients(hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.rpc('get_hotel_recipients', {
    p_hotel_id: hotelId,
  })
  return { data: data ?? [], error }
}
