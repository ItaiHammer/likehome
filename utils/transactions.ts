import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// Transactions are append-only: corrections are new rows, never updates or deletes.
// amount is always positive; transaction_type says which direction the money moved.

export type TransactionType = 'charge' | 'refund'
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

/** Net amount paid for a reservation: completed charges minus completed refunds, in dollars. */
export async function getAmountPaid(reservationId: string) {
  const { data, error } = await getTransactionsByReservation(reservationId)
  if (error || !data) return { data: null, error }

  const cents = data
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => {
      const amount = Math.round(Number(t.amount) * 100)
      return t.transaction_type === 'refund' ? sum - amount : sum + amount
    }, 0)

  return { data: cents / 100, error: null }
}
