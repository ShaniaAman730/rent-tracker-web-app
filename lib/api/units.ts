import { createClient } from '@/lib/supabase/client'
import { Unit, Tenant } from '@/lib/types'

const supabase = createClient()

export async function getUnitsByProperty(propertyId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('unit')
    .select('*')
    .eq('rental_property_id', propertyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const { data, error } = await supabase.from('unit').select('*').eq('id', id).single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function createUnit(
  propertyId: string,
  name: string,
  trackUtilities: boolean,
  contractAddress: string,
  rentAmount: number,
  cashBondAmount: number
): Promise<Unit> {
  // First check if adding this unit would exceed no_units limit
  const { data: property, error: propError } = await supabase
    .from('rental_property')
    .select('no_units')
    .eq('id', propertyId)
    .single()

  if (propError) throw propError

  const { data: currentUnits, error: countError } = await supabase
    .from('unit')
    .select('id')
    .eq('rental_property_id', propertyId)

  if (countError) throw countError

  if ((currentUnits?.length || 0) >= (property?.no_units || 0)) {
    throw new Error('Cannot add more units. Maximum number of units reached.')
  }

  const { data, error } = await supabase
    .from('unit')
    .insert({
      rental_property_id: propertyId,
      name,
      track_utilities: trackUtilities,
      contract_address: contractAddress,
      rent_amount: rentAmount,
      cash_bond_amount: cashBondAmount,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase
    .from('unit')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from('unit').delete().eq('id', id)

  if (error) throw error
}

export async function getUnitWithTenant(unitId: string) {
  const { data: unit, error: unitError } = await supabase
    .from('unit')
    .select('*')
    .eq('id', unitId)
    .single()

  if (unitError) throw unitError

  const { data: tenant, error: tenantError } = await supabase
    .from('tenant')
    .select('*')
    .eq('unit_id', unitId)
    .single()

  return {
    ...unit,
    tenant: tenant || null,
  }
}
