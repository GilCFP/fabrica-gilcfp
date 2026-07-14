import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  Bell,
  FilePlus,
  Clapperboard,
  Globe,
  CalendarDays,
  Zap,
  Activity,
  Play,
  FileText,
  TrendingUp,
  CheckCircle,
  Upload,
  ArrowUpRight,
  RefreshCw,
  Instagram,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { fetchScripts, fetchTrends } from '../api/client'

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ─── KPI Data (dynamic) ─── */
interface KpiData {
  label: string
  value: number
  suffix: string
  trend: string
  trendUp: boolean
  hasSparkline: boolean
  icon: typeof Play
  iconColor: string
}

/* ─── Activity Feed (empty state) ─── */
const activities: { type: string; description: string; time: string; status: 'success' | 'pending' }[] = []

/* ─── Calendar Preview (empty state) ─── */
const calendarPreview: { day: string; month: string; title: string; platform: string; format: string; status: 'scheduled' | 'draft' | 'published' }[] = []

/* ─── CountUp Hook ─── */
function useCountUp(end: number, duration = 800, start = 0) {
  const [count, setCount] = useState(start)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const startTime = performance.now()

    function update(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(start + (end - start) * eased)
      if (progress < 1) requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }, [end, duration, start])

  return count
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

/* ─── Sparkline ─── */
function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <ResponsiveContainer width={80} height={24}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`}
          isAnimationActive={true}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── KPI Card ─── */
function KpiCard({ kpi, index }: { kpi: KpiData; index: number }) {
  const isPercentage = kpi.label.includes('TAXA')
  const countValue = useCountUp(kpi.value as number, 800)
  const displayValue = isPercentage ? countValue.toFixed(1) : Math.round(countValue)
  const IconComp = kpi.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: easeSmooth }}
      className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-5 hover:bg-[#262626] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group"
    >
      <p className="text-[10px] font-medium uppercase text-[#71717A] tracking-wide mb-3">
        {kpi.label}
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold text-white font-variant-numeric-tabular">
            {displayValue}{kpi.suffix}
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${kpi.trendUp ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {kpi.trendUp && <ArrowUpRight size={12} />}
            {kpi.trend}
          </p>
        </div>
        {kpi.hasSparkline && (kpi as any).data && (
          <MiniSparkline data={(kpi as any).data} color={(kpi as any).color || '#10B981'} />
        )}
        {IconComp && (
          <IconComp size={20} style={{ color: kpi.iconColor }} />
        )}
      </div>
    </motion.div>
  )
}

/* ─── Activity Icon ─── */
function ActivityIcon({ type }: { type: string }) {
  const config: Record<string, { icon: typeof Play; bg: string; color: string }> = {
    video: { icon: Play, bg: 'bg-[rgba(6,182,212,0.1)]', color: 'text-[#06B6D4]' },
    script: { icon: FileText, bg: 'bg-[rgba(124,58,237,0.1)]', color: 'text-[#7C3AED]' },
    trend: { icon: TrendingUp, bg: 'bg-[rgba(16,185,129,0.1)]', color: 'text-[#10B981]' },
    publish: { icon: CheckCircle, bg: 'bg-[rgba(16,185,129,0.1)]', color: 'text-[#10B981]' },
    calendar: { icon: CalendarDays, bg: 'bg-[rgba(124,58,237,0.1)]', color: 'text-[#7C3AED]' },
    upload: { icon: Upload, bg: 'bg-[rgba(245,158,11,0.1)]', color: 'text-[#F59E0B]' },
  }
  const c = config[type] || config.video
  const Icon = c.icon
  return (
    <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
      <Icon size={16} className={c.color} />
    </div>
  )
}

/* ─── Main Home Page ─── */
export default function Home() {
  const navigate = useNavigate()

  // KPI state
  const [scriptsCount, setScriptsCount] = useState(0)
  const [, setTrendsCount] = useState(0)
  const [kpisLoading, setKpisLoading] = useState(true)

  // Load KPI data on mount
  useEffect(() => {
    const loadData = async () => {
      setKpisLoading(true)
      try {
        const [scriptsData, trendsData] = await Promise.all([
          fetchScripts(),
          fetchTrends(),
        ])
        setScriptsCount(scriptsData.count || 0)
        setTrendsCount(trendsData.count || 0)
      } catch (err) {
        console.error('Error loading KPI data:', err)
      } finally {
        setKpisLoading(false)
      }
    }
    loadData()
  }, [])

  const kpis: KpiData[] = [
    {
      label: 'VIDEOS PRODUZIDOS ESTE MES',
      value: 0,
      suffix: '',
      trend: 'Comece gravando seu primeiro Reel',
      trendUp: true,
      hasSparkline: false,
      icon: Play,
      iconColor: '#06B6D4',
    },
    {
      label: 'SCRIPTS PRONTOS PARA FILMAR',
      value: scriptsCount,
      suffix: '',
      trend: scriptsCount > 0 ? 'Disponiveis no banco — comece pela aba Roteiros' : 'Carregando...',
      trendUp: true,
      hasSparkline: false,
      icon: FileText,
      iconColor: '#7C3AED',
    },
    {
      label: 'TAXA DE ENGAJAMENTO MEDIA',
      value: 0,
      suffix: '%',
      trend: 'Dados aparecem apos a primeira publicacao',
      trendUp: true,
      hasSparkline: false,
      icon: TrendingUp,
      iconColor: '#10B981',
    },
    {
      label: 'CONTEUDO AGENDADO',
      value: 0,
      suffix: '',
      trend: 'Use o calendario para planejar',
      trendUp: true,
      hasSparkline: false,
      icon: CalendarDays,
      iconColor: '#F59E0B',
    },
  ]

  const quickActions = [
    { icon: FilePlus, label: 'Criar Novo Roteiro', sub: 'Gerar script com IA para Reels', color: '#7C3AED', path: '/roteiros' },
    { icon: Clapperboard, label: 'Processar Video', sub: 'Upload, cortes, legendas e export', color: '#06B6D4', path: '/editor' },
    { icon: Globe, label: 'Buscar Tendencias', sub: 'Descobrir topicos em alta nos EUA', color: '#10B981', path: '/inteligencia' },
    { icon: CalendarDays, label: 'Ver Calendario', sub: 'Proximos 30 dias de conteudo', color: '#F59E0B', path: '/calendario' },
  ]

  // Top trends from API
  const [topTrends, setTopTrends] = useState<Array<{ rank: number; title: string; source: string; channel: string; score: number }>>([])

  useEffect(() => {
    const loadTrends = async () => {
      try {
        const data = await fetchTrends()
        const trends = (data.trends || []).slice(0, 5).map((t, i) => ({
          rank: i + 1,
          title: t.title,
          source: t.source || 'YouTube',
          channel: t.channel || '@creator',
          score: t.priority_score || 70,
        }))
        if (trends.length > 0) {
          setTopTrends(trends)
        }
      } catch (err) {
        console.error('Error loading trends for home:', err)
      }
    }
    loadTrends()
  }, [])

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: easeSmooth }}
            className="text-2xl font-semibold text-white tracking-tight"
          >
            Painel de Controle
          </motion.h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Visao geral da sua fabrica de conteudo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#71717A]">
            <CalendarIcon size={16} />
            <span>15 de Julho de 2026</span>
          </div>
          <button className="relative w-9 h-9 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-sm font-semibold">
            G
          </div>
        </div>
      </motion.div>

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="flex items-center justify-center py-8 mb-8">
          <Loader2 size={24} className="text-[#7C3AED] animate-spin" />
          <span className="ml-2 text-sm text-[#A1A1AA]">Carregando dados...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <KpiCard key={kpi.label} kpi={kpi} index={i} />
          ))}
        </div>
      )}

      {/* Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: easeSmooth }}
          className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} className="text-[#7C3AED]" />
            <h3 className="text-lg font-semibold text-white">Acoes Rapidas</h3>
          </div>
          <div className="space-y-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.06, ease: easeSmooth }}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg bg-[#262626] border border-[#27272A] hover:border-[#7C3AED] transition-all duration-200 text-left group"
                  style={{ '--hover-bg': `${action.color}0D` } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = `${action.color}0D`
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#262626'
                  }}
                >
                  <Icon size={20} style={{ color: action.color }} className="transition-transform duration-200 group-hover:translate-x-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="text-xs text-[#71717A]">{action.sub}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: easeSmooth }}
          className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity size={16} className="text-[#06B6D4]" />
            <h3 className="text-lg font-semibold text-white">Atividade Recente</h3>
          </div>
          <div className="divide-y divide-[#27272A]">
            {activities.length === 0 ? (
              <div className="py-8 text-center">
                <Activity size={32} className="text-[#333333] mx-auto mb-3" />
                <p className="text-sm text-[#71717A]">Nenhuma atividade ainda</p>
                <p className="text-xs text-[#52525B] mt-1">Suas acoes aparecerao aqui — grave um video ou crie um roteiro</p>
              </div>
            ) : (
              activities.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + i * 0.06, ease: easeSmooth }}
                  className="flex items-center gap-3 py-3.5"
                >
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.description}</p>
                    <p className="text-xs text-[#71717A]">{item.time}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'success' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Calendar Preview + Top Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: easeSmooth }}
          className="lg:col-span-3 bg-[#1A1A1A] border border-[#27272A] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#7C3AED]" />
              <h3 className="text-lg font-semibold text-white">Proximos do Calendario</h3>
            </div>
            <button
              onClick={() => navigate('/calendario')}
              className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1"
            >
              Ver tudo <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {calendarPreview.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays size={32} className="text-[#333333] mx-auto mb-3" />
                <p className="text-sm text-[#71717A]">Calendario vazio</p>
                <p className="text-xs text-[#52525B] mt-1">Adicione conteudo no calendario para planejar suas postagens</p>
              </div>
            ) : (
              calendarPreview.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.8 + i * 0.05, ease: easeSmooth }}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#262626] flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-base font-semibold text-white leading-tight">{item.day}</span>
                    <span className="text-[10px] text-[#71717A] leading-tight">{item.month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Instagram size={12} className="text-[#71717A]" />
                      <span className="text-[10px] text-[#71717A]">{item.platform} &bull; {item.format}</span>
                    </div>
                  </div>
                  <StatusBadge status={item.status === 'scheduled' ? 'scheduled' : 'draft'} />
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Top Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8, ease: easeSmooth }}
          className="lg:col-span-2 bg-[#1A1A1A] border border-[#27272A] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#10B981]" />
              <h3 className="text-lg font-semibold text-white">Tendencias em Alta</h3>
            </div>
            <button
              onClick={(e) => {
                const icon = e.currentTarget.querySelector('svg')
                icon?.classList.add('animate-spin-slow')
                setTimeout(() => icon?.classList.remove('animate-spin-slow'), 600)
              }}
              className="w-7 h-7 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="divide-y divide-[#27272A]">
            {topTrends.length === 0 ? (
              <div className="py-8 text-center">
                <TrendingUp size={32} className="text-[#333333] mx-auto mb-3" />
                <p className="text-sm text-[#71717A]">Carregando tendencias...</p>
              </div>
            ) : (
              topTrends.map((trend, i) => (
                <motion.div
                  key={trend.rank}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.9 + i * 0.06, ease: easeSmooth }}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="text-xs font-semibold text-[#71717A] w-5 text-center">{trend.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{trend.title}</p>
                    <p className="text-[10px] text-[#71717A]">{trend.source} &bull; {trend.channel}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    trend.score >= 80
                      ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                      : trend.score >= 50
                      ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
                      : 'bg-[#262626] text-[#71717A]'
                  }`}>
                    {trend.score}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
