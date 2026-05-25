import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getTrialStatus } from '@/lib/trial'
import AppShell from '@/components/app/AppShell'

export default async function Page() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')
  const trial = getTrialStatus(profile)
  return <AppShell profile={profile} trial={trial} initialPage="ai" />
}
