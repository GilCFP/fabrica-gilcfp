import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Eye,
  Copy,
  Check,
  X,
  Monitor,
  Globe,
  User,
  Calendar,
  Tag,
  Flame,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { fetchScripts, copyScript, type Script } from '../api/client'

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ─── Types ─── */
interface DisplayScript {
  id: string
  title: string
  hook: string
  body: string
  cta: string
  format: string
  source: string
  creator: string
  category: string
  hookType: 'Padrao' | 'Impactante' | 'Urgente'
  priority: 'High' | 'Medium' | 'Low'
}

/* ─── Map API script to display script ─── */
function mapScript(s: Script): DisplayScript {
  return {
    id: String(s.id),
    title: s.title,
    hook: s.hook,
    body: s.body,
    cta: s.cta,
    format: s.visual_format || s.content_format || 'Reel',
    source: s.source_usa || 'EUA',
    creator: s.source_usa || '@creator',
    category: s.category,
    hookType: 'Impactante',
    priority: 'High',
  }
}

const categories = ['Todas', 'Ferramentas', 'Workflows', 'Mindset', 'Cases', 'Trends']

const categoryBadgeColors: Record<string, string> = {
  Ferramentas: 'bg-[rgba(6,182,212,0.15)] text-[#06B6D4]',
  Workflows: 'bg-[rgba(124,58,237,0.15)] text-[#7C3AED]',
  Mindset: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]',
  Cases: 'bg-[rgba(16,185,129,0.15)] text-[#10B981]',
  Trends: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]',
}

const hookBadgeColors: Record<string, string> = {
  'Padrao': 'bg-[#262626] text-[#A1A1AA]',
  'Impactante': 'bg-[rgba(124,58,237,0.15)] text-[#7C3AED]',
  'Urgente': 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]',
}

const PAGE_SIZE = 9

