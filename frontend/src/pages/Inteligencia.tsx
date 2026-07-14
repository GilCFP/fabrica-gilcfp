import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  Globe,
  Clock,
  Search,
  Play,
  Mail,
  AtSign,
  Rss,
  ChevronDown,
  Copy,
  Check,
  FilePlus,
  ExternalLink,
  ArrowDownUp,
  Brain,
  Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { fetchTrends, refreshTrends, type Trend } from '../api/client'

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ─── Types ─── */
interface Topic {
  id: number
  title: string
  source: string
  sourceLabel: string
  date: string
  score: number
  summary: string
  adaptationAngle: string
  rationale: string
  formatSuggestion: string
  sourceType: 'youtube' | 'newsletter' | 'twitter' | 'blog'
}

/* ─── Map API trend to display topic ─── */
function mapTrend(t: Trend): Topic {
  const sourceType = inferSourceType(t.source)
  return {
    id: t.id,
    title: t.title,
    source: t.channel || t.source,
    sourceLabel: inferSourceLabel(t.source),
    date: formatDate(t.scraped_at),
    score: t.priority_score || 70,
    summary: t.summary || '',
    adaptationAngle: t.adaptation_angle || t.brazil_adaptation || '',
    rationale: t.brazil_adaptation || '',
    formatSuggestion: t.suggested_format || 'Reel 30s',
    sourceType,
  }
}

function inferSourceType(source: string): 'youtube' | 'newsletter' | 'twitter' | 'blog' {
  const s = source.toLowerCase()
  if (s.includes('youtube') || s.includes('video')) return 'youtube'
  if (s.includes('newsletter') || s.includes('email')) return 'newsletter'
  if (s.includes('twitter') || s.includes('x') || s.includes('@')) return 'twitter'
  return 'blog'
}

function inferSourceLabel(source: string): string {
  const s = source.toLowerCase()
  if (s.includes('youtube') || s.includes('video')) return 'YouTube'
  if (s.includes('newsletter') || s.includes('email')) return 'Newsletter'
  if (s.includes('twitter') || s.includes('x') || s.includes('@')) return 'Twitter/X'
  return 'Blogs'
}

