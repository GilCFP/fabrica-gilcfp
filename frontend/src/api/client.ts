const API_BASE = ''

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

/* ─── Scripts ─── */
export interface Script {
  id: number
  title: string
  hook: string
  body: string
  cta: string
  cta_keyword: string
  category: string
  content_format: string
  visual_format: string
  source_usa: string
  adaptation_note: string
  caption: string
  hashtags: string
  created_at: string
  times_copied: number
}

export async function fetchScripts(category?: string, search?: string) {
  const params = new URLSearchParams()
  if (category && category !== 'Todas') params.set('category', category.toLowerCase())
  if (search) params.set('search', search)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/scripts/${query}`) as Promise<{ scripts: Script[]; count: number }>
}

export async function copyScript(id: number) {
  return apiFetch(`/api/scripts/${id}/copy`, { method: 'POST' }) as Promise<Partial<Script>>
}

/* ─── Trends ─── */
export interface Trend {
  id: number
  title: string
  source: string
  channel: string
  url: string
  summary: string
  brazil_adaptation: string
  adaptation_angle: string
  suggested_format: string
  priority_score: number
  scraped_at: string
}

export async function fetchTrends() {
  return apiFetch('/api/trends/') as Promise<{
    trends: Trend[]
    count: number
    sources_monitored: number
  }>
}

export async function refreshTrends() {
  return apiFetch('/api/trends/refresh', { method: 'POST' }) as Promise<{
    trends: Trend[]
    count: number
    sources_monitored: number
  }>
}

/* ─── Videos ─── */
export interface VideoHistoryItem {
  id: number
  filename: string
  status: string
  size: string
  duration: string
  time: string
  error?: string
}

export interface ScheduleVideoPayload {
  event_date: string
  platform: 'instagram' | 'linkedin'
  content_format: 'reel_30' | 'reel_60' | 'carrossel'
}

export async function uploadVideo(file: File, settings: object) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('settings', JSON.stringify(settings))
  const res = await fetch('/api/videos/upload', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ id: number; status: string; message: string }>
}

export async function getVideoStatus(id: number) {
  const data = (await apiFetch(`/api/videos/${id}/status`)) as {
    id: number
    status: string
    file_size_mb: number
    duration_seconds: number
    error_message: string
    created_at: string
  }

  // Map backend status to frontend pipeline steps.
  // 'uploaded' is the pre-processing state; 'processing' is honest and shows
  // step 0 as current with a low, fixed progress until the backend completes.
  const stepOrder = ['transcription', 'cuts', 'jumpcuts', 'subtitles', 'export']
  const statusIndex =
    data.status === 'completed' ? 5 : data.status === 'uploaded' ? 0 : 0

  const steps = stepOrder.map((id, i) => {
    if (i < statusIndex) return { id, name: id, status: 'completed' as const }
    if (i === statusIndex) return { id, name: id, status: 'current' as const }
    return { id, name: id, status: 'pending' as const }
  })

  const progress =
    data.status === 'completed'
      ? 100
      : data.status === 'uploaded'
        ? 5
        : data.status === 'processing'
          ? 15
          : 0

  return {
    status: data.status,
    progress,
    steps,
  }
}

export function downloadVideo(id: number) {
  return `/api/videos/${id}/download`
}

export function previewVideo(id: number) {
  return `/api/videos/${id}/preview`
}

export async function scheduleVideo(id: number, data: ScheduleVideoPayload) {
  return apiFetch(`/api/videos/${id}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<{ id: number; message: string; video_id: number }>
}

export async function attachVideoToEvent(eventId: number, videoId: number) {
  return apiFetch(`/api/calendar/${eventId}/attach-video/${videoId}`, {
    method: 'POST',
  }) as Promise<{ message: string; event_id: number; video_id: number }>
}

export async function listVideos() {
  const data = (await apiFetch('/api/videos/')) as {
    videos: Array<{
      id: number
      filename: string
      status: string
      file_size_mb: number
      duration_seconds: number
      error_message: string
      created_at: string
    }>
  }

  const videos: VideoHistoryItem[] = (data.videos || []).map((v) => ({
    id: v.id,
    filename: v.filename,
    status: v.status,
    size: `${v.file_size_mb.toFixed(1)} MB`,
    duration: `${Math.floor(v.duration_seconds / 60)}:${String(v.duration_seconds % 60).padStart(2, '0')}`,
    time: v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '',
    error: v.error_message || undefined,
  }))

  return { videos }
}

/* ─── Calendar ─── */
export interface CalendarEvent {
  id: number
  day?: number
  date?: string
  title: string
  platform: string
  format: string
  status: string
  scriptRef?: string
  video_id?: number
}

export async function fetchCalendar(month: number, year: number) {
  const data = (await apiFetch(`/api/calendar/?month=${month}&year=${year}`)) as {
    events: Array<{
      id: number
      title: string
      event_date: string
      content_format: string
      platform: string
      status: string
      script_id: number | null
      video_id: number | null
      processed_at: string | null
      notes: string
    }>
    summary: object
  }

  const events: CalendarEvent[] = (data.events || []).map((e) => ({
    id: e.id,
    date: e.event_date,
    title: e.title,
    platform: e.platform,
    format: e.content_format,
    status: e.status,
    scriptRef: e.notes || undefined,
    video_id: e.video_id || undefined,
  }))

  return { events, summary: data.summary }
}

export async function createCalendarEvent(data: object) {
  // Map frontend field names to backend expected fields
  const payload = data as any
  const body = {
    title: payload.title,
    event_date: payload.date ? new Date(payload.date).toISOString() : new Date().toISOString(),
    platform: payload.platform || 'instagram',
    content_format: payload.format?.toLowerCase() || 'reel_30',
    status: payload.status || 'scheduled',
    notes: '',
  }
  return apiFetch('/api/calendar/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
