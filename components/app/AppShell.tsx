'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Subject = Database['public']['Tables']['subjects']['Row']
type Assignment = Database['public']['Tables']['assignments']['Row']
type Flashcard = Database['public']['Tables']['flashcards']['Row']
type Goal = Database['public']['Tables']['goals']['Row']
type FileRow = Database['public']['Tables']['files']['Row']

interface TrialStatus {
  isActive: boolean
  isSubscribed: boolean
  isTrial: boolean
  isExpired: boolean
  daysLeft: number
}

interface Props {
  profile: Profile
  trial: TrialStatus
  initialPage: string
}

// ── Themes ───────────────────────────────────────
const THEMES: Record<string, Record<string, string>> = {
  dark:     {'--bg':'#09090f','--panel':'#111118','--card':'#16161f','--card2':'#1c1c28','--card3':'#222232','--line':'rgba(255,255,255,.06)','--line2':'rgba(255,255,255,.11)','--t1':'#eeeeff','--t2':'#9898bb','--t3':'#55556a'},
  midnight: {'--bg':'#050810','--panel':'#0b1020','--card':'#121828','--card2':'#182034','--card3':'#1e2a42','--line':'rgba(255,255,255,.05)','--line2':'rgba(255,255,255,.09)','--t1':'#dde8ff','--t2':'#7a8fb0','--t3':'#435070'},
  slate:    {'--bg':'#0e1117','--panel':'#161c27','--card':'#1e2636','--card2':'#242f42','--card3':'#2a384e','--line':'rgba(255,255,255,.06)','--line2':'rgba(255,255,255,.1)','--t1':'#e8eeff','--t2':'#8899cc','--t3':'#485880'},
  forest:   {'--bg':'#080f0a','--panel':'#0f1810','--card':'#162016','--card2':'#1c2a1c','--card3':'#223222','--line':'rgba(255,255,255,.05)','--line2':'rgba(255,255,255,.09)','--t1':'#e0f5e8','--t2':'#7aaa88','--t3':'#3d6645'},
  rose:     {'--bg':'#0f080b','--panel':'#1a1015','--card':'#221520','--card2':'#2a1a28','--card3':'#321e30','--line':'rgba(255,255,255,.05)','--line2':'rgba(255,255,255,.1)','--t1':'#fff0f5','--t2':'#cc88a0','--t3':'#885060'},
  ocean:    {'--bg':'#08090f','--panel':'#0e1220','--card':'#131c30','--card2':'#182438','--card3':'#1e2c44','--line':'rgba(255,255,255,.06)','--line2':'rgba(255,255,255,.1)','--t1':'#e0f0ff','--t2':'#7099cc','--t3':'#3a5580'},
}

const ACCENTS = [
  {name:'Violet', acc:'#6c5ce7', acc2:'#9b8ff0', glow:'rgba(108,92,231,.18)'},
  {name:'Teal',   acc:'#0d9488', acc2:'#2dd4bf', glow:'rgba(13,148,136,.15)'},
  {name:'Rose',   acc:'#e11d6b', acc2:'#f472b6', glow:'rgba(225,29,107,.15)'},
  {name:'Orange', acc:'#ea580c', acc2:'#fb923c', glow:'rgba(234,88,12,.15)'},
  {name:'Sky',    acc:'#0284c7', acc2:'#38bdf8', glow:'rgba(2,132,199,.15)'},
  {name:'Emerald',acc:'#059669', acc2:'#34d399', glow:'rgba(5,150,105,.15)'},
]

const LEVELS = [
  {l:1,n:'Newcomer',xp:50},{l:2,n:'Learner',xp:120},{l:3,n:'Student',xp:220},
  {l:4,n:'Scholar',xp:360},{l:5,n:'Academic',xp:550},{l:6,n:'Expert',xp:800},
  {l:7,n:'Master',xp:1100},{l:8,n:'Legend',xp:1500},
]

const SHOP_ITEMS = [
  {id:'streak_freeze',icon:'🧊',name:'Streak Freeze',desc:'Protect your streak for 1 day',price:30},
  {id:'double_tokens',icon:'⚡',name:'2× Token Boost',desc:'Double tokens for next Pomodoro',price:50},
  {id:'ai_hints',icon:'🤖',name:'AI Hints ×5',desc:'5 instant flashcard hints',price:25},
  {id:'xp_boost',icon:'🚀',name:'XP Boost',desc:'Double XP for today',price:60},
  {id:'pomo_ext',icon:'⏱️',name:'Pomo +5 min',desc:'Adds 5 minutes to timer',price:20},
  {id:'custom_badge',icon:'🎖️',name:'Custom Badge',desc:'Personalised achievement badge',price:100},
]

const DQ = [
  {id:'q1',title:'Complete an assignment',reward:15,target:1,stat:'assignDone'},
  {id:'q2',title:'Review 10 flashcards',reward:12,target:10,stat:'fcReviewed'},
  {id:'q3',title:'Complete a Pomodoro session',reward:15,target:1,stat:'pomoToday'},
  {id:'q4',title:'Ask the AI tutor 3 questions',reward:10,target:3,stat:'aiAsked'},
  {id:'q5',title:'Save notes to a subject',reward:8,target:1,stat:'noteSaved'},
]

const BADGES = [
  {id:'b1',icon:'🌟',name:'First Step',ok:(p:Profile)=>p.tokens>=1},
  {id:'b2',icon:'🔥',name:'On Fire',ok:(p:Profile)=>p.streak>=3},
  {id:'b3',icon:'💥',name:'Week Warrior',ok:(p:Profile)=>p.streak>=7},
  {id:'b4',icon:'✅',name:'Task Master',ok:(_:Profile,extra:any)=>extra?.doneTasks>=5},
  {id:'b5',icon:'📇',name:'Card Shark',ok:(p:Profile)=>p.fc_mastered>=20},
  {id:'b6',icon:'🍅',name:'Pomo Pro',ok:(p:Profile)=>p.pomo_sessions>=10},
  {id:'b7',icon:'👑',name:'Century',ok:(p:Profile)=>p.tokens>=100},
  {id:'b8',icon:'✍️',name:'Essayist',ok:(p:Profile)=>p.essays_graded>=1},
  {id:'b9',icon:'🏆',name:'Legend',ok:(p:Profile)=>p.tokens>=500},
]

function getLvl(xp: number) {
  let info = LEVELS[LEVELS.length-1]
  for (const l of LEVELS) { if (xp < l.xp) { info = l; break } }
  const pi = LEVELS.findIndex(l => l.l === info.l)
  const prev = pi > 0 ? LEVELS[pi-1].xp : 0
  return { ...info, prev, pct: Math.min(100, Math.round((xp-prev)/(info.xp-prev)*100)) }
}

function today() { return new Date().toISOString().split('T')[0] }

