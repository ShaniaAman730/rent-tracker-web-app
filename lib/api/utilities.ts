import { createClient } from '@/lib/supabase/client'
import { Utility, UtilityPayment } from '@/lib/types'

const supabase = createClient()

// Utility functions
export async function getUtilitiesByUnit(unitId: string): Promise<Utility[]> {
  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .eq('unit_id', unitId)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUtilitiesByUnitAndType(
  unitId: string,
  type: 'MNWD' | 'Casureco'
): Promise<Utility[]> {
  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .eq('unit_id', unitId)
    .eq('type', type)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUtilitiesByType(
  type: 'MNWD' | 'Casureco'
): Promise<Utility[]> {
  const { data, error } = await supabase
    .from('utility')
    .select('*')
    .eq('type', type)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createUtility(
  unitId: string,
  type: 'MNWD' | 'Casureco',
  dueDate: string,
  dateOfReading: string,
  unitReading: number,
  firstFloorReading: number,
  secondFloorReading: number,
  amount: number
): Promise<Utility> {
  const { data, error } = await supabase
    .from('utility')
    .insert({
      unit_id: unitId,
      type,
      due_date: dueDate,
      date_of_reading: dateOfReading,
      unit_reading: unitReading,
      first_floor_reading: firstFloorReading,
      second_floor_reading: secondFloorReading,
      amount,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUtility(id: string, updates: Partial<Utility>): Promise<Utility> {
  const { data, error } = await supabase
    .from('utility')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUtility(id: string): Promise<void> {
  const { error } = await supabase.from('utility').delete().eq('id', id)

  if (error) throw error
}

// Utility Payment functions
export async function getUtilityPayment(utilityId: string): Promise<UtilityPayment | null> {
  const { data, error } = await supabase
    .from('utility_payment')
    .select('*')
    .eq('utility_id', utilityId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function recordUtilityPayment(
  utilityId: string,
  paid: boolean,
  recordedByUserId: string
): Promise<UtilityPayment> {
  // Check if payment record exists
  const existing = await getUtilityPayment(utilityId)

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('utility_payment')
      .update({
        paid,
        recorded_by_user_id: recordedByUserId,
        recorded_date: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('utility_payment')
      .insert({
        utility_id: utilityId,
        paid,
        recorded_by_user_id: recordedByUserId,
        recorded_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function deleteUtilityPayment(id: string): Promise<void> {
  const { error } = await supabase.from('utility_payment').delete().eq('id', id)

  if (error) throw error
}

// Helper function to get utilities with payment info
export async function getUtilitiesWithPayments(unitId: string, type?: 'MNWD' | 'Casureco') {
  let utilities: Utility[] = []

  if (type) {
    utilities = await getUtilitiesByUnitAndType(unitId, type)
  } else {
    utilities = await getUtilitiesByUnit(unitId)
  }

  const withPayments = await Promise.all(
    utilities.map(async (utility) => ({
      ...utility,
      payment: await getUtilityPayment(utility.id),
    }))
  )

  return withPayments
}
