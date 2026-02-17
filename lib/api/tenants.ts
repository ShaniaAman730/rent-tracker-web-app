import { createClient } from '@/lib/supabase/client'
import { Tenant, Contract } from '@/lib/types'

const supabase = createClient()

// Tenant functions
export async function getTenantByUnit(unitId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .eq('unit_id', unitId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getAllTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTenant(
  unitId: string,
  firstName: string,
  lastName: string,
  contractName: string,
  contactNo: string,
  messenger: string,
  address: string,
  beginContract: string,
  endContract: string
): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenant')
    .insert({
      unit_id: unitId,
      first_name: firstName,
      last_name: lastName,
      contract_name: contractName,
      contact_no: contactNo,
      messenger,
      address,
      begin_contract: beginContract,
      end_contract: endContract,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenant')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase.from('tenant').delete().eq('id', id)

  if (error) throw error
}

// Contract functions
export async function getContractsByUnit(unitId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contract')
    .select('*')
    .eq('unit_id', unitId)
    .order('year', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getContractByUnitAndYear(
  unitId: string,
  year: number
): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contract')
    .select('*')
    .eq('unit_id', unitId)
    .eq('year', year)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function createContract(
  unitId: string,
  year: number,
  signed: boolean,
  notarized: boolean,
  signedRecordedBy?: string,
  notarizedRecordedBy?: string
): Promise<Contract> {
  const { data, error } = await supabase
    .from('contract')
    .insert({
      unit_id: unitId,
      year,
      signed,
      notarized,
      signed_recorded_by: signedRecordedBy || null,
      notarized_recorded_by: notarizedRecordedBy || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract> {
  const { data, error } = await supabase
    .from('contract')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('contract').delete().eq('id', id)

  if (error) throw error
}
