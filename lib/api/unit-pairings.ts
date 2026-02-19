import { createClient } from '@/lib/supabase/client'
import { UnitPairing } from '@/lib/types'

const supabase = createClient()

export async function getUnitPairings(): Promise<UnitPairing[]> {
  const { data, error } = await supabase
    .from('unit_pairing')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUnitPairingByUnitId(unitId: string): Promise<UnitPairing | null> {
  const { data, error } = await supabase
    .from('unit_pairing')
    .select('*')
    .or(`first_unit_id.eq.${unitId},second_unit_id.eq.${unitId}`)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function upsertUnitPairing(firstUnitId: string, secondUnitId: string): Promise<UnitPairing> {
  const existingFirst = await getUnitPairingByUnitId(firstUnitId)
  if (existingFirst) {
    const { data, error } = await supabase
      .from('unit_pairing')
      .update({
        first_unit_id: firstUnitId,
        second_unit_id: secondUnitId,
      })
      .eq('id', existingFirst.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const existingSecond = await getUnitPairingByUnitId(secondUnitId)
  if (existingSecond) {
    const { data, error } = await supabase
      .from('unit_pairing')
      .update({
        first_unit_id: firstUnitId,
        second_unit_id: secondUnitId,
      })
      .eq('id', existingSecond.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('unit_pairing')
    .insert({
      first_unit_id: firstUnitId,
      second_unit_id: secondUnitId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUnitPairing(pairingId: string): Promise<void> {
  const { error } = await supabase.from('unit_pairing').delete().eq('id', pairingId)
  if (error) throw error
}
