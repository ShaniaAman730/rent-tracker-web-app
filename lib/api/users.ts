import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone_number')
    .eq('id', session.user.id)
    .single()

  return {
    id: session.user.id,
    email: profile?.email || session.user.email || '',
    full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email || 'User',
    phone_number: profile?.phone_number || null,
  }
}

export async function getUserById(userId: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone_number')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name || user.email || 'User',
    phone_number: user.phone_number || null,
  }
}

export async function getUsersMapByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()

  const uniqueIds = Array.from(new Set(ids))
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', uniqueIds)

  if (error) throw error

  const usersMap = new Map<string, string>()
  ;(data || []).forEach((user) => {
    usersMap.set(user.id, user.full_name || user.email || 'User')
  })

  return usersMap
}

export async function updateCurrentUserProfile(fullName: string, phoneNumber: string | null) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) throw new Error('No active session')

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })
  if (authError) throw authError

  const { error } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      phone_number: phoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (error) throw error
}

export async function updateCurrentUserEmail(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) throw new Error('No active session')

  const { error: authError } = await supabase.auth.updateUser({ email })
  if (authError) throw authError

  const { error } = await supabase
    .from('users')
    .update({
      email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (error) throw error
}

export async function updateCurrentUserPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
