import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Browser client (for client components)
export const createBrowserClient = () =>
  createClientComponentClient<Database>()

// Server client (for server components and API routes)
export const createServerClient = () =>
  createServerComponentClient<Database>({ cookies })

// Admin client (service role — only use in API routes, never browser)
export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