/* ─── Script Detail Drawer ─── */
function ScriptDrawer({ script, onClose }: { script: DisplayScript; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyScript = useCallback(() => {
    const fullText = `${script.title}\n\nHOOK:\n${script.hook}\n\nROTEIRO:\n${script.body}\n\nCTA:\n${script.cta}`
    navigator.clipboard.writeText(fullText).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [script])

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
        className="relative w-full max-w-[520px] h-full bg-[#1A1A1A] border-l border-[#27272A] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] z-10 px-6 py-5 border-b border-[#27272A] flex items-start justify-between">
          <div>
            <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${categoryBadgeColors[script.category] || 'bg-[#262626] text-[#A1A1AA]'}`}>
              {script.category}
            </span>
            <h2 className="text-xl font-semibold text-white mt-2 leading-tight">{script.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors flex-shrink-0 ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Hook */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <label className="text-[10px] font-semibold uppercase text-[#7C3AED] tracking-wider">Hook</label>
            <div className="mt-2 p-4 bg-[#262626] rounded-lg border-l-[3px] border-[#7C3AED]">
              <p className="text-sm text-white italic">&ldquo;{script.hook}&rdquo;</p>
            </div>
          </motion.div>

          {/* Body */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <label className="text-[10px] font-semibold uppercase text-[#71717A] tracking-wider">Roteiro</label>
            <div className="mt-2 p-4 bg-[#262626] rounded-lg">
              <p className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-line">{script.body}</p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <label className="text-[10px] font-semibold uppercase text-[#10B981] tracking-wider">Call to Action</label>
            <div className="mt-2 p-4 bg-[#262626] rounded-lg border-l-[3px] border-[#10B981]">
              <p className="text-sm text-white">{script.cta}</p>
            </div>
          </motion.div>

          {/* Meta */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="pt-4 border-t border-[#27272A]">
            <div className="grid grid-cols-2 gap-3">
              <MetaItem icon={Monitor} label="Formato" value={script.format} />
              <MetaItem icon={Globe} label="Fonte" value={`${script.creator} (${script.source})`} />
              <MetaItem icon={User} label="Criador Original" value={script.creator} />
              <MetaItem icon={Calendar} label="Data" value="Jan 2026" />
              <MetaItem icon={Tag} label="Categoria" value={script.category} />
              <MetaItem icon={Flame} label="Prioridade" value={script.priority} priority={script.priority} />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#27272A] px-6 py-4 flex gap-3">
          <button
            onClick={copyScript}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar Roteiro Completo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function MetaItem({ icon: Icon, label, value, priority }: { icon: typeof Monitor; label: string; value: string; priority?: string }) {
  const colorClass = priority === 'High' ? 'text-[#EF4444]' : priority === 'Medium' ? 'text-[#F59E0B]' : 'text-white'
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-[#71717A] flex-shrink-0" />
      <div>
        <p className="text-[10px] text-[#71717A]">{label}</p>
        <p className={`text-xs font-medium ${colorClass}`}>{value}</p>
      </div>
    </div>
  )
}

/* ─── Script Card ─── */
function ScriptCard({ script, index, onView }: { script: DisplayScript; index: number; onView: (s: DisplayScript) => void }) {
  const [copied, setCopied] = useState(false)

  const copyScript = useCallback(async () => {
    try {
      const result = await copyScriptAPI(Number(script.id))
      const fullText = `${result.title || script.title}\n\nHOOK:\n${result.hook || script.hook}\n\nROTEIRO:\n${result.body || script.body}\n\nCTA:\n${result.cta || script.cta}`
      navigator.clipboard.writeText(fullText).catch(() => {})
    } catch {
      // Fallback: copy without API
      const fullText = `${script.title}\n\nHOOK:\n${script.hook}\n\nROTEIRO:\n${script.body}\n\nCTA:\n${script.cta}`
      navigator.clipboard.writeText(fullText).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [script])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: (index % PAGE_SIZE) * 0.04, ease: easeSmooth }}
      layout
      className="bg-[#1A1A1A] border border-[#27272A] rounded-xl overflow-hidden hover:border-[rgba(124,58,237,0.4)] hover:bg-[#262626] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={() => onView(script)}
    >
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${hookBadgeColors[script.hookType] || hookBadgeColors['Padrao']}`}>
          {script.hookType}
        </span>
        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${categoryBadgeColors[script.category] || 'bg-[#262626] text-[#A1A1AA]'}`}>
          {script.category}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 group-hover:text-[#7C3AED] transition-colors">
          {script.title}
        </h3>
        <p className="text-sm text-[#A1A1AA] mt-2 line-clamp-2 italic">&ldquo;{script.hook}&rdquo;</p>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#27272A]" />

      {/* Meta */}
      <div className="px-4 py-2.5 flex items-center gap-4 text-xs text-[#71717A]">
        <span className="flex items-center gap-1"><Monitor size={14} /> {script.format.split(',')[0]}</span>
        <span className="flex items-center gap-1"><Globe size={14} /> {script.creator}</span>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[#27272A] flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onView(script) }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-xs text-[#A1A1AA] hover:border-[rgba(124,58,237,0.4)] transition-colors"
        >
          <Eye size={14} /> Ver Roteiro
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); copyScript() }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all ${
            copied
              ? 'bg-[rgba(16,185,129,0.15)] border-[#10B981] text-[#10B981]'
              : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:border-[rgba(124,58,237,0.4)]'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </motion.div>
  )
}

// Rename to avoid conflict with imported copyScript
const copyScriptAPI = copyScript

/* ─── Main Roteiros Page ─── */
export default function Roteiros() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('categoria') || 'Todas')
  const [selectedScript, setSelectedScript] = useState<DisplayScript | null>(null)
  const [page, setPage] = useState(0)

  // API state
  const [scripts, setScripts] = useState<DisplayScript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Load scripts from API
  const loadScripts = useCallback(async (category?: string, searchTerm?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchScripts(category, searchTerm)
      const mapped = (data.scripts || []).map(mapScript)
      setScripts(mapped)
      setTotalCount(data.count || 0)
    } catch (err) {
      console.error('Error fetching scripts:', err)
      setError('Erro ao carregar roteiros. Tente novamente.')
      setScripts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadScripts()
  }, [loadScripts])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (search) params.set('q', search)
      else params.delete('q')
      if (activeCategory !== 'Todas') params.set('categoria', activeCategory)
      else params.delete('categoria')
      setSearchParams(params)

      // Fetch from API
      loadScripts(
        activeCategory !== 'Todas' ? activeCategory : undefined,
        search || undefined
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [search, activeCategory])

  const setCategory = (cat: string) => {
    setActiveCategory(cat)
    setPage(0)
  }

  // Client-side pagination on loaded data
  const totalPages = Math.ceil(scripts.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const paginated = scripts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // Category counts from loaded data
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todas: scripts.length }
    scripts.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1
    })
    return counts
  }, [scripts])

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: easeSmooth }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Banco de Roteiros</h1>
          <span className="text-xs bg-[rgba(124,58,237,0.15)] text-[#7C3AED] px-2.5 py-1 rounded font-medium">
            {loading ? '...' : `${totalCount} roteiro${totalCount !== 1 ? 's' : ''} pronto${totalCount !== 1 ? 's' : ''}`}
          </span>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all shadow-glow">
          <Plus size={16} /> Novo Roteiro
        </button>
      </motion.div>

      {/* Filter Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: easeSmooth }} className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            placeholder="Buscar roteiros..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full h-9 pl-9 pr-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-[#262626] text-[#A1A1AA] border-[#27272A] hover:border-[rgba(124,58,237,0.4)] hover:text-white'
              }`}
            >
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-[#7C3AED] animate-spin" />
          <span className="ml-3 text-sm text-[#A1A1AA]">Carregando roteiros...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-20">
          <p className="text-lg text-[#EF4444] mb-2">{error}</p>
          <button
            onClick={() => loadScripts(activeCategory !== 'Todas' ? activeCategory : undefined, search || undefined)}
            className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Results count */}
      {!loading && !error && (search || activeCategory !== 'Todas') && (
        <p className="text-sm text-[#71717A] mb-4">
          {scripts.length} resultado{scripts.length !== 1 ? 's' : ''}
          {search ? ` para "${search}"` : ''}
          {activeCategory !== 'Todas' ? ` em ${activeCategory}` : ''}
        </p>
      )}

      {/* Grid */}
      {!loading && !error && (
        <AnimatePresence mode="popLayout">
          {paginated.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence>
                {paginated.map((script, i) => (
                  <ScriptCard key={script.id} script={script} index={i} onView={setSelectedScript} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Search size={48} className="mx-auto text-[#333333] mb-4" />
              <p className="text-lg text-[#71717A]">Nenhum roteiro encontrado</p>
              <p className="text-sm text-[#52525B] mt-1">Tente ajustar seus filtros</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-1 px-3 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-xs text-[#A1A1AA] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                i === currentPage
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#262626] text-[#A1A1AA] hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-xs text-[#A1A1AA] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Proxima <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedScript && (
          <ScriptDrawer script={selectedScript} onClose={() => setSelectedScript(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
