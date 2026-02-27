import { createClient } from '@/lib/supabase/client'
import { Utility, UtilityPayment } from '@/lib/types'

const supabase = createClient()

// Utility functions
export async function getUtilitiesByPairing(pairingId: string): Promise<Utility[]> {
  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .eq('pairing_id', pairingId)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUtilitiesByPairingAndType(
  pairingId: string,
  type: 'MNWD' | 'Casureco'
): Promise<Utility[]> {
  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .eq('pairing_id', pairingId)
    .eq('type', type)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUtilitiesByType(type: 'MNWD' | 'Casureco'): Promise<Utility[]> {
  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .eq('type', type)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createUtility(
  pairingId: string,
  type: 'MNWD' | 'Casureco',
  dueDate: string,
  dateOfReading: string,
  unitReading: number,
  firstFloorReading: number,
  secondFloorReading: number,
  amount: number,
  recordedByUserId?: string
): Promise<Utility> {
  const readingDate = new Date(dateOfReading)
  const monthStart = new Date(Date.UTC(readingDate.getUTCFullYear(), readingDate.getUTCMonth(), 1))
  const nextMonth = new Date(Date.UTC(readingDate.getUTCFullYear(), readingDate.getUTCMonth() + 1, 1))

  const { data: existing, error: existingError } = await supabase
    .from('utility')
    .select('id')
    .eq('pairing_id', pairingId)
    .eq('type', type)
    .gte('date_of_reading', monthStart.toISOString().slice(0, 10))
    .lt('date_of_reading', nextMonth.toISOString().slice(0, 10))
    .limit(1)

  if (existingError) throw existingError
  if (existing && existing.length > 0) {
    throw new Error('A utility reading for this pair, type, and month already exists.')
  }

  const insertData: any = {
    pairing_id: pairingId,
    type,
    due_date: dueDate,
    date_of_reading: dateOfReading,
    unit_reading: unitReading,
    first_floor_reading: firstFloorReading,
    second_floor_reading: secondFloorReading,
    amount,
  }
  if (recordedByUserId) insertData.recorded_by_user_id = recordedByUserId

  const { data, error } = await supabase
    .from('utility')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUtility(id: string, updates: Partial<Utility> & { recorded_by_user_id?: string }): Promise<Utility> {
  if (updates.pairing_id && updates.type && updates.date_of_reading) {
    const readingDate = new Date(updates.date_of_reading)
    const monthStart = new Date(Date.UTC(readingDate.getUTCFullYear(), readingDate.getUTCMonth(), 1))
    const nextMonth = new Date(Date.UTC(readingDate.getUTCFullYear(), readingDate.getUTCMonth() + 1, 1))

    const { data: existing, error: existingError } = await supabase
      .from('utility')
      .select('id')
      .eq('pairing_id', updates.pairing_id)
      .eq('type', updates.type)
      .gte('date_of_reading', monthStart.toISOString().slice(0, 10))
      .lt('date_of_reading', nextMonth.toISOString().slice(0, 10))
      .neq('id', id)
      .limit(1)

    if (existingError) throw existingError
    if (existing && existing.length > 0) {
      throw new Error('A utility reading for this pair, type, and month already exists.')
    }
  }

  const { data, error } = await supabase.from('utility').update(updates).eq('id', id).select().single()

  if (error) throw error
  return data
}

export async function deleteUtility(id: string): Promise<void> {
  const { error } = await supabase.from('utility').delete().eq('id', id)

  if (error) throw error
}

// Utility Payment functions
export async function getUtilityPayments(utilityId: string): Promise<UtilityPayment[]> {
  const { data, error } = await supabase
    .from('utility_payment')
    .select('*')
    .eq('utility_id', utilityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUtilityPaymentByUnit(
  utilityId: string,
  unitId: string
): Promise<UtilityPayment | null> {
  const { data, error } = await supabase
    .from('utility_payment')
    .select('*')
    .eq('utility_id', utilityId)
    .eq('unit_id', unitId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function recordUtilityPayment(
  utilityId: string,
  unitId: string,
  paid: boolean,
  recordedByUserId: string,
  comments: string | null
): Promise<UtilityPayment> {
  const existing = await getUtilityPaymentByUnit(utilityId, unitId)

  if (existing) {
    const { data, error } = await supabase
      .from('utility_payment')
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
  }

  const { data, error } = await supabase
    .from('utility_payment')
    .insert({
      utility_id: utilityId,
      unit_id: unitId,
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

export async function deleteUtilityPayment(utilityId: string, unitId: string): Promise<void> {
  const { error } = await supabase
    .from('utility_payment')
    .delete()
    .eq('utility_id', utilityId)
    .eq('unit_id', unitId)

  if (error) throw error
}

// Helper function to get utilities with payment info
export async function getUtilitiesWithPayments(pairingId: string, type?: 'MNWD' | 'Casureco') {
  let utilities: Utility[] = []

  if (type) {
    utilities = await getUtilitiesByPairingAndType(pairingId, type)
  } else {
    utilities = await getUtilitiesByPairing(pairingId)
  }

  const withPayments = await Promise.all(
    utilities.map(async (utility) => {
      const payments = await getUtilityPayments(utility.id)
      return {
        ...utility,
        payments,
        payment: payments[0] || null,
      }
    })
  )

  return withPayments
}

export async function getUtilitiesWithPaymentsForPairings(
  pairingIds: string[],
  type?: 'MNWD' | 'Casureco'
) {
  if (pairingIds.length === 0) return []

  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .in('pairing_id', pairingIds)
    .order('due_date', { ascending: false })

  if (error) throw error

  let utilities = data || []
  if (type) {
    utilities = utilities.filter((utility) => utility.type === type)
  }

  const withPayments = await Promise.all(
    utilities.map(async (utility) => {
      const payments = await getUtilityPayments(utility.id)
      return {
        ...utility,
        payments,
        payment: payments[0] || null,
      }
    })
  )

  return withPayments
}

export async function touchUtilityPaymentRecorder(utilityId: string, recordedByUserId: string) {
  const existing = await getUtilityPayments(utilityId)
  if (existing.length === 0) return []

  const updates = await Promise.all(
    existing.map(async (payment) => {
      const { data, error } = await supabase
        .from('utility_payment')
        .update({
          recorded_by_user_id: recordedByUserId,
          recorded_date: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .select()
        .single()

      if (error) throw error
      return data
    })
  )

  return updates
}
