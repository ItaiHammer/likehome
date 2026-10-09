import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// A payment is the card used for one reservation (dummy card data, never real).
// Money movements against it live in the transactions table.

export async function createPayment(payment: {
  reservation_id: string
  account_id: string
  card_number: string
  card_exp_month: number
  card_exp_year: number
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
  return { data, error }
}

export async function getPayment(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function getPaymentsByReservation(reservationId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('reservation_id', reservationId)
  return { data, error }
}