function formatDate(scrapedAt: string): string {
  if (!scrapedAt) return 'Recente'
  try {
    const date = new Date(scrapedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Agora'
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Ontem'
    if (diffDays <= 7) return `${diffDays} dias`
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  } catch {
    return 'Recente'
  }
}

/* ─── Source Config ─── */
const sourceConfig: Record<string, { icon: typeof Play; bg: string; color: string; dot: string }> = {
  youtube: { icon: Play, bg: 'bg-[rgba(239,68,68,0.1)]', color: 'text-[#EF4444]', dot: '#EF4444' },
  newsletter: { icon: Mail, bg: 'bg-[rgba(245,158,11,0.1)]', color: 'text-[#F59E0B]', dot: '#F59E0B' },
  twitter: { icon: AtSign, bg: 'bg-[rgba(100,100,100,0.1)]', color: 'text-[#A1A1AA]', dot: '#A1A1AA' },
  blog: { icon: Rss, bg: 'bg-[rgba(16,185,129,0.1)]', color: 'text-[#10B981]', dot: '#10B981' },
}

const sourceFilters = [
  { key: 'Todas', label: 'Todas' },
  { key: 'youtube', label: 'YouTube', dot: '#EF4444' },
  { key: 'newsletter', label: 'Newsletter', dot: '#F59E0B' },
  { key: 'twitter', label: 'Twitter/X', dot: '#A1A1AA' },
  { key: 'blog', label: 'Blogs', dot: '#10B981' },
]

/* ─── Score Badge ─── */
function ScoreBadge({ score }: { score: number }) {
  const style = score >= 80
    ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
    : score >= 50
    ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
    : 'bg-[#262626] text-[#71717A]'
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md w-12 text-center inline-block ${style}`}>
      {score}
    </span>
  )
}

/* ─── Topic Row ─── */
function TopicRow({ topic, expanded, onToggle }: { topic: Topic; expanded: boolean; onToggle: () => void }) {
  const config = sourceConfig[topic.sourceType]
  const Icon = config.icon
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const copyAdaptation = useCallback(() => {
    const text = `Angulo: ${topic.adaptationAngle}\nPor que funciona no BR: ${topic.rationale}\nFormato: ${topic.formatSuggestion}`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [topic])

  return (
    <div className="border-b border-[#27272A] last:border-b-0">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#262626] ${expanded ? 'bg-[#1A1A1A]' : ''}`}
      >
        {/* Source Icon */}
        <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={config.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{topic.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-[#A1A1AA]">{topic.source}</span>
            <span className="text-[10px] text-[#52525B]">&bull;</span>
            <span className="text-[10px] text-[#52525B]">{topic.date}</span>
          </div>
        </div>

        {/* Score */}
        <ScoreBadge score={topic.score} />

        {/* Chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-[#71717A]" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeSmooth }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-[72px]">
              {/* Summary */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <label className="text-[10px] font-semibold uppercase text-[#71717A] tracking-wider">Resumo</label>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mt-1">{topic.summary}</p>
              </motion.div>

              {/* Adaptation Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 pt-4 border-t border-[#27272A]"
              >
                <label className="text-[10px] font-semibold uppercase text-[#7C3AED] tracking-wider">Adaptacao para o Brasil</label>
                <div className="mt-2 p-4 bg-[#262626] rounded-lg border-l-[3px] border-[#7C3AED]">
                  <p className="text-sm text-white font-medium">{topic.adaptationAngle}</p>
                  <p className="text-xs text-[#A1A1AA] mt-1.5">{topic.rationale}</p>
                  <p className="text-xs text-[#71717A] mt-1.5">Formato recomendado: {topic.formatSuggestion}</p>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-3 flex gap-2">
                <button
                  onClick={copyAdaptation}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    copied
                      ? 'bg-[rgba(16,185,129,0.15)] border-[#10B981] text-[#10B981]'
                      : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:border-[rgba(124,58,237,0.4)]'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar Adaptacao'}
                </button>
                <button
                  onClick={() => navigate('/roteiros')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#7C3AED] text-white rounded-lg text-xs font-medium hover:brightness-110 transition-all"
                >
                  <FilePlus size={14} /> Criar Roteiro
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-[#A1A1AA] hover:text-white hover:bg-[#262626] rounded-lg text-xs transition-colors">
                  <ExternalLink size={14} /> Ver Fonte
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Main Page ─── */
export default function Inteligencia() {
  const [search, setSearch] = useState('')
  const [activeSource, setActiveSource] = useState('Todas')
  const [sortBy, setSortBy] = useState('relevancia')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastScan, setLastScan] = useState('ha alguns segundos')

  // API state
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourcesMonitored, setSourcesMonitored] = useState(24)

  // Load trends from API
  const loadTrends = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrends()
      const mapped = (data.trends || []).map(mapTrend)
      setTopics(mapped)
      setSourcesMonitored(data.sources_monitored || 24)
      setLastScan('há alguns segundos')
    } catch (err) {
      console.error('Error fetching trends:', err)
      setError('Erro ao carregar tendencias. Tente novamente.')
      setTopics([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadTrends()
  }, [loadTrends])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshTrends()
      await loadTrends()
      setLastScan('há alguns segundos')
    } catch (err) {
      console.error('Error refreshing trends:', err)
      setError('Erro ao atualizar tendencias.')
    } finally {
      setRefreshing(false)
    }
  }, [loadTrends])

  const filtered = useMemo(() => {
    let result = [...topics]

    // Source filter
    if (activeSource !== 'Todas') {
      result = result.filter((t) => t.sourceType === activeSource)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.adaptationAngle.toLowerCase().includes(q) ||
          t.source.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (sortBy) {
      case 'data':
        result.sort((a, b) => {
          const order = ['Ontem', '2 dias', '3 dias', '4 dias', '5 dias', '6 dias', '1 semana']
          return order.indexOf(a.date) - order.indexOf(b.date)
        })
        break
      case 'score-desc':
        result.sort((a, b) => b.score - a.score)
        break
      case 'score-asc':
        result.sort((a, b) => a.score - b.score)
        break
      default:
        // Relevancia: default mixed order
        break
    }

    return result
  }, [activeSource, search, sortBy, topics])

  const sourceCounts = useMemo(() => {
    const counts = { youtube: 0, newsletter: 0, twitter: 0, blog: 0 }
    topics.forEach((t) => { counts[t.sourceType]++ })
    return counts
  }, [topics])

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: easeSmooth }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inteligencia de Conteudo</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Tendencias dos EUA adaptadas para o Brasil</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-70"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Buscando...' : 'Atualizar Tendencias'}
        </button>
      </motion.div>

      {/* Summary Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: easeSmooth }} className="bg-[#1A1A1A] border border-[#27272A] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#06B6D4]" />
            <span className="text-sm text-white">{sourcesMonitored} fontes monitoradas</span>
          </div>
          <div className="w-px h-6 bg-[#27272A]" />
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#71717A]" />
            <span className="text-xs text-[#71717A]">Ultimo scan: {lastScan}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        </div>
        <div className="flex gap-2.5">
          {[
            { label: 'YouTube', count: sourceCounts.youtube, color: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]' },
            { label: 'Newsletter', count: sourceCounts.newsletter, color: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]' },
            { label: 'Twitter/X', count: sourceCounts.twitter, color: 'bg-[rgba(10,10,10,0.5)] text-[#A1A1AA] border border-[#27272A]' },
            { label: 'Blogs', count: sourceCounts.blog, color: 'bg-[rgba(16,185,129,0.15)] text-[#10B981]' },
          ].map((s) => (
            <span key={s.label} className={`text-xs px-2.5 py-1 rounded-md ${s.color}`}>
              {s.label} {s.count}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2, ease: easeSmooth }} className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            placeholder="Buscar topicos, fontes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>

        {/* Source pills */}
        <div className="flex flex-wrap gap-2">
          {sourceFilters.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setActiveSource(sf.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                activeSource === sf.key
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-[#262626] text-[#A1A1AA] border-[#27272A] hover:border-[rgba(124,58,237,0.4)] hover:text-white'
              }`}
            >
              {'dot' in sf && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sf.dot }} />}
              {sf.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 pl-8 pr-3 bg-[#262626] border border-[#27272A] rounded-lg text-xs text-[#A1A1AA] focus:outline-none focus:border-[#7C3AED] appearance-none cursor-pointer"
          >
            <option value="relevancia">Relevancia</option>
            <option value="data">Data</option>
            <option value="score-desc">Score (maior)</option>
            <option value="score-asc">Score (menor)</option>
          </select>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-[#7C3AED] animate-spin" />
          <span className="ml-3 text-sm text-[#A1A1AA]">Carregando tendencias...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-16">
          <Brain size={48} className="mx-auto text-[#333333] mb-4" />
          <p className="text-lg text-[#EF4444] mb-2">{error}</p>
          <button
            onClick={() => loadTrends()}
            className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Topic List */}
      {!loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.3 }} className="bg-[#1A1A1A] border border-[#27272A] rounded-xl overflow-hidden">
          {filtered.length > 0 ? (
            filtered.map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03, ease: easeSmooth }}
              >
                <TopicRow
                  topic={topic}
                  expanded={expandedId === topic.id}
                  onToggle={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
                />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16">
              <Brain size={48} className="mx-auto text-[#333333] mb-4" />
              <p className="text-lg text-[#71717A]">Nenhum topico encontrado</p>
              <p className="text-sm text-[#52525B] mt-1">Tente ajustar seus filtros</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Results count */}
      {!loading && !error && (
        <p className="text-xs text-[#71717A] mt-3">{filtered.length} topico{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
