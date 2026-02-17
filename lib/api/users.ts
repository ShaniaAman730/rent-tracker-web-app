import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return null

  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.user_metadata?.full_name || session.user.email || 'User',
  }
}

export async function getUserById(userId: string) {
  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(userId)

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email || 'User',
  }
}
