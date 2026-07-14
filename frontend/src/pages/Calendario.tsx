import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  CalendarDays,
  FileText,
  CheckCircle,
  Monitor,
  Images,
  MessageSquare,
  Instagram,
  Linkedin,
  Pencil,
  Trash2,
  Send,
  Loader2,
} from 'lucide-react'
import { fetchCalendar, createCalendarEvent, type CalendarEvent as ApiCalendarEvent } from '../api/client'

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ─── Types ─── */
interface CalendarEvent {
  id: string
  day: number
  title: string
  platform: 'Instagram' | 'LinkedIn'
  format: 'Reel' | 'Carrossel' | 'Thread'
  status: 'scheduled' | 'draft' | 'published'
  scriptRef?: string
}

/* ─── Map API event to display event ─── */
function mapEvent(e: ApiCalendarEvent): CalendarEvent {
  let day = e.day || 1
  if (e.date) {
    try {
      day = new Date(e.date).getDate()
    } catch {
      day = e.day || 1
    }
  }
  return {
    id: String(e.id),
    day,
    title: e.title,
    platform: (e.platform as 'Instagram' | 'LinkedIn') || 'Instagram',
    format: (e.format as 'Reel' | 'Carrossel' | 'Thread') || 'Reel',
    status: (e.status as 'scheduled' | 'draft' | 'published') || 'scheduled',
    scriptRef: e.scriptRef,
  }
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: 'scheduled' | 'draft' | 'published' }) {
  const styles = {
    scheduled: 'bg-[rgba(124,58,237,0.15)] text-[#7C3AED]',
    draft: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]',
    published: 'bg-[rgba(16,185,129,0.15)] text-[#10B981]',
  }
  const labels = { scheduled: 'Agendado', draft: 'Rascunho', published: 'Publicado' }
  return (
    <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

/* ─── Format color ─── */
const formatColors = {
  Reel: '#7C3AED',
  Carrossel: '#06B6D4',
  Thread: '#10B981',
}

/* ─── Day names ─── */
const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const monthNames = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/* ─── Content Detail Drawer ─── */
function EventDrawer({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const statusSteps = [
    { label: 'Ideia', date: 'Criado em 5 Jan', done: true },
    { label: 'Producao', date: event.status === 'published' ? 'Concluido em 7 Jan' : 'Em producao', done: event.status !== 'draft' },
    { label: 'Publicacao', date: event.status === 'published' ? 'Publicado em 8 Jan as 18:00' : `Agendado para ${event.day} Jan as 18:00`, done: event.status === 'published' },
  ]

  const formatIcons = { Reel: Monitor, Carrossel: Images, Thread: MessageSquare }
  const FormatIcon = formatIcons[event.format]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: easeSmooth }}
        className="relative w-full max-w-[480px] h-full bg-[#1A1A1A] border-l border-[#27272A] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#27272A] flex items-start justify-between">
          <div>
            <StatusBadge status={event.status} />
            <h2 className="text-xl font-semibold text-white mt-2">
              {dayNames[new Date(2026, 0, event.day).getDay()]}, {event.day} de Janeiro
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors flex-shrink-0 ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Format & Platform */}
          <div className="flex gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#262626] text-xs font-medium text-white border-l-[3px]" style={{ borderLeftColor: formatColors[event.format] }}>
              <FormatIcon size={14} /> {event.format}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#262626] text-xs text-[#A1A1AA]">
              {event.platform === 'Instagram' ? <Instagram size={14} /> : <Linkedin size={14} />}
              {event.platform}
            </span>
          </div>

          {/* Title */}
          <div className="mt-6">
            <label className="text-[10px] font-semibold uppercase text-[#71717A] tracking-wider">Titulo do Conteudo</label>
            <h3 className="text-lg font-semibold text-white mt-1">{event.title}</h3>
          </div>

          {/* Script preview */}
          <div className="mt-6">
            <label className="text-[10px] font-semibold uppercase text-[#71717A] tracking-wider">Roteiro / Conteudo</label>
            <div className="mt-2 p-4 bg-[#262626] rounded-lg">
              <p className="text-sm text-[#A1A1AA]">
                {event.scriptRef || `Roteiro baseado no topico "${event.title}". Clique para ver o roteiro completo no banco de roteiros.`}
              </p>
              <button className="text-xs text-[#7C3AED] mt-2 hover:underline">Ver roteiro completo &rarr;</button>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-6 pt-5 border-t border-[#27272A]">
            <label className="text-[10px] font-semibold uppercase text-[#71717A] tracking-wider">Timeline</label>
            <div className="mt-4 space-y-4">
              {statusSteps.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.done ? 'bg-[#10B981]' : 'bg-[#262626] border border-[#27272A]'
                    }`}>
                      {step.done ? <Check size={14} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-[#52525B]" />}
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`w-0.5 h-6 mt-1 ${step.done ? 'bg-[#10B981]' : 'bg-[#27272A]'}`} />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-sm font-medium ${step.done ? 'text-white' : 'text-[#71717A]'}`}>{step.label}</p>
                    <p className="text-xs text-[#71717A]">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#27272A] px-6 py-4 flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-xs text-[#A1A1AA] hover:text-white transition-colors">
            <Pencil size={14} /> Editar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] rounded-lg text-xs transition-colors">
            <Trash2 size={14} /> Excluir
          </button>
          {event.status !== 'published' && (
            <button className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-xs font-medium hover:brightness-110 transition-all">
              <Send size={14} /> Publicar Agora
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Add Content Modal ─── */
function AddContentModal({ preselectedDay, onClose, onSave, currentYear, currentMonth }: {
  preselectedDay?: number;
  onClose: () => void;
  onSave: (data: object) => void;
  currentYear: number;
  currentMonth: number;
}) {
  const [selectedFormat, setSelectedFormat] = useState<'Reel' | 'Carrossel' | 'Thread'>('Reel')
  const [selectedPlatform, setSelectedPlatform] = useState<'Instagram' | 'LinkedIn'>('Instagram')
  const [selectedStatus, setSelectedStatus] = useState<'scheduled' | 'draft'>('scheduled')
  const [title, setTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    preselectedDay
      ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(preselectedDay).padStart(2, '0')}`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`
  )
  const [saving, setSaving] = useState(false)

  const formats: { key: 'Reel' | 'Carrossel' | 'Thread'; icon: typeof Monitor; color: string }[] = [
    { key: 'Reel', icon: Monitor, color: '#7C3AED' },
    { key: 'Carrossel', icon: Images, color: '#06B6D4' },
    { key: 'Thread', icon: MessageSquare, color: '#10B981' },
  ]

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const eventData = {
        title: title.trim(),
        date: selectedDate,
        platform: selectedPlatform,
        format: selectedFormat,
        status: selectedStatus,
      }
      await onSave(eventData)
      onClose()
    } catch (err) {
      console.error('Error saving event:', err)
    } finally {
      setSaving(false)
    }
  }, [title, selectedDate, selectedPlatform, selectedFormat, selectedStatus, onSave, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: easeSmooth }}
        className="relative w-full max-w-[520px] max-h-[80vh] bg-[#1A1A1A] border border-[#27272A] rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#27272A] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Novo Conteudo</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5 overflow-y-auto">
          {/* Date */}
          <div>
            <label className="text-xs text-[#71717A] block mb-1.5">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 px-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-[#71717A] block mb-1.5">Titulo</label>
            <input
              type="text"
              placeholder="Titulo do conteudo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Format */}
          <div>
            <label className="text-xs text-[#71717A] block mb-2">Formato</label>
            <div className="flex gap-2">
              {formats.map((f) => {
                const Icon = f.icon
                const isSelected = selectedFormat === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFormat(f.key)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? `bg-[${f.color}26] border-[${f.color}] text-white`
                        : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:text-white'
                    }`}
                    style={isSelected ? { backgroundColor: `${f.color}26`, borderColor: f.color } : {}}
                  >
                    <Icon size={14} /> {f.key}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="text-xs text-[#71717A] block mb-2">Plataforma</label>
            <div className="flex gap-2">
              {(['Instagram', 'LinkedIn'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedPlatform === p
                      ? 'bg-[#262626] border-[#7C3AED] text-white'
                      : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {p === 'Instagram' ? <Instagram size={14} /> : <Linkedin size={14} />}
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-[#71717A] block mb-2">Status</label>
            <div className="flex gap-2">
              {[
                { key: 'scheduled' as const, label: 'Agendado', dot: '#7C3AED' },
                { key: 'draft' as const, label: 'Rascunho', dot: '#F59E0B' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSelectedStatus(s.key)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedStatus === s.key
                      ? 'bg-[#262626] border-[#7C3AED] text-white'
                      : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272A] flex gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-[#A1A1AA] hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Calendar Day Cell ─── */
function DayCell({ day, events, isToday, onEventClick, onAddClick }: {
  day: number
  events: CalendarEvent[]
  isToday: boolean
  onEventClick: (e: CalendarEvent) => void
  onAddClick: (day: number) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`min-h-[100px] md:min-h-[120px] p-2 bg-[#1A1A1A] transition-colors relative ${hovered ? 'bg-[#262626]' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Day Number */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${isToday ? 'bg-[#7C3AED] text-white px-2 py-0.5 rounded-full text-xs' : 'text-[#A1A1AA]'}`}>
          {day}
        </span>
        {hovered && events.length === 0 && (
          <button
            onClick={() => onAddClick(day)}
            className="text-[#71717A] hover:text-[#7C3AED] transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Events */}
      <div className="space-y-1">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className="w-full text-left p-1 rounded bg-[rgba(38,38,38,0.6)] hover:bg-[#262626] hover:translate-x-0.5 transition-all duration-150 border-l-[3px]"
            style={{ borderLeftColor: formatColors[event.format] }}
          >
            <p className="text-[10px] font-medium text-white truncate leading-tight">{event.title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {event.platform === 'Instagram' ? (
                <Instagram size={8} className="text-[#71717A]" />
              ) : (
                <Linkedin size={8} className="text-[#71717A]" />
              )}
              <span className="text-[8px] text-[#71717A]">{event.platform}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function Calendario() {
  const [currentMonth, setCurrentMonth] = useState(0) // January 2026
  const [currentYear, setCurrentYear] = useState(2026)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDay, setAddDay] = useState<number | undefined>()

  // API state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load calendar events from API
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // API expects 1-indexed month
      const data = await fetchCalendar(currentMonth + 1, currentYear)
      const mapped = (data.events || []).map(mapEvent)
      setCalendarEvents(mapped)
    } catch (err) {
      console.error('Error loading calendar events:', err)
      setError('Erro ao carregar eventos do calendario.')
      setCalendarEvents([])
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear])

  // Load on mount and when month/year changes
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Save new event
  const handleSaveEvent = useCallback(async (data: object) => {
    try {
      await createCalendarEvent(data)
      await loadEvents() // Reload after creating
    } catch (err) {
      console.error('Error creating event:', err)
      throw err
    }
  }, [loadEvents])

  // Calendar grid computation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {}
    calendarEvents.forEach((e) => {
      if (!map[e.day]) map[e.day] = []
      map[e.day].push(e)
    })
    return map
  }, [calendarEvents])

  const prevMonth = useCallback(() => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
    else setCurrentMonth((m) => m - 1)
  }, [currentMonth])

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else setCurrentMonth((m) => m + 1)
  }, [currentMonth])

  const goToToday = useCallback(() => {
    setCurrentMonth(0)
    setCurrentYear(2026)
  }, [])

  // Summary stats
  const scheduled = calendarEvents.filter((e) => e.status === 'scheduled').length
  const drafts = calendarEvents.filter((e) => e.status === 'draft').length
  const published = calendarEvents.filter((e) => e.status === 'published').length

  const handleAddClick = useCallback((day: number) => {
    setAddDay(day)
    setShowAddModal(true)
  }, [])

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: easeSmooth }} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Calendario Editorial</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            {loading ? 'Carregando...' : `${monthNames[currentMonth]} de ${currentYear} &bull; ${calendarEvents.length} eventos`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-9 h-9 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-base font-semibold text-white min-w-[140px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button onClick={nextMonth} className="w-9 h-9 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-xs text-[#A1A1AA] hover:text-white transition-colors">
            Hoje
          </button>
          <button
            onClick={() => { setAddDay(undefined); setShowAddModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
          >
            <Plus size={16} /> Novo Conteudo
          </button>
        </div>
      </motion.div>

      {/* Summary Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: easeSmooth }} className="bg-[#1A1A1A] border border-[#27272A] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-xs text-[#7C3AED]">
            <CalendarDays size={14} /> <span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> {scheduled} agendados
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
            <FileText size={14} /> <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> {drafts} rascunhos
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#10B981]">
            <CheckCircle size={14} /> <span className="w-2 h-2 rounded-full bg-[#10B981]" /> {published} publicados
          </span>
        </div>
        <div className="flex items-center gap-4">
          {([
            { label: 'Reel', color: '#7C3AED' },
            { label: 'Carrossel', color: '#06B6D4' },
            { label: 'Thread', color: '#10B981' },
          ] as const).map((f) => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: f.color }} />
              <span className="text-[10px] text-[#71717A]">{f.label}</span>
            </span>
          ))}
          <div className="w-px h-4 bg-[#27272A]" />
          <span className="flex items-center gap-1 text-[10px] text-[#71717A]"><Instagram size={10} /> Instagram</span>
          <span className="flex items-center gap-1 text-[10px] text-[#71717A]"><Linkedin size={10} /> LinkedIn</span>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-[#7C3AED] animate-spin" />
          <span className="ml-3 text-sm text-[#A1A1AA]">Carregando calendario...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-16">
          <p className="text-lg text-[#EF4444] mb-3">{error}</p>
          <button
            onClick={() => loadEvents()}
            className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Day Headers */}
          <div className="grid grid-cols-7">
            {dayNames.map((d, i) => (
              <div
                key={d}
                className={`py-3 text-center text-[10px] font-semibold uppercase tracking-wider ${
                  i === 0 || i === 6 ? 'text-[#52525B]' : 'text-[#71717A]'
                } bg-[#262626]`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-px bg-[#27272A]">
            {/* Empty cells before start */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] md:min-h-[120px] p-2 bg-[#1A1A1A]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const isToday = day === 8 // January 8 is "today"
              const events = eventsByDay[day] || []
              return (
                <DayCell
                  key={day}
                  day={day}
                  events={events}
                  isToday={isToday}
                  onEventClick={setSelectedEvent}
                  onAddClick={handleAddClick}
                />
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Event Drawer */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>

      {/* Add Content Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddContentModal
            preselectedDay={addDay}
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveEvent}
            currentYear={currentYear}
            currentMonth={currentMonth}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
