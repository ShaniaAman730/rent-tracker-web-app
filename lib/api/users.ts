import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone_number, role')
    .eq('id', session.user.id)
    .single()

  return {
    id: session.user.id,
    email: profile?.email || session.user.email || '',
    full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email || 'User',
    phone_number: profile?.phone_number || null,
    role: (profile?.role as 'manager' | 'contributor') || 'contributor',
  }
}

export async function getUserById(userId: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone_number, role')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name || user.email || 'User',
    phone_number: user.phone_number || null,
    role: (user.role as 'manager' | 'contributor') || 'contributor',
  }
}

export async function getUsersMapByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()

  const uniqueIds = Array.from(new Set(ids))
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
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

// Manager helpers
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone_number, role')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// creates a new user account (sign-up) then inserts profile with role
export async function createUserWithRole(
  email: string,
  password: string,
  fullName: string,
  role: 'manager' | 'contributor'
) {
  // use regular signUp; a manager must be logged in to call this
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  if (signUpError) throw signUpError

  const userId = signUpData.user?.id
  if (!userId) throw new Error('Failed to create new user')

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUserRole(userId: string, role: 'manager' | 'contributor') {
  const { data, error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteUser(userId: string) {
  // supabase auth delete requires service key; for now just remove from users table
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) throw error
}
