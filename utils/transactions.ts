import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Transactions are append-only: corrections are new rows, never updates or deletes.
// amount is always positive; transaction_type says which direction the value moved.
// charge = customer pays for the reservation. credit = value goes back to the customer's
// site wallet (no money returns to the card). The wallet balance itself lives in the wallet table.

export type TransactionType = 'charge' | 'credit'
export type TransactionStatus = 'pending' | 'completed' | 'failed'

export async function createTransaction(transaction: {
  payment_id: string
  amount: number
  transaction_type: TransactionType
  status?: TransactionStatus
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
  return { data, error }
}

/**
 * Records the checkout charge for a payment. Clients can't insert transactions directly
 * (audit F13): the record_checkout_charge database function checks the payment is the
 * caller's, prices the stay from the room's nightly rate, and refuses a second charge.
 */
export async function recordCheckoutCharge(paymentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.rpc('record_checkout_charge', { p_payment_id: paymentId })
  return { data: (data ?? null) as { id: string; amount: number | string; status: string }[] | null, error }
}

/**
 * Records the checkout charge for a booking priced live by LiteAPI, at that price. record_checkout_charge would charge
 * the room's stored rate, so this writes with the server key; clients still can't write transactions.
 */
export async function recordLiveCharge(paymentId: string, amount: number) {
  const supabase = createAdminClient()
  if (!supabase) return { data: null, error: { message: 'SUPABASE_SECRET_KEY is not set.', code: 'NO_SERVER_KEY' } }
  const { data, error } = await supabase
    .from('transactions')
    .insert({ payment_id: paymentId, amount, transaction_type: 'charge', status: 'completed' })
    .select('id, amount, status')
  return { data: data as { id: string; amount: number | string; status: string }[] | null, error }
}

export async function getTransactionsByPayment(paymentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('payment_id', paymentId)
  return { data, error }
}

export async function getTransactionsByReservation(reservationId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('transactions')
    .select('*, payments!inner(reservation_id)')
    .eq('payments.reservation_id', reservationId)
  return { data, error }
}

/** Net amount paid for a reservation: completed charges minus completed credits, in dollars. */
export async function getAmountPaid(reservationId: string) {
  const { data, error } = await getTransactionsByReservation(reservationId)
  if (error || !data) return { data: null, error }

  const cents = data
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => {
      const amount = Math.round(Number(t.amount) * 100)
      return t.transaction_type === 'credit' ? sum - amount : sum + amount
    }, 0)

  return { data: cents / 100, error: null }
}
