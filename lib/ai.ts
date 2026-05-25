// Server-side AI provider routing
// API key is stored server-side in env — never exposed to browser

export type AIProvider = 'anthropic' | 'deepseek' | 'openai' | 'gemini' | 'openrouter'

export interface AIRequest {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens?: number
}

export interface AIResponse {
  text: string
  provider: AIProvider
  model: string
}

function getProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.DEEPSEEK_API_KEY)  return 'deepseek'
  if (process.env.OPENAI_API_KEY)    return 'openai'
  if (process.env.GEMINI_API_KEY)    return 'gemini'
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  throw new Error('No AI API key configured. Add one to your Vercel environment variables.')
}

function isComplexTask(system: string, messages: AIRequest['messages']): boolean {
  const text = `${system} ${messages.map(m => m.content).join(' ')}`.toLowerCase()
  return text.includes('grade this essay') ||
    text.includes('study plan') || text.includes('day-by-day') ||
    text.includes('socratic') || text.includes('extended response') ||
    text.includes('analyse') || text.includes('analyze')
}

async function callAnthropic(req: AIRequest): Promise<AIResponse> {
  const key = process.env.ANTHROPIC_API_KEY!
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: req.maxTokens ?? 1200,
      system: req.system,
      messages: req.messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return {
    text: data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') ?? '',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
  }
}

async function callDeepSeek(req: AIRequest): Promise<AIResponse> {
  const key = process.env.DEEPSEEK_API_KEY!
  const complex = isComplexTask(req.system, req.messages)
  const model = complex ? 'deepseek-v4-pro' : 'deepseek-v4-flash'
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: req.system }, ...req.messages],
      max_tokens: req.maxTokens ?? 1200,
      stream: false,
      ...(complex
        ? { thinking: { type: 'enabled' }, reasoning_effort: 'high' }
        : { thinking: { type: 'disabled' } }),
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { text: data.choices?.[0]?.message?.content ?? '', provider: 'deepseek', model }
}

async function callOpenAI(req: AIRequest): Promise<AIResponse> {
  const key = process.env.OPENAI_API_KEY!
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: req.system }, ...req.messages],
      max_tokens: req.maxTokens ?? 1200,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { text: data.choices?.[0]?.message?.content ?? '', provider: 'openai', model: 'gpt-4o-mini' }
}

async function callGemini(req: AIRequest): Promise<AIResponse> {
  const key = process.env.GEMINI_API_KEY!
  const model = 'gemini-2.0-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: req.maxTokens ?? 1200 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return {
    text: data.candidates?.flatMap((c: any) => c.content?.parts ?? []).map((p: any) => p.text ?? '').join('') ?? '',
    provider: 'gemini',
    model,
  }
}

export async function callAI(req: AIRequest): Promise<AIResponse> {
  const provider = getProvider()
  switch (provider) {
    case 'anthropic':  return callAnthropic(req)
    case 'deepseek':   return callDeepSeek(req)
    case 'openai':     return callOpenAI(req)
    case 'gemini':     return callGemini(req)
    default: throw new Error(`Provider ${provider} not implemented`)
  }
}
