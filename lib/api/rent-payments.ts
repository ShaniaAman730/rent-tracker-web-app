import { createClient } from '@/lib/supabase/client'
import { RentPayment } from '@/lib/types'

const supabase = createClient()

export async function getRentPayments(
  unitId: string,
  year: number,
  month?: number
): Promise<RentPayment[]> {
  let query = supabase
    .from('rent_payment')
    .select('*')
    .eq('unit_id', unitId)
    .eq('year', year)

  if (month !== undefined) {
    query = query.eq('month', month)
  }

  const { data, error } = await query.order('month', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getRentPaymentForMonth(
  unitId: string,
  year: number,
  month: number
): Promise<RentPayment | null> {
  const { data, error } = await supabase
    .from('rent_payment')
    .select('*')
    .eq('unit_id', unitId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function recordRentPayment(
  unitId: string,
  year: number,
  month: number,
  paid: boolean,
  recordedByUserId: string,
  comments: string | null
): Promise<RentPayment> {
  // Check if payment record exists
  const existing = await getRentPaymentForMonth(unitId, year, month)

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('rent_payment')
      .update({
        paid,
        recorded_by_user_id: recordedByUserId,
        recorded_date: new Date().toISOString(),
        comments,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('rent_payment')
      .insert({
        unit_id: unitId,
        year,
        month,
        paid,
        recorded_by_user_id: recordedByUserId,
        recorded_date: new Date().toISOString(),
        comments,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function deleteRentPayment(id: string): Promise<void> {
  const { error } = await supabase.from('rent_payment').delete().eq('id', id)

  if (error) throw error
}
