import { createClient } from '@/lib/supabase/client'
import { Landlord } from '@/lib/types'

const supabase = createClient()

export async function getAllLandlords(): Promise<Landlord[]> {
  const { data, error } = await supabase
    .from('landlord')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createLandlord(payload: Omit<Landlord, 'id' | 'created_at'>): Promise<Landlord> {
  const { data, error } = await supabase.from('landlord').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateLandlord(id: string, updates: Partial<Landlord>): Promise<Landlord> {
  const { data, error } = await supabase.from('landlord').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteLandlord(id: string): Promise<void> {
  const { error } = await supabase.from('landlord').delete().eq('id', id)
  if (error) throw error
}
