import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/auth/login')
}
