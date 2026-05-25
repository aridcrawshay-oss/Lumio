import { createClient } from '@supabase/supabase-js'
import {
  createClientComponentClient,
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Browser client
export const createBrowserClient = () =>
  createClientComponentClient<Database>()

// Server client
export const createServerClient = () =>
  createRouteHandlerClient<Database>({ cookies })

// Admin client
export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
