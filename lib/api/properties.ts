import { createClient } from '@/lib/supabase/client'
import { RentalProperty, Unit, Tenant, RentPayment, User } from '@/lib/types'

const supabase = createClient()

export async function getAllProperties(): Promise<RentalProperty[]> {
  const { data, error } = await supabase
    .from('rental_property')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPropertyById(id: string): Promise<RentalProperty | null> {
  const { data, error } = await supabase
    .from('rental_property')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function createProperty(
  name: string,
  address: string,
  code: string,
  no_units: number
): Promise<RentalProperty> {
  const { data, error } = await supabase
    .from('rental_property')
    .insert({
      name,
      address,
      code,
      no_units,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProperty(
  id: string,
  updates: Partial<RentalProperty>
): Promise<RentalProperty> {
  const { data, error } = await supabase
    .from('rental_property')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('rental_property').delete().eq('id', id)

  if (error) throw error
}

export async function getPropertiesWithUnits() {
  const { data: properties, error: propsError } = await supabase
    .from('rental_property')
    .select('*')
    .order('created_at', { ascending: false })

  if (propsError) throw propsError

  const propertiesWithUnits = await Promise.all(
    (properties || []).map(async (prop) => {
      const { data: units, error: unitsError } = await supabase
        .from('unit')
        .select('*')
        .eq('rental_property_id', prop.id)
        .order('created_at', { ascending: true })

      if (unitsError) throw unitsError

      return {
        ...prop,
        units: units || [],
      }
    })
  )

  return propertiesWithUnits
}