export default function AppShell({ profile: initProfile, trial, initialPage }: Props) {
  const [profile, setProfile] = useState(initProfile)
  const [page, setPage] = useState(initialPage)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [files, setFiles] = useState<FileRow[]>([])
  const [curSubject, setCurSubject] = useState<Subject|null>(null)
  const [toast, setToast] = useState<{icon:string,msg:string}|null>(null)
  const [aiMsgs, setAiMsgs] = useState<{role:string,content:string}[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [fcCards, setFcCards] = useState<Flashcard[]>([])
  const [fcIdx, setFcIdx] = useState(0)
  const [fcFlipped, setFcFlipped] = useState(false)
  const [pomoSec, setPomoSec] = useState(25*60)
  const [pomoRunning, setPomoRunning] = useState(false)
  const [pomoMode, setPomoMode] = useState<'study'|'short'|'long'>('study')
  const [pomoMins, setPomoMins] = useState(25)
  const [pomoCount, setPomoCount] = useState(0)
  const [inventory, setInventory] = useState<string[]>([])

  const supabase = createBrowserClient()
  const router = useRouter()

  // ── Apply theme ───────────────────────────────
  useEffect(() => {
    const th = THEMES[profile.theme] ?? THEMES.dark
    const ac = ACCENTS[profile.accent_idx] ?? ACCENTS[0]
    const r = document.documentElement.style
    Object.entries(th).forEach(([k,v]) => r.setProperty(k, v))
    r.setProperty('--acc', ac.acc)
    r.setProperty('--acc2', ac.acc2)
    r.setProperty('--acc-glow', ac.glow)
  }, [profile.theme, profile.accent_idx])

  // ── Load data ─────────────────────────────────
  useEffect(() => {
    loadAll()
    initAIGreeting()
  }, [])

  async function loadAll() {
    const [{ data: subs }, { data: asgn }, { data: fcs }, { data: gls }, { data: inv }, { data: fls }] = await Promise.all([
      supabase.from('subjects').select('*').order('created_at'),
      supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('flashcards').select('*').order('due_date'),
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('inventory').select('item_id').eq('active', true),
      supabase.from('files').select('*').order('created_at', { ascending: false }),
    ])
    if (subs) setSubjects(subs)
    if (asgn) setAssignments(asgn)
    if (fcs) { setFlashcards(fcs); setFcCards(fcs) }
    if (gls) setGoals(gls)
    if (inv) setInventory(inv.map(i => i.item_id))
    if (fls) setFiles(fls)
  }

  function showToast(icon: string, msg: string) {
    setToast({ icon, msg })
    setTimeout(() => setToast(null), 2800)
  }

  async function updateProfile(updates: Partial<Profile>) {
    const merged = { ...profile, ...updates }
    setProfile(merged)
    await supabase.from('profiles').update(updates).eq('id', profile.id)
  }

  async function addTokens(amount: number, reason: string) {
    await updateProfile({ tokens: profile.tokens + amount, xp: profile.xp + amount })
    showToast('🪙', `+${amount} — ${reason}`)
  }

  function cleanFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  }

  async function uploadStudyFiles(fileList: FileList | File[], subjectId?: string | null) {
    const incoming = Array.from(fileList)
    if (!incoming.length) return

    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
    ])

    const saved: FileRow[] = []
    for (const file of incoming) {
      const isAllowed = allowed.has(file.type) || /\.(pdf|docx|txt|png|jpe?g)$/i.test(file.name)
      if (!isAllowed) {
        showToast('⚠️', `${file.name} is not a supported file type`)
        continue
      }

      const storagePath = `${profile.id}/${subjectId || 'dashboard'}/${Date.now()}-${cleanFileName(file.name)}`
      const { error: uploadError } = await supabase.storage
        .from('lumio-files')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        showToast('⚠️', `Upload failed: ${uploadError.message}`)
        continue
      }

      const textContent = file.type === 'text/plain' || /\.txt$/i.test(file.name)
        ? (await file.text()).slice(0, 120000)
        : null

      const { data, error } = await supabase.from('files').insert({
        user_id: profile.id,
        subject_id: subjectId || null,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        text_content: textContent,
      }).select().single()

      if (error) {
        showToast('⚠️', `File metadata failed: ${error.message}`)
        continue
      }

      if (data) saved.push(data)
    }

    if (saved.length) {
      setFiles(prev => [...saved, ...prev])
      showToast('📄', `${saved.length} file${saved.length > 1 ? 's' : ''} uploaded`)
    }
  }

  function fileSubject(file: FileRow) {
    return subjects.find(s => s.id === file.subject_id) ?? null
  }

  function fileContext(file: FileRow) {
    const subject = fileSubject(file)
    return file.text_content?.trim()
      ? `[${file.name}]\n${file.text_content}`
      : `File "${file.name}" (${file.mime_type}, ${file.size_bytes} bytes) was uploaded${subject ? ` for ${subject.name}` : ''}, but readable text has not been extracted. If the file is not TXT, ask the student to paste or extract text before generating detailed study material.`
  }

  async function aiFileSummary(file: FileRow) {
    const subject = fileSubject(file)
    const sys = 'Summarise the uploaded study file in 5 bullet points with **bold** key terms. If the file text is unavailable, explain that text extraction is needed.'
    const msg = `Summarise this ${subject ? `${subject.name} ` : ''}file:\n\n${fileContext(file)}`
    return callAI(sys, [{ role: 'user', content: msg }])
  }

  async function aiFilePracticeTest(file: FileRow) {
    const subject = fileSubject(file)
    const sys = 'Create a 5-question practice test from the uploaded study file. Include 3 short-answer questions, 1 multiple-choice question, 1 extended response, and an answer key. If text is unavailable, explain that text extraction is needed.'
    const msg = `Create a practice test for this ${subject ? `${subject.name} ` : ''}file:\n\n${fileContext(file)}`
    return callAI(sys, [{ role: 'user', content: msg }])
  }

  async function aiFileFlashcards(file: FileRow) {
    const subject = fileSubject(file)
    const sys = 'Return ONLY a valid JSON array with "front" and "back" string keys. Create 6 useful exam flashcards from the uploaded file. If text is unavailable, return one card explaining that text extraction is needed.'
    const msg = `Create flashcards for this ${subject ? `${subject.name} ` : ''}file:\n\n${fileContext(file)}`
    const raw = await callAI(sys, [{ role: 'user', content: msg }])
    const cards = JSON.parse(raw.replace(/```json|```/g, '').trim())
    const inserts = cards.map((c: any) => ({
      user_id: profile.id,
      subject_id: file.subject_id,
      subject_name: subject?.name ?? 'Uploaded File',
      front: c.front,
      back: c.back,
      due_date: today(),
    }))
    const { data: newCards } = await supabase.from('flashcards').insert(inserts).select()
    if (newCards) {
      setFlashcards(fcs => [...fcs, ...newCards])
      setFcCards(fcs => [...fcs, ...newCards])
    }
    await addTokens(10, 'Flashcards generated!')
    return cards.length
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // ── AI call ───────────────────────────────────
  async function callAI(system: string, messages: any[]): Promise<string> {
    if (trial.isExpired) {
      showToast('⏰', 'Trial ended — subscribe to keep using AI')
      throw new Error('Trial expired')
    }
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, maxTokens: 1200 }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'AI error')
    return data.text ?? ''
  }

  // ── AI chat ───────────────────────────────────
  function initAIGreeting() {
    setAiMsgs([{
      role: 'assistant',
      content: `Hey ${initProfile.name}! 👋 I'm your AI tutor. Ask me to explain concepts, quiz you, grade an essay, or build a study plan.`
    }])
  }

  async function sendAI(inp: string, mode: string) {
    if (!inp.trim()) return
    const newMsgs = [...aiMsgs, { role: 'user', content: inp }]
    setAiMsgs(newMsgs)
    setAiLoading(true)

    const systems: Record<string, string> = {
      tutor: `You are a friendly AI tutor for ${profile.name}, a student. Clear, encouraging explanations. Under 200 words.`,
      socratic: 'You are a Socratic tutor. NEVER give answers directly. Ask guiding questions.',
      quiz: 'You are a quiz master. Ask one question at a time. Give feedback then ask the next.',
      explain: 'Explain complex ideas simply with analogies. Under 150 words.',
    }

    try {
      const text = await callAI(systems[mode] ?? systems.tutor, newMsgs.slice(-12))
      setAiMsgs(msgs => [...msgs, { role: 'assistant', content: text }])
      await addTokens(2, 'AI session')
      await supabase.from('profiles').update({ essays_graded: profile.essays_graded }).eq('id', profile.id)
    } catch (e: any) {
      setAiMsgs(msgs => [...msgs, { role: 'assistant', content: `Error: ${e.message}` }])
    }
    setAiLoading(false)
  }

  // ── Assignments ───────────────────────────────
  async function saveAssignment(data: { title: string; subject_id: string; due_date: string; priority: string; notes: string }) {
    const { data: asgn } = await supabase.from('assignments').insert({
      user_id: profile.id,
      title: data.title,
      subject_id: data.subject_id || null,
      due_date: data.due_date || null,
      priority: data.priority as any,
      notes: data.notes,
    }).select().single()
    if (asgn) setAssignments(a => [asgn, ...a])
    showToast('✅', 'Assignment added!')
  }

  async function toggleAssignment(id: string) {
    const a = assignments.find(x => x.id === id)
    if (!a) return
    const updated = { ...a, done: !a.done }
    setAssignments(asgns => asgns.map(x => x.id === id ? updated : x))
    await supabase.from('assignments').update({ done: updated.done }).eq('id', id)
    if (updated.done) await addTokens(10, 'Assignment done!')
  }

  // ── Subjects ──────────────────────────────────
  async function saveSubject(data: { name: string; icon: string; color: string; target_grade: number }) {
    const { data: sub } = await supabase.from('subjects').insert({
      user_id: profile.id, ...data, notes: '', progress: 0,
    }).select().single()
    if (sub) { setSubjects(s => [...s, sub]) }
    showToast('📁', `${data.name} created!`)
  }

  // ── Flashcards ────────────────────────────────
  async function rateFC(rating: 'easy'|'hard'|'wrong') {
    if (!fcCards.length) return
    const card = fcCards[fcIdx]
    let { ease, interval_days, missed } = card

    if (rating === 'easy') { ease = Math.min(3, ease + 0.1); interval_days = Math.round(interval_days * ease); missed = Math.max(0, missed - 1) }
    else if (rating === 'hard') { interval_days = Math.max(1, Math.round(interval_days * 1.2)); ease = Math.max(1.3, ease - 0.1) }
    else { interval_days = 1; ease = Math.max(1.3, ease - 0.2); missed = missed + 1 }

    const nd = new Date(); nd.setDate(nd.getDate() + interval_days)
    const due_date = nd.toISOString().split('T')[0]

    await supabase.from('flashcards').update({ ease, interval_days, missed, due_date }).eq('id', card.id)

    if (rating === 'easy') {
      await addTokens(3, 'Card mastered!')
      await updateProfile({ fc_mastered: profile.fc_mastered + 1 })
    } else if (rating === 'hard') {
      await addTokens(1, 'Keep going!')
    }

    setFcFlipped(false)
    setFcIdx(i => (i + 1) % fcCards.length)
  }

  // ── Goals ─────────────────────────────────────
  async function saveGoal(data: { title: string; subject_name: string; target_grade: number; current_grade: number }) {
    const { data: goal } = await supabase.from('goals').insert({ user_id: profile.id, ...data }).select().single()
    if (goal) setGoals(g => [...g, goal])
    showToast('🎯', 'Goal added!')
  }

  // ── Pomodoro ──────────────────────────────────
  useEffect(() => {
    if (!pomoRunning) return
    const int = setInterval(async () => {
      setPomoSec(s => {
        if (s <= 1) {
          clearInterval(int)
          setPomoRunning(false)
          if (pomoMode === 'study') {
            setPomoCount(c => c + 1)
            addTokens(15, 'Pomodoro complete!')
            updateProfile({ pomo_sessions: profile.pomo_sessions + 1 })
            showToast('🍅', 'Pomodoro done! Take a break.')
          }
          return pomoMins * 60
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(int)
  }, [pomoRunning])

  // ── Shop ──────────────────────────────────────
  async function buyItem(itemId: string) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return
    if (profile.tokens < item.price) { showToast('💸', 'Not enough tokens!'); return }
    await supabase.from('inventory').insert({ user_id: profile.id, item_id: itemId, active: true })
    await updateProfile({ tokens: profile.tokens - item.price, tokens_spent: profile.tokens_spent + item.price })
    setInventory(inv => [...inv, itemId])
    showToast(item.icon, `${item.name} purchased!`)
  }

  // ── AI subject actions ─────────────────────────
  async function aiSummarise(sub: Subject, notes: string) {
    const sys = 'Summarise in 5 bullet points with **bold** key terms. Clear language for a high school student.'
    const msg = notes ? `Summarise for ${sub.name}:\n\n${notes}` : `General study summary for ${sub.name}.`
    return callAI(sys, [{ role: 'user', content: msg }])
  }

  async function aiFlashcards(sub: Subject, notes: string) {
    const sys = 'Return ONLY a valid JSON array with "front" and "back" string keys. No markdown.'
    const msg = `Create 6 flashcards for ${sub.name}${notes ? `:\n\n${notes}` : ''}`
    const raw = await callAI(sys, [{ role: 'user', content: msg }])
    const cards = JSON.parse(raw.replace(/```json|```/g, '').trim())
    const inserts = cards.map((c: any) => ({
      user_id: profile.id, subject_id: sub.id, subject_name: sub.name,
      front: c.front, back: c.back, due_date: today(),
    }))
    const { data: newCards } = await supabase.from('flashcards').insert(inserts).select()
    if (newCards) setFlashcards(fcs => [...fcs, ...newCards])
    await addTokens(10, 'Flashcards generated!')
    return cards.length
  }

  const lv = getLvl(profile.xp)
  const pendingCount = assignments.filter(a => !a.done).length

  // ── RENDER ─────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      {/* Trial banner */}
      {trial.isTrial && trial.daysLeft <= 5 && (
        <div style={{background:'rgba(248,200,66,.12)',borderBottom:'1px solid rgba(248,200,66,.25)',
          padding:'6px 20px',fontSize:12,color:'var(--gold)',textAlign:'center'}}>
          ⏳ {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} left in your free trial
        </div>
      )}
      {trial.isExpired && (
        <div style={{background:'rgba(255,112,67,.12)',borderBottom:'1px solid rgba(255,112,67,.25)',
          padding:'6px 20px',fontSize:12,color:'var(--warn)',textAlign:'center'}}>
          ⚠️ Your free trial has ended. Subscribe to keep using Lumio AI features.
        </div>
      )}

      {/* Topbar */}
      <div style={{height:48,background:'var(--panel)',borderBottom:'1px solid var(--line)',
        display:'flex',alignItems:'center',padding:'0 20px',gap:12,flexShrink:0}}>
        <div style={{fontFamily:'Syne, sans-serif',fontWeight:800,fontSize:16,letterSpacing:'-.3px'}}>
          Lumi<span style={{color:'var(--acc2)'}}>o</span>
        </div>
        <nav style={{display:'flex',gap:2,flex:1,marginLeft:8,overflowX:'auto'}}>
          {[
            ['dashboard','Dashboard','ti-layout-dashboard'],
            ['subjects','Subjects','ti-folders'],
            ['assignments','Assignments','ti-checkbox'],
            ['flashcards','Flashcards','ti-cards'],
            ['pomodoro','Pomodoro','ti-clock'],
            ['ai','AI Tutor','ti-sparkles'],
            ['goals','Goals','ti-target'],
            ['shop','Shop','ti-shopping-bag'],
          ].map(([pg, label, icon]) => (
            <button key={pg} onClick={() => setPage(pg)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',
                borderRadius:'var(--rs)',cursor:'pointer',fontSize:12,fontWeight:500,
                border:'none',fontFamily:'Inter, sans-serif',whiteSpace:'nowrap',
                color: page === pg ? 'var(--acc2)' : 'var(--t3)',
                background: page === pg ? 'var(--acc-glow)' : 'transparent'}}>
              <i className={`ti ${icon}`} style={{fontSize:14}} />
              {label}
              {pg === 'assignments' && pendingCount > 0 && (
                <span style={{background:'rgba(255,112,67,.25)',color:'var(--warn)',
                  fontSize:9,padding:'1px 5px',borderRadius:8,fontWeight:600}}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(248,200,66,.1)',
            border:'1px solid rgba(248,200,66,.2)',borderRadius:14,padding:'3px 10px',
            fontSize:11,fontWeight:500,color:'var(--gold)'}}>
            🪙 {profile.tokens}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(248,200,66,.1)',
            border:'1px solid rgba(248,200,66,.2)',borderRadius:14,padding:'3px 10px',
            fontSize:11,fontWeight:500,color:'var(--gold)'}}>
            🔥 {profile.streak}
          </div>
          <button onClick={() => setPage('settings')}
            style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',
              borderRadius:'var(--rs)',cursor:'pointer',background:'var(--card)',
              border:'1px solid var(--line2)',fontFamily:'Inter, sans-serif'}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'var(--acc-glow)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:11,fontWeight:700,color:'var(--acc2)'}}>
              {profile.name[0]?.toUpperCase()}
            </div>
            <span style={{fontSize:12,fontWeight:500}}>{profile.name}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:'auto',padding:'20px 24px'}}>

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <div>
            <div style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800,marginBottom:2}}>
                  {(() => { const h = new Date().getHours(); return `Good ${h<12?'morning':h<17?'afternoon':'evening'}, ${profile.name}! ${h<12?'☀️':h<17?'🌤️':'🌙'}` })()}
                </h2>
                <p style={{color:'var(--t2)',fontSize:12}}>
                  {pendingCount > 0 ? `${pendingCount} assignment${pendingCount>1?'s':''} pending` : 'All caught up! 🎉'}
                </p>
              </div>
              <button onClick={() => setPage('assignments')}
                style={{background:'var(--acc)',color:'#fff',border:'none',borderRadius:'var(--rs)',
                  padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
                + Add Assignment
              </button>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
              {[
                {l:'Tokens',v:profile.tokens,c:'var(--gold)'},
                {l:'Streak',v:profile.streak,c:'var(--warn)',s:'days'},
                {l:'FC Mastered',v:profile.fc_mastered,c:'var(--info)'},
                {l:'Done',v:assignments.filter(a=>a.done).length,c:'var(--ok)',s:`of ${assignments.length}`},
              ].map(s => (
                <div key={s.l} style={{background:'var(--card)',border:'1px solid var(--line)',
                  borderRadius:'var(--r)',padding:14}}>
                  <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:.4,marginBottom:5}}>{s.l}</div>
                  <div style={{fontFamily:'Syne, sans-serif',fontSize:22,fontWeight:700,color:s.c,marginBottom:1}}>{s.v}</div>
                  {s.s && <div style={{fontSize:11,color:'var(--t3)'}}>{s.s}</div>}
                </div>
              ))}
            </div>

            <FileDropzone
              title="Upload study files"
              subtitle="PDF, DOCX, TXT, PNG, JPG or JPEG"
              files={files.slice(0, 6)}
              subjects={subjects}
              onUpload={uploadStudyFiles}
              onSummary={aiFileSummary}
              onFlashcards={aiFileFlashcards}
              onPractice={aiFilePracticeTest}
            />

            {/* Level + Upcoming */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
                <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:12}}>Level Progress</div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}>
                  <span>Level {lv.l} — {lv.n}</span>
                  <span style={{color:'var(--t3)'}}>{profile.xp}/{lv.xp} XP</span>
                </div>
                <div style={{height:6,background:'var(--card2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'linear-gradient(90deg,var(--acc),var(--gold))',
                    borderRadius:4,width:`${lv.pct}%`,transition:'width .5s'}} />
                </div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:5}}>{lv.xp-profile.xp} XP to Level {lv.l+1}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:12}}>
                  {BADGES.map(b => (
                    <div key={b.id} style={{textAlign:'center',padding:'8px 4px',
                      background:'var(--card2)',borderRadius:'var(--rs)',
                      border:'1px solid var(--line)',
                      opacity:b.ok(profile,{doneTasks:assignments.filter(a=>a.done).length})?1:.2,
                      filter:b.ok(profile,{doneTasks:assignments.filter(a=>a.done).length})?'none':'grayscale(1)'}}>
                      <div style={{fontSize:18,marginBottom:3}}>{b.icon}</div>
                      <div style={{fontSize:9,color:'var(--t3)'}}>{b.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
                <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:12,
                  display:'flex',justifyContent:'space-between'}}>
                  Upcoming
                  <span style={{fontSize:11,color:'var(--acc2)',cursor:'pointer',fontWeight:400}}
                    onClick={() => setPage('assignments')}>All</span>
                </div>
                {assignments.filter(a=>!a.done).slice(0,4).length === 0
                  ? <div style={{color:'var(--t3)',fontSize:12,padding:'12px 0'}}>No pending assignments 🎉</div>
                  : assignments.filter(a=>!a.done).slice(0,4).map(a => (
                    <div key={a.id} onClick={() => toggleAssignment(a.id)}
                      style={{display:'flex',alignItems:'center',gap:9,padding:'8px 0',
                        borderBottom:'1px solid var(--line)',cursor:'pointer'}}>
                      <div style={{width:17,height:17,borderRadius:'50%',border:'1.5px solid var(--line2)',flexShrink:0}} />
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:500}}>{a.title}</div>
                        {a.due_date && <div style={{fontSize:10,color:'var(--t3)'}}>{a.due_date}</div>}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Subjects */}
            <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
              <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:12,
                display:'flex',justifyContent:'space-between'}}>
                Subjects
                <span style={{fontSize:11,color:'var(--acc2)',cursor:'pointer',fontWeight:400}}
                  onClick={() => setPage('subjects')}>Manage</span>
              </div>
              {subjects.length === 0
                ? <div style={{color:'var(--t3)',fontSize:12}}>No subjects yet — <span style={{color:'var(--acc2)',cursor:'pointer'}} onClick={() => setPage('subjects')}>add one</span></div>
                : <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(subjects.length,3)},1fr)`,gap:10}}>
                    {subjects.map(s => (
                      <div key={s.id} onClick={() => { setPage('subjects'); setCurSubject(s) }}
                        style={{background:'var(--card2)',border:'1px solid var(--line)',borderRadius:'var(--r)',
                          padding:12,cursor:'pointer',position:'relative',overflow:'hidden'}}>
                        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.color}} />
                        <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
                        <div style={{fontSize:12,fontWeight:600}}>{s.name}</div>
                        <div style={{fontSize:10,color:'var(--t3)'}}>
                          {assignments.filter(a=>a.subject_id===s.id&&!a.done).length} pending
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── ASSIGNMENTS ── */}
        {page === 'assignments' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800}}>Assignments</h2>
              <AssignmentForm subjects={subjects} onSave={saveAssignment} />
            </div>
            <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
              {assignments.length === 0
                ? <div style={{color:'var(--t3)',fontSize:12,textAlign:'center',padding:24}}>No assignments yet</div>
                : assignments.map(a => {
                    const daysLeft = a.due_date ? Math.ceil((new Date(a.due_date).getTime()-Date.now())/86400000) : null
                    return (
                      <div key={a.id} onClick={() => toggleAssignment(a.id)}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',
                          borderBottom:'1px solid var(--line)',cursor:'pointer',
                          borderLeft: a.priority==='high' ? '2px solid var(--warn)' :
                            a.priority==='low' ? '2px solid var(--ok)' : '2px solid var(--gold)',
                          paddingLeft:8}}>
                        <div style={{width:17,height:17,borderRadius:'50%',flexShrink:0,
                          border: a.done ? 'none' : '1.5px solid var(--line2)',
                          background: a.done ? 'var(--ok)' : 'transparent',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:9,color:'#000',fontWeight:700}}>
                          {a.done ? '✓' : ''}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500,
                            textDecoration:a.done?'line-through':'none',
                            color:a.done?'var(--t3)':'var(--t1)'}}>{a.title}</div>
                          <div style={{fontSize:11,color:'var(--t3)'}}>
                            {subjects.find(s=>s.id===a.subject_id)?.name ?? 'General'}
                            {a.notes ? ` · ${a.notes}` : ''}
                          </div>
                        </div>
                        {daysLeft !== null && (
                          <span style={{fontSize:10,padding:'2px 7px',borderRadius:12,fontWeight:600,
                            background: daysLeft < 0 ? 'rgba(255,112,67,.08)' :
                              daysLeft < 2 ? 'rgba(248,200,66,.1)' : 'rgba(45,212,160,.1)',
                            color: daysLeft < 0 ? 'var(--warn)' :
                              daysLeft < 2 ? 'var(--gold)' : 'var(--ok)'}}>
                            {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                          </span>
                        )}
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}

        {/* ── FLASHCARDS ── */}
        {page === 'flashcards' && (
          <FlashcardPage
            flashcards={fcCards}
            fcIdx={fcIdx}
            fcFlipped={fcFlipped}
            setFcFlipped={setFcFlipped}
            rateFC={rateFC}
          />
        )}

        {/* ── POMODORO ── */}
        {page === 'pomodoro' && (
          <PomodoroPage
            pomoSec={pomoSec} setPomoSec={setPomoSec}
            pomoRunning={pomoRunning} setPomoRunning={setPomoRunning}
            pomoMode={pomoMode} setPomoMode={setPomoMode}
            pomoMins={pomoMins} setPomoMins={setPomoMins}
            pomoCount={pomoCount}
          />
        )}

        {/* ── AI TUTOR ── */}
        {page === 'ai' && (
          <AIPage
            messages={aiMsgs}
            loading={aiLoading}
            onSend={sendAI}
            trialExpired={trial.isExpired}
          />
        )}

        {/* ── SUBJECTS ── */}
        {page === 'subjects' && (
          <SubjectsPage
            subjects={subjects}
            curSubject={curSubject}
            setCurSubject={setCurSubject}
            assignments={assignments}
            onSaveSubject={saveSubject}
            onAISummarise={aiSummarise}
            onAIFlashcards={aiFlashcards}
            files={files}
            onUploadFiles={uploadStudyFiles}
            onAIFileSummary={aiFileSummary}
            onAIFileFlashcards={aiFileFlashcards}
            onAIFilePractice={aiFilePracticeTest}
            userId={profile.id}
            showToast={showToast}
          />
        )}

        {/* ── GOALS ── */}
        {page === 'goals' && (
          <GoalsPage goals={goals} subjects={subjects} onSave={saveGoal} />
        )}

        {/* ── SHOP ── */}
        {page === 'shop' && (
          <ShopPage items={SHOP_ITEMS} tokens={profile.tokens} inventory={inventory} onBuy={buyItem} />
        )}

        {/* ── SETTINGS ── */}
        {page === 'settings' && (
          <SettingsPage
            profile={profile}
            themes={THEMES}
            accents={ACCENTS}
            onUpdateProfile={updateProfile}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:16,right:16,background:'var(--card)',
          border:'1px solid var(--line2)',borderRadius:'var(--rs)',padding:'9px 14px',
          fontSize:12,display:'flex',alignItems:'center',gap:8,zIndex:100,
          boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
          <span>{toast.icon}</span><span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileDropzone({
  title,
  subtitle,
  files,
  subjects = [],
  subjectId = null,
  onUpload,
  onSummary,
  onFlashcards,
  onPractice,
}: any) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [loadingAction, setLoadingAction] = useState('')
  const [output, setOutput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const targetSubjectId = subjectId ?? (selectedSubjectId || null)

  async function upload(list: FileList | null) {
    if (!list?.length) return
    setUploading(true)
    try {
      await onUpload(list, targetSubjectId)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function runFileAction(file: FileRow, action: 'flashcards' | 'summary' | 'practice') {
    const key = `${action}-${file.id}`
    setLoadingAction(key)
    setOutput('')
    try {
      if (action === 'flashcards') {
        const count = await onFlashcards(file)
        setOutput(`Created ${count} flashcards from ${file.name}.`)
      } else if (action === 'summary') {
        setOutput(await onSummary(file))
      } else {
        setOutput(await onPractice(file))
      }
    } catch (e: any) {
      setOutput(`Error: ${e.message}`)
    } finally {
      setLoadingAction('')
    }
  }

  return (
    <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:3}}>{title}</div>
          <div style={{fontSize:11,color:'var(--t3)'}}>{subtitle}</div>
        </div>
        {!subjectId && subjects.length > 0 && (
          <select value={selectedSubjectId} onChange={e=>setSelectedSubjectId(e.target.value)}
            style={{...inp,width:180,padding:'6px 9px',fontSize:12}}>
            <option value="">No subject</option>
            {subjects.map((s: Subject) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        )}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files) }}
        style={{border:`1px dashed ${dragging ? 'var(--acc)' : 'var(--line2)'}`,
          background:dragging ? 'var(--acc-glow)' : 'var(--card2)',borderRadius:'var(--rs)',
          padding:18,textAlign:'center',cursor:'pointer',transition:'all .15s'}}>
        <input ref={inputRef} type="file" multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg"
          onChange={e => upload(e.target.files)}
          style={{display:'none'}} />
        <div style={{fontSize:24,marginBottom:6}}>📄</div>
        <div style={{fontSize:12,fontWeight:600,color:'var(--t1)',marginBottom:3}}>
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </div>
        <div style={{fontSize:11,color:'var(--t3)'}}>PDF, DOCX, TXT, PNG, JPG, JPEG</div>
      </div>

      {files.length > 0 && (
        <div style={{display:'grid',gap:8,marginTop:12}}>
          {files.map((file: FileRow) => {
            const linkedSubject = subjects.find((s: Subject) => s.id === file.subject_id)
            return (
              <div key={file.id} style={{background:'var(--card2)',border:'1px solid var(--line)',borderRadius:'var(--rs)',padding:10}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:8}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.name}</div>
                    <div style={{fontSize:10,color:'var(--t3)'}}>
                      {formatBytes(file.size_bytes)} · {file.mime_type || 'file'}{linkedSubject ? ` · ${linkedSubject.name}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[
                    {label:'Generate flashcards', action:'flashcards' as const},
                    {label:'Generate summary notes', action:'summary' as const},
                    {label:'Generate practice test', action:'practice' as const},
                  ].map(item => (
                    <button key={item.action}
                      onClick={() => runFileAction(file, item.action)}
                      disabled={!!loadingAction}
                      style={{background:'transparent',color:'var(--t2)',border:'1px solid var(--line2)',
                        borderRadius:'var(--rs)',padding:'6px 9px',fontSize:11,cursor:'pointer',
                        fontFamily:'Inter, sans-serif',opacity:loadingAction && loadingAction !== `${item.action}-${file.id}` ? .45 : 1}}>
                      {loadingAction === `${item.action}-${file.id}` ? 'Working...' : item.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {output && (
        <div style={{marginTop:10,background:'var(--acc-glow)',border:'1px solid rgba(108,92,231,.2)',
          borderRadius:'var(--rs)',padding:12,fontSize:12,lineHeight:1.7,color:'var(--t2)'}}
          dangerouslySetInnerHTML={{__html:output.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>')}} />
      )}
    </div>
  )
}

function AssignmentForm({ subjects, onSave }: { subjects: Subject[], onSave: Function }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('med')
  const [notes, setNotes] = useState('')

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{background:'var(--acc)',color:'#fff',border:'none',borderRadius:'var(--rs)',
        padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
      + Add Assignment
    </button>
  )

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:50,
      display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={() => setOpen(false)}>
      <div style={{background:'var(--panel)',border:'1px solid var(--line2)',borderRadius:14,
        padding:22,width:400,maxWidth:'90vw'}} onClick={e => e.stopPropagation()}>
        <div style={{fontFamily:'Syne, sans-serif',fontSize:15,fontWeight:700,marginBottom:14}}>New Assignment</div>
        {[
          {label:'Title', el: <input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Essay on WW2" />},
          {label:'Subject', el: <select style={inp} value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">No subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</select>},
          {label:'Due Date', el: <input style={inp} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />},
          {label:'Priority', el: <select style={inp} value={priority} onChange={e=>setPriority(e.target.value)}><option value="high">🔴 High</option><option value="med">🟡 Medium</option><option value="low">🟢 Low</option></select>},
          {label:'Notes', el: <input style={inp} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional" />},
        ].map(f => (
          <div key={f.label} style={{marginBottom:11}}>
            <label style={{fontSize:11,color:'var(--t2)',marginBottom:4,display:'block',textTransform:'uppercase',letterSpacing:.3}}>{f.label}</label>
            {f.el}
          </div>
        ))}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:14}}>
          <button onClick={() => setOpen(false)} style={{...btn, background:'transparent',color:'var(--t2)',border:'1px solid var(--line2)'}}>Cancel</button>
          <button onClick={() => { if(title){onSave({title,subject_id:subjectId,due_date:dueDate,priority,notes});setOpen(false);setTitle('');} }} style={btn}>Add</button>
        </div>
      </div>
    </div>
  )
}

function FlashcardPage({ flashcards, fcIdx, fcFlipped, setFcFlipped, rateFC }: any) {
  const card = flashcards[fcIdx]
  if (!flashcards.length) return (
    <div style={{textAlign:'center',paddingTop:60,color:'var(--t3)'}}>
      <div style={{fontSize:40,marginBottom:12}}>📇</div>
      <p>No flashcards yet — go to a subject and generate some!</p>
    </div>
  )
  return (
    <div>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800,marginBottom:14}}>Flashcards</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div>
          <div style={{fontSize:10,color:'var(--t3)',marginBottom:8}}>Card {fcIdx+1} of {flashcards.length}</div>
          <div onClick={() => setFcFlipped(!fcFlipped)}
            style={{height:220,background: fcFlipped ? 'rgba(108,92,231,.08)' : 'var(--card2)',
              border:`1px solid ${fcFlipped ? 'rgba(108,92,231,.25)' : 'var(--line2)'}`,
              borderRadius:'var(--r)',display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',padding:24,textAlign:'center',cursor:'pointer',
              transition:'all .3s'}}>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:1,color:'var(--t3)',marginBottom:10}}>
              {fcFlipped ? 'Answer' : 'Question'}
            </div>
            <div style={{fontSize:16,fontWeight:500,lineHeight:1.5}}>
              {fcFlipped ? card.back : card.front}
            </div>
            {!fcFlipped && <div style={{fontSize:10,color:'var(--t3)',marginTop:8}}>Click to reveal</div>}
          </div>
          <div style={{display:'flex',gap:7,justifyContent:'center',marginTop:10}}>
            {[
              {r:'wrong',label:'✗ Missed',bg:'rgba(255,112,67,.12)',c:'var(--warn)'},
              {r:'hard',label:'△ Hard',bg:'rgba(248,200,66,.12)',c:'var(--gold)'},
              {r:'easy',label:'✓ Got it!',bg:'rgba(45,212,160,.12)',c:'var(--ok)'},
            ].map(b => (
              <button key={b.r} onClick={() => { if(!fcFlipped){setFcFlipped(true);return;} rateFC(b.r as any) }}
                style={{flex:1,maxWidth:100,padding:8,borderRadius:'var(--rs)',border:'none',
                  fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'Inter, sans-serif',
                  background:b.bg,color:b.c}}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
            <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:12}}>Weak Cards</div>
            {flashcards.filter((c:any)=>c.missed>0).sort((a:any,b:any)=>b.missed-a.missed).slice(0,5).map((c:any) => (
              <div key={c.id} style={{padding:'6px 0',borderBottom:'1px solid var(--line)',fontSize:11}}>
                <div style={{color:'var(--t1)'}}>{c.front.slice(0,50)}{c.front.length>50?'...':''}</div>
                <div style={{color:'var(--warn)',fontSize:10}}>Missed {c.missed}× · {c.subject_name}</div>
              </div>
            ))}
            {flashcards.filter((c:any)=>c.missed>0).length===0 &&
              <div style={{color:'var(--t3)',fontSize:11}}>No weak spots yet!</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function PomodoroPage({ pomoSec, setPomoSec, pomoRunning, setPomoRunning, pomoMode, setPomoMode, pomoMins, setPomoMins, pomoCount }: any) {
  const pct = pomoSec / (pomoMins * 60)
  const m = Math.floor(pomoSec/60), s = pomoSec%60
  const C = 414.7
  return (
    <div>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800,marginBottom:14}}>Pomodoro Timer</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,textAlign:'center'}}>
          <div style={{display:'flex',gap:5,justifyContent:'center',marginBottom:14}}>
            {[{m:'study',l:'Study 25m',mins:25},{m:'short',l:'Break 5m',mins:5},{m:'long',l:'Long 15m',mins:15}].map(b=>(
              <button key={b.m} onClick={()=>{setPomoMode(b.m);setPomoMins(b.mins);setPomoSec(b.mins*60);setPomoRunning(false);}}
                style={{padding:'4px 11px',borderRadius:12,border:'1px solid var(--line2)',background:pomoMode===b.m?'var(--acc)':'none',
                  color:pomoMode===b.m?'#fff':'var(--t3)',fontSize:11,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
                {b.l}
              </button>
            ))}
          </div>
          <svg width="148" height="148" viewBox="0 0 148 148" style={{transform:'rotate(-90deg)'}}>
            <circle cx="74" cy="74" r="66" fill="none" stroke="var(--card3)" strokeWidth="7" />
            <circle cx="74" cy="74" r="66" fill="none" stroke="var(--acc)" strokeWidth="7"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)} style={{transition:'stroke-dashoffset 1s linear'}} />
          </svg>
          <div style={{marginTop:-80,marginBottom:60}}>
            <div style={{fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800}}>{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</div>
            <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:.5}}>
              {pomoMode==='study'?'Study':pomoMode==='short'?'Short Break':'Long Break'}
            </div>
          </div>
          <div style={{display:'flex',gap:7,justifyContent:'center'}}>
            <button onClick={()=>setPomoRunning(!pomoRunning)}
              style={{background:'var(--acc)',color:'#fff',border:'none',borderRadius:'var(--rs)',
                padding:'7px 16px',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
              {pomoRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button onClick={()=>{setPomoRunning(false);setPomoSec(pomoMins*60);}}
              style={{background:'var(--card2)',color:'var(--t2)',border:'1px solid var(--line2)',
                borderRadius:'var(--rs)',padding:'7px 12px',fontSize:13,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
              ↺ Reset
            </button>
          </div>
          <div style={{marginTop:12,fontSize:11,color:'var(--t2)'}}>Sessions today: <strong style={{color:'var(--acc2)'}}>{pomoCount}</strong></div>
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
          <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:10}}>Tips</div>
          <div style={{fontSize:11,color:'var(--t2)',lineHeight:1.9}}>
            • 25-min focused work sprints<br/>• 5-min break after each session<br/>
            • Long break after 4 sessions<br/>• Each session earns <strong style={{color:'var(--gold)'}}>15 tokens</strong><br/>
            • Put your phone in another room!
          </div>
        </div>
      </div>
    </div>
  )
}

function AIPage({ messages, loading, onSend, trialExpired }: any) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('tutor')
  const msgsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if(msgsRef.current) msgsRef.current.scrollTop = 99999 }, [messages])

  function send() {
    if(!input.trim()) return
    onSend(input, mode)
    setInput('')
  }

  return (
    <div>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800,marginBottom:14}}>AI Tutor</h2>
      {trialExpired && (
        <div style={{background:'rgba(255,112,67,.1)',border:'1px solid rgba(255,112,67,.25)',
          borderRadius:'var(--rs)',padding:'10px 14px',fontSize:12,color:'var(--warn)',marginBottom:12}}>
          Your free trial has ended. Subscribe to keep using the AI tutor.
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14,alignItems:'start'}}>
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',gap:7,marginBottom:12,alignItems:'center'}}>
            <select value={mode} onChange={e=>setMode(e.target.value)}
              style={{flex:1,background:'var(--card2)',border:'1px solid var(--line2)',borderRadius:'var(--rs)',
                padding:'6px 10px',color:'var(--t1)',fontSize:12,outline:'none',fontFamily:'Inter, sans-serif'}}>
              <option value="tutor">🎓 General Tutor</option>
              <option value="socratic">🤔 Socratic Mode</option>
              <option value="quiz">📝 Quiz Me</option>
              <option value="explain">💡 Explain Simply</option>
            </select>
          </div>
          <div ref={msgsRef} style={{overflowY:'auto',maxHeight:320,display:'flex',flexDirection:'column',gap:8,padding:'8px 0'}}>
            {messages.map((m: any, i: number) => (
              <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
                <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',
                  justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,
                  background:m.role==='assistant'?'var(--acc-glow)':'rgba(45,212,160,.15)',
                  color:m.role==='assistant'?'var(--acc2)':'var(--ok)'}}>
                  {m.role==='assistant'?'AI':'U'}
                </div>
                <div style={{background:m.role==='user'?'var(--acc-glow)':'var(--card2)',
                  border:`1px solid ${m.role==='user'?'rgba(108,92,231,.2)':'var(--line)'}`,
                  borderRadius:'var(--rs)',padding:'8px 12px',fontSize:12,lineHeight:1.65,maxWidth:'84%'}}
                  dangerouslySetInnerHTML={{__html:m.content.replace(/\n/g,'<br/>')}} />
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'var(--acc-glow)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--acc2)'}}>AI</div>
                <div style={{color:'var(--t3)',fontSize:12,fontStyle:'italic'}}>Thinking…</div>
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:6,marginTop:10,paddingTop:10,borderTop:'1px solid var(--line)'}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Ask anything…" disabled={trialExpired}
              style={{flex:1,background:'var(--card2)',border:'1px solid var(--line2)',borderRadius:'var(--rs)',
                padding:'7px 12px',color:'var(--t1)',fontSize:12,outline:'none',fontFamily:'Inter, sans-serif'}} />
            <button onClick={send} disabled={loading||trialExpired}
              style={{background:'var(--acc)',color:'#fff',border:'none',borderRadius:'var(--rs)',
                padding:'7px 12px',fontSize:12,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
              Send
            </button>
          </div>
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:14}}>
          <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:10}}>Quick Prompts</div>
          {['Explain this simply: ','Quiz me on my subjects','Best memory techniques?','3 tips to stay focused'].map(p=>(
            <button key={p} onClick={()=>{setInput(p);}}
              style={{width:'100%',textAlign:'left',background:'transparent',border:'1px solid var(--line2)',
                borderRadius:'var(--rs)',padding:'7px 10px',color:'var(--t2)',fontSize:11,cursor:'pointer',
                marginBottom:5,fontFamily:'Inter, sans-serif'}}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubjectsPage({
  subjects,
  curSubject,
  setCurSubject,
  assignments,
  onSaveSubject,
  onAISummarise,
  onAIFlashcards,
  files,
  onUploadFiles,
  onAIFileSummary,
  onAIFileFlashcards,
  onAIFilePractice,
  userId,
  showToast,
}: any) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📖')
  const [color, setColor] = useState('#6c5ce7')
  const [notes, setNotes] = useState('')
  const [aiOut, setAiOut] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const COLORS = ['#6c5ce7','#2dd4a0','#ec4899','#38bdf8','#f8c842','#ff7043','#a78bfa']

  useEffect(() => {
    if (curSubject) setNotes(curSubject.notes ?? '')
  }, [curSubject])

  async function handleSummarise() {
    if (!curSubject) return
    setAiLoading(true); setAiOut('')
    try {
      const text = await onAISummarise(curSubject, notes)
      setAiOut(text)
    } catch(e: any) { setAiOut('Error: ' + e.message) }
    setAiLoading(false)
  }

  async function handleFlashcards() {
    if (!curSubject) return
    setAiLoading(true)
    try {
      const count = await onAIFlashcards(curSubject, notes)
      showToast('📇', `${count} flashcards created!`)
      setAiOut(`✅ ${count} flashcards created from ${curSubject.name}`)
    } catch(e: any) { setAiOut('Error: ' + e.message) }
    setAiLoading(false)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800}}>Subjects</h2>
        <button onClick={()=>setShowForm(!showForm)}
          style={{background:'var(--card2)',color:'var(--t2)',border:'1px solid var(--line2)',
            borderRadius:'var(--rs)',padding:'6px 13px',fontSize:12,cursor:'pointer',fontFamily:'Inter, sans-serif'}}>
          + New Subject
        </button>
      </div>

      {showForm && (
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              {l:'Name', el:<input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Biology" />},
              {l:'Emoji', el:<input style={{...inp,fontSize:20}} value={icon} onChange={e=>setIcon(e.target.value)} maxLength={2} />},
            ].map(f=>(
              <div key={f.l}><label style={{fontSize:11,color:'var(--t2)',marginBottom:4,display:'block',textTransform:'uppercase',letterSpacing:.3}}>{f.l}</label>{f.el}</div>
            ))}
          </div>
          <div style={{margin:'10px 0 8px'}}>
            <label style={{fontSize:11,color:'var(--t2)',marginBottom:6,display:'block',textTransform:'uppercase',letterSpacing:.3}}>Colour</label>
            <div style={{display:'flex',gap:7}}>
              {COLORS.map(c=>(
                <div key={c} onClick={()=>setColor(c)}
                  style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',
                    border: color===c ? '2px solid #fff' : '2px solid transparent'}} />
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{...btn,background:'transparent',color:'var(--t2)',border:'1px solid var(--line2)'}}>Cancel</button>
            <button onClick={()=>{if(name){onSaveSubject({name,icon,color,target_grade:80});setShowForm(false);setName('');setIcon('📖');}}} style={btn}>Create</button>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {subjects.map((s: Subject) => (
          <div key={s.id} onClick={()=>setCurSubject(curSubject?.id===s.id?null:s)}
            style={{background:'var(--card)',border:`1px solid ${curSubject?.id===s.id?'var(--acc)':'var(--line)'}`,
              borderRadius:'var(--r)',padding:14,cursor:'pointer',position:'relative',overflow:'hidden',
              transition:'all .15s'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.color}} />
            <div style={{fontSize:22,marginBottom:7}}>{s.icon}</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{s.name}</div>
            <div style={{fontSize:11,color:'var(--t3)'}}>
              {assignments.filter((a: Assignment)=>a.subject_id===s.id&&!a.done).length} pending
            </div>
          </div>
        ))}
        {subjects.length === 0 && <div style={{gridColumn:'1/-1',color:'var(--t3)',fontSize:12,padding:20,textAlign:'center'}}>No subjects yet — create one above</div>}
      </div>

      {curSubject && (
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:14}}>
            <div style={{width:3,height:32,borderRadius:2,background:curSubject.color}} />
            <div style={{fontFamily:'Syne, sans-serif',fontSize:16,fontWeight:700}}>{curSubject.icon} {curSubject.name}</div>
          </div>
          <FileDropzone
            title="Upload subject files"
            subtitle="Attach files to this subject and turn them into study material"
            files={files.filter((f: FileRow) => f.subject_id === curSubject.id)}
            subjectId={curSubject.id}
            onUpload={onUploadFiles}
            onSummary={onAIFileSummary}
            onFlashcards={onAIFileFlashcards}
            onPractice={onAIFilePractice}
          />
          <label style={{fontSize:11,color:'var(--t2)',marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:.3}}>Notes</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            style={{...inp,minHeight:120,resize:'vertical'} as any}
            placeholder="Paste notes, textbook content, or study material here..." />
          <div style={{display:'flex',gap:7,marginTop:8}}>
            {[
              {l:'✨ Summarise',fn:handleSummarise},
              {l:'📇 Flashcards',fn:handleFlashcards},
            ].map(b=>(
              <button key={b.l} onClick={b.fn} disabled={aiLoading}
                style={{background:'var(--card2)',color:'var(--t2)',border:'1px solid var(--line2)',
                  borderRadius:'var(--rs)',padding:'6px 12px',fontSize:12,cursor:'pointer',
                  fontFamily:'Inter, sans-serif',display:'flex',alignItems:'center',gap:5}}>
                {aiLoading ? <span style={{width:12,height:12,border:'2px solid rgba(108,92,231,.2)',borderTopColor:'var(--acc)',borderRadius:'50%',display:'inline-block',animation:'sp .6s linear infinite'}} /> : null}
                {b.l}
              </button>
            ))}
          </div>
          {aiOut && (
            <div style={{marginTop:10,background:'var(--acc-glow)',border:'1px solid rgba(108,92,231,.2)',
              borderRadius:'var(--rs)',padding:12,fontSize:12,lineHeight:1.7,color:'var(--t2)'}}
              dangerouslySetInnerHTML={{__html:aiOut.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>')}} />
          )}
        </div>
      )}
    </div>
  )
}

function GoalsPage({ goals, subjects, onSave }: any) {
  const [title, setTitle] = useState('')
  const [subjectName, setSubjectName] = useState('General')
  const [target, setTarget] = useState(90)
  const [current, setCurrent] = useState(0)

  return (
    <div>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800,marginBottom:14}}>Goals</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
          <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:12}}>My Goals</div>
          {goals.length === 0
            ? <div style={{color:'var(--t3)',fontSize:12}}>No goals yet — set a target grade!</div>
            : goals.map((g: Goal) => {
                const pct = Math.min(100, Math.round((g.current_grade/g.target_grade)*100))
                const col = pct>=100?'var(--ok)':pct>=70?'var(--gold)':'var(--acc)'
                return (
                  <div key={g.id} style={{padding:'10px 0',borderBottom:'1px solid var(--line)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}>
                      <span style={{fontWeight:500}}>{g.title} <span style={{color:'var(--t3)',fontWeight:400}}>{g.subject_name}</span></span>
                      <span style={{color:col}}>{g.current_grade}% / {g.target_grade}%</span>
                    </div>
                    <div style={{height:5,background:'var(--card2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,background:col,width:`${pct}%`,transition:'width .4s'}} />
                    </div>
                  </div>
                )
              })
          }
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
          <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:12}}>Add Goal</div>
          {[
            {l:'Goal',el:<input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Get 90% in Biology" />},
            {l:'Subject',el:<select style={inp} value={subjectName} onChange={e=>setSubjectName(e.target.value)}><option>General</option>{subjects.map((s:Subject)=><option key={s.id}>{s.name}</option>)}</select>},
            {l:'Target (%)',el:<input style={inp} type="number" value={target} onChange={e=>setTarget(+e.target.value)} min={0} max={100} />},
            {l:'Current (%)',el:<input style={inp} type="number" value={current} onChange={e=>setCurrent(+e.target.value)} min={0} max={100} />},
          ].map(f=>(
            <div key={f.l} style={{marginBottom:10}}>
              <label style={{fontSize:11,color:'var(--t2)',marginBottom:4,display:'block',textTransform:'uppercase',letterSpacing:.3}}>{f.l}</label>
              {f.el}
            </div>
          ))}
          <button onClick={()=>{if(title){onSave({title,subject_name:subjectName,target_grade:target,current_grade:current});setTitle('');}}} style={{...btn,width:'100%',justifyContent:'center'}}>Add Goal</button>
        </div>
      </div>
    </div>
  )
}

function ShopPage({ items, tokens, inventory, onBuy }: any) {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800}}>Rewards Shop</h2>
        <div style={{background:'rgba(248,200,66,.1)',border:'1px solid rgba(248,200,66,.2)',
          borderRadius:14,padding:'4px 12px',fontSize:12,fontWeight:600,color:'var(--gold)'}}>
          🪙 {tokens} tokens
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {items.map((item: any) => {
          const owned = inventory.includes(item.id)
          const can = tokens >= item.price
          return (
            <div key={item.id} style={{background:'var(--card2)',border:`1px solid ${owned?'rgba(45,212,160,.25)':'var(--line)'}`,
              borderRadius:'var(--r)',padding:14,textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:6}}>{item.icon}</div>
              <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{item.name}</div>
              <div style={{fontSize:11,color:'var(--t3)',marginBottom:8,lineHeight:1.4}}>{item.desc}</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:3,background:'rgba(248,200,66,.1)',
                color:'var(--gold)',borderRadius:12,padding:'2px 9px',fontSize:11,fontWeight:600,marginBottom:7}}>
                🪙 {item.price}
              </div>
              <br/>
              {owned
                ? <span style={{fontSize:11,color:'var(--ok)'}}>✓ Owned</span>
                : <button onClick={()=>onBuy(item.id)} disabled={!can}
                    style={{...btn,opacity:can?1:.4}}>Buy</button>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SettingsPage({ profile, themes, accents, onUpdateProfile, onLogout }: any) {
  const [name, setName] = useState(profile.name)

  return (
    <div>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:21,fontWeight:800,marginBottom:14}}>Settings</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div>
          <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:12}}>
            <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:10}}>Theme</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {Object.entries(themes).map(([key, th]: any) => (
                <div key={key} onClick={()=>onUpdateProfile({theme:key})}
                  style={{textAlign:'center',cursor:'pointer'}}>
                  <div style={{width:36,height:36,borderRadius:'50%',margin:'0 auto 4px',
                    background:`linear-gradient(135deg,${th['--bg']},${th['--card']})`,
                    border: profile.theme===key ? '2px solid #fff' : '2px solid transparent',
                    transition:'border .15s'}}>
                    {profile.theme===key && <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'var(--acc2)'}}>✓</div>}
                  </div>
                  <div style={{fontSize:10,color:'var(--t3)',textTransform:'capitalize'}}>{key}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
            <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:10}}>Accent Colour</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {accents.map((ac: any, i: number) => (
                <div key={ac.name} onClick={()=>onUpdateProfile({accent_idx:i})}
                  style={{width:28,height:28,borderRadius:'50%',background:ac.acc,cursor:'pointer',
                    border: profile.accent_idx===i ? '2px solid #fff' : '2px solid transparent',
                    transition:'border .15s'}} title={ac.name} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:12}}>
            <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:10}}>Account</div>
            <div style={{fontSize:12,color:'var(--t2)',marginBottom:12}}>{profile.email}</div>
            <label style={{fontSize:11,color:'var(--t2)',marginBottom:4,display:'block',textTransform:'uppercase',letterSpacing:.3}}>Display Name</label>
            <input style={{...inp,marginBottom:10}} value={name} onChange={e=>setName(e.target.value)} />
            <button onClick={()=>onUpdateProfile({name})} style={{...btn,width:'100%',justifyContent:'center',marginBottom:8}}>Save Name</button>
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16}}>
            <div style={{fontFamily:'Syne, sans-serif',fontSize:13,fontWeight:700,marginBottom:10}}>Session</div>
            <button onClick={onLogout}
              style={{width:'100%',background:'rgba(255,112,67,.08)',border:'1px solid rgba(255,112,67,.2)',
                borderRadius:'var(--rs)',padding:8,color:'var(--warn)',fontSize:12,cursor:'pointer',
                fontFamily:'Inter, sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────
const inp: React.CSSProperties = {
  width:'100%',background:'var(--card2)',border:'1px solid var(--line2)',borderRadius:'var(--rs)',
  padding:'8px 12px',color:'var(--t1)',fontSize:13,outline:'none',fontFamily:'Inter, sans-serif',
}

const btn: React.CSSProperties = {
  display:'inline-flex',alignItems:'center',gap:5,background:'var(--acc)',color:'#fff',border:'none',
  borderRadius:'var(--rs)',padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'Inter, sans-serif',
}
