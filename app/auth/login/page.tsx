'use client'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Lumi<span style={{color:'var(--acc2)'}}>o</span></div>
        <div style={styles.sub}>Study smarter, not harder.</div>

        <button onClick={handleGoogle} style={styles.googleBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{marginRight:8}}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}><span>or</span></div>

        <form onSubmit={handleLogin}>
          {error && <div style={styles.err}>{error}</div>}
          <div style={styles.fg}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div style={styles.fg}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.foot}>
          No account? <Link href="/auth/register" style={{color:'var(--acc2)'}}>Start your free 14-day trial</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    background:'radial-gradient(circle at 30% 30%, rgba(108,92,231,.12), transparent 55%), var(--bg)' },
  card: { width:380, maxWidth:'92vw', background:'var(--panel)', border:'1px solid var(--line2)',
    borderRadius:16, padding:32 },
  logo: { fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:26, textAlign:'center', marginBottom:4 },
  sub: { fontSize:12, color:'var(--t3)', textAlign:'center', marginBottom:24 },
  googleBtn: { width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
    background:'var(--card2)', border:'1px solid var(--line2)', borderRadius:'var(--rs)',
    padding:'9px 14px', color:'var(--t1)', fontSize:13, fontWeight:500, cursor:'pointer',
    marginBottom:16, fontFamily:'Inter, sans-serif' },
  divider: { textAlign:'center', color:'var(--t3)', fontSize:12, margin:'12px 0',
    borderTop:'1px solid var(--line)', position:'relative', lineHeight:0 },
  err: { background:'rgba(255,112,67,.1)', border:'1px solid rgba(255,112,67,.3)',
    borderRadius:'var(--rs)', padding:'8px 12px', fontSize:12, color:'var(--warn)', marginBottom:12 },
  fg: { marginBottom:12 },
  label: { fontSize:11, color:'var(--t2)', marginBottom:4, display:'block',
    textTransform:'uppercase', letterSpacing:0.3 },
  input: { width:'100%', background:'var(--card2)', border:'1px solid var(--line2)',
    borderRadius:'var(--rs)', padding:'8px 12px', color:'var(--t1)', fontSize:13, outline:'none',
    fontFamily:'Inter, sans-serif' },
  btn: { width:'100%', background:'var(--acc)', color:'#fff', border:'none',
    borderRadius:'var(--rs)', padding:'10px', fontSize:14, fontWeight:600, cursor:'pointer',
    fontFamily:'Inter, sans-serif', marginTop:4 },
  foot: { textAlign:'center', fontSize:11, color:'var(--t3)', marginTop:16 },
}
