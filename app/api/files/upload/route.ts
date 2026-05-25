import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const MAX_TEXT_CHARS = 120000

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

function fileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function isAllowedFile(file: File) {
  const allowedTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
  ])
  return allowedTypes.has(file.type) || /^(pdf|docx|txt|png|jpg|jpeg)$/.test(fileExt(file.name))
}

async function extractPdfText(buffer: Buffer) {
  const mod = await import('pdf-parse')
  const pdfParse = (mod as any).default ?? mod
  const parsed = await pdfParse(buffer)
  return String(parsed.text ?? '').trim()
}

async function extractDocxText(buffer: Buffer) {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return String(result.value ?? '').trim()
}

async function extractText(file: File, buffer: Buffer) {
  const ext = fileExt(file.name)

  if (file.type === 'text/plain' || ext === 'txt') {
    return { text: (await file.text()).trim(), warning: '' }
  }

  if (file.type === 'application/pdf' || ext === 'pdf') {
    const text = await extractPdfText(buffer)
    if (!text) throw new Error('No readable text found in this PDF. If it is scanned, OCR will be needed first.')
    return { text, warning: '' }
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
    const text = await extractDocxText(buffer)
    if (!text) throw new Error('No readable text found in this DOCX file.')
    return { text, warning: '' }
  }

  if (file.type.startsWith('image/') || /^(png|jpg|jpeg)$/.test(ext)) {
    return { text: '', warning: 'Image uploaded. OCR is not implemented yet, so no readable text was saved.' }
  }

  throw new Error('Unsupported file type.')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file')
    const subjectIdRaw = form.get('subjectId')
    const subjectId = typeof subjectIdRaw === 'string' && subjectIdRaw ? subjectIdRaw : null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })
    }
    if (!isAllowedFile(file)) {
      return NextResponse.json({ error: `${file.name} is not a supported file type.` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { text, warning } = await extractText(file, buffer)
    const storagePath = `${user.id}/${subjectId || 'dashboard'}/${Date.now()}-${cleanFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from('lumio-files')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 400 })
    }

    const { data, error } = await supabase.from('files').insert({
      user_id: user.id,
      subject_id: subjectId,
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      storage_path: storagePath,
      text_content: text ? text.slice(0, MAX_TEXT_CHARS) : null,
    }).select().single()

    if (error) {
      await supabase.storage.from('lumio-files').remove([storagePath])
      return NextResponse.json({ error: `File metadata failed: ${error.message}` }, { status: 400 })
    }

    return NextResponse.json({ file: data, warning })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'File upload failed.' }, { status: 422 })
  }
}
