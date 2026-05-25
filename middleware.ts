import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/api/auth', '/privacy', '/terms']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p))

  // Not logged in and trying to access app
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Logged in and hitting auth pages — redirect to dashboard
  if (session && path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
