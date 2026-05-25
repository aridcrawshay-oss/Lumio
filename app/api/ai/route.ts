import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { callAI } from '@/lib/ai'
import { getTrialStatus } from '@/lib/trial'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const trial = getTrialStatus(profile)
    if (!trial.isActive) {
      return NextResponse.json({
        error: 'Your 14-day free trial has ended. Subscribe to continue.',
        trialExpired: true,
      }, { status: 402 })
    }

    const body = await req.json()
    const { system, messages, maxTokens } = body
    if (!messages?.length) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const result = await callAI({
      system: system ?? 'You are a helpful study tutor.',
      messages,
      maxTokens: maxTokens ?? 1200,
    })

    // Log study activity
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('study_history').upsert(
      { user_id: user.id, study_date: today, activity_count: 1 },
      { onConflict: 'user_id,study_date' }
    )

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('AI route error:', err)
    return NextResponse.json({ error: err.message ?? 'AI request failed' }, { status: 500 })
  }
}
