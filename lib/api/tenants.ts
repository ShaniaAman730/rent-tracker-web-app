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
  contactNo: string,
  messenger: string,
  govIdType: string | null,
  govIdNo: string | null,
  idIssuedDate: string | null,
  idExpiryDate: string | null,
  recordedByUserId?: string
): Promise<Tenant> {
  const insertData: any = {
    unit_id: unitId,
    first_name: firstName,
    last_name: lastName,
    contact_no: contactNo,
    messenger,
    gov_id_type: govIdType,
    gov_id_no: govIdNo,
    id_issued_date: idIssuedDate,
    id_expiry_date: idExpiryDate,
  }
  if (recordedByUserId) insertData.recorded_by_user_id = recordedByUserId

  const { data, error } = await supabase
    .from('tenant')
    .insert(insertData)
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
  tenantId: string,
  landlordId: string,
  year: number,
  firstName: string,
  middleName: string,
  lastName: string,
  citizenship: string,
  maritalStatus: string,
  govIdType: string | null,
  govIdNo: string | null,
  idIssuedDate: string | null,
  idExpiryDate: string | null,
  tenantAddress: string,
  unitSpecification: string,
  propertySpecification: string,
  rent: number,
  cashBond: number,
  beginContract: string,
  endContract: string,
  signed: boolean,
  recordedByUserId: string,
  comments: string | null
): Promise<Contract> {
  const { data, error } = await supabase
    .from('contract')
    .insert({
      unit_id: unitId,
      tenant_id: tenantId,
      landlord_id: landlordId,
      year,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      citizenship,
      marital_status: maritalStatus,
      gov_id_type: govIdType,
      gov_id_no: govIdNo,
      id_issued_date: idIssuedDate,
      id_expiry_date: idExpiryDate,
      tenant_address: tenantAddress,
      unit_specification: unitSpecification,
      property_specification: propertySpecification,
      rent,
      cash_bond: cashBond,
      begin_contract: beginContract,
      end_contract: endContract,
      signed,
      recorded_by_user_id: recordedByUserId,
      recorded_date: new Date().toISOString(),
      comments,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract> {
  const payload: Partial<Contract> = { ...updates }
  if (!Object.prototype.hasOwnProperty.call(updates, 'recorded_date') && updates.recorded_by_user_id) {
    payload.recorded_date = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('contract')
    .update(payload)
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

export async function getContractsByYear(year: number): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contract')
    .select('*')
    .eq('year', year)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
