import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileVideo,
  HardDrive,
  Clock,
  FileText,
  Scissors,
  Zap,
  Subtitles,
  Download,
  Check,
  Loader2,
  Monitor,
  Film,
  Gauge,
  Volume2,
  Play,
  Pause,
  Maximize,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  History,
  Calendar,
  X,
} from 'lucide-react'
import { uploadVideo, getVideoStatus, downloadVideo, previewVideo, scheduleVideo, listVideos, type VideoHistoryItem, type ScheduleVideoPayload } from '../api/client'

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ─── Types ─── */
interface PipelineStep {
  id: string
  name: string
  icon: typeof FileText
  status: 'pending' | 'current' | 'completed' | 'error'
}

interface ProcessingVideo {
  id: number
  filename: string
  status: string
  progress: number
  steps: PipelineStep[]
}

const stepIconMap: Record<string, typeof FileText> = {
  transcription: FileText,
  cuts: Scissors,
  jumpcuts: Zap,
  subtitles: Subtitles,
  export: Download,
}

const stepNameMap: Record<string, string> = {
  transcription: 'Transcricao',
  cuts: 'Cortes',
  jumpcuts: 'Jump Cuts',
  subtitles: 'Legendas',
  export: 'Export',
}

/* ─── Toggle Switch ─── */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${checked ? 'bg-[#7C3AED]' : 'bg-[#333333]'}`}
    >
      <motion.div
        animate={{ x: checked ? 14 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white"
      />
    </button>
  )
}

/* ─── Step Node ─── */
function StepNode({ step, index }: { step: PipelineStep; index: number }) {
  const Icon = step.icon
  const isPending = step.status === 'pending'
  const isCurrent = step.status === 'current'
  const isCompleted = step.status === 'completed'
  const isError = step.status === 'error'

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.1, ease: easeSmooth }}
        className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
          isPending
            ? 'border-[#27272A] bg-[#1A1A1A]'
            : isCurrent
            ? 'border-[#06B6D4] bg-[rgba(6,182,212,0.1)] animate-pulse-cyan'
            : isCompleted
            ? 'border-[#10B981] bg-[#10B981]'
            : 'border-[#EF4444] bg-[#EF4444]'
        }`}
      >
        {isCompleted ? (
          <Check size={18} className="text-white" />
        ) : isError ? (
          <AlertCircle size={18} className="text-white" />
        ) : (
          <Icon size={18} className={isCurrent ? 'text-[#06B6D4]' : 'text-[#71717A]'} />
        )}
      </motion.div>
      <div className="mt-3 text-center">
        <p className={`text-[10px] font-medium uppercase tracking-wider ${
          isPending ? 'text-[#71717A]' : isCurrent ? 'text-[#06B6D4]' : isCompleted ? 'text-[#10B981]' : 'text-[#EF4444]'
        }`}>
          {step.name}
        </p>
        <p className={`text-[10px] mt-0.5 ${
          isPending ? 'text-[#71717A]' : isCurrent ? 'text-[#06B6D4]' : isCompleted ? 'text-[#10B981]' : 'text-[#EF4444]'
        }`}>
          {isPending && 'Pendente'}
          {isCurrent && (
            <span className="flex items-center gap-1 justify-center">
              <Loader2 size={10} className="animate-spin" /> Processando...
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 justify-center">
              <CheckCircle size={10} /> Concluido
            </span>
          )}
          {isError && 'Erro'}
        </p>
      </div>
    </div>
  )
}

/* ─── Schedule Modal ─── */
function ScheduleModal({
  date,
  platform,
  format,
  scheduling,
  error,
  onDateChange,
  onPlatformChange,
  onFormatChange,
  onClose,
  onConfirm,
}: {
  date: string
  platform: 'instagram' | 'linkedin'
  format: 'reel_30' | 'reel_60' | 'carrossel'
  scheduling: boolean
  error: string | null
  onDateChange: (v: string) => void
  onPlatformChange: (v: 'instagram' | 'linkedin') => void
  onFormatChange: (v: 'reel_30' | 'reel_60' | 'carrossel') => void
  onClose: () => void
  onConfirm: () => void
}) {
  const platforms: { key: 'instagram' | 'linkedin'; label: string }[] = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'linkedin', label: 'LinkedIn' },
  ]
  const formats: { key: 'reel_30' | 'reel_60' | 'carrossel'; label: string }[] = [
    { key: 'reel_30', label: 'Reel 30s' },
    { key: 'reel_60', label: 'Reel 60s' },
    { key: 'carrossel', label: 'Carrossel' },
  ]

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
        className="relative w-full max-w-[420px] bg-[#1A1A1A] border border-[#27272A] rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#27272A] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Agendar no Calendario</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Date */}
          <div>
            <label className="text-xs text-[#71717A] block mb-1.5">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full h-10 px-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="text-xs text-[#71717A] block mb-2">Plataforma</label>
            <div className="flex gap-2">
              {platforms.map((p) => (
                <button
                  key={p.key}
                  onClick={() => onPlatformChange(p.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    platform === p.key
                      ? 'bg-[rgba(124,58,237,0.15)] border-[#7C3AED] text-white'
                      : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs text-[#71717A] block mb-2">Formato</label>
            <div className="flex gap-2">
              {formats.map((f) => (
                <button
                  key={f.key}
                  onClick={() => onFormatChange(f.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    format === f.key
                      ? 'bg-[rgba(6,182,212,0.15)] border-[#06B6D4] text-white'
                      : 'bg-[#262626] border-[#27272A] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-[#EF4444] rounded-lg text-xs text-[#EF4444]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272A] flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-[#A1A1AA] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={scheduling || !date}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
          >
            {scheduling ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            {scheduling ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main Page ─── */
export default function Editor() {
  const [file, setFile] = useState<{ name: string; size: string; duration: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Processing state
  const [processingVideo, setProcessingVideo] = useState<ProcessingVideo | null>(null)
  const [completed, setCompleted] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Settings
  const [cutHesitations, setCutHesitations] = useState(true)
  const [jumpCuts, setJumpCuts] = useState(true)
  const [autoSubtitles, setAutoSubtitles] = useState(true)
  const [language, setLanguage] = useState('pt-BR')
  const [subtitleStyle, setSubtitleStyle] = useState('hormozi')

  // Player
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(65)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [schedulePlatform, setSchedulePlatform] = useState<'instagram' | 'linkedin'>('instagram')
  const [scheduleFormat, setScheduleFormat] = useState<'reel_30' | 'reel_60' | 'carrossel'>('reel_30')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // History
  const [historyData, setHistoryData] = useState<VideoHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Poll interval ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep the video player source in sync with the processing lifecycle.
  useEffect(() => {
    if (!processingVideo) {
      setVideoUrl(null)
      return
    }
    if (completed) {
      setVideoUrl(downloadVideo(processingVideo.id))
    } else {
      setVideoUrl(previewVideo(processingVideo.id))
    }
  }, [processingVideo, completed])

  // Load video history
  const loadHistory = useCallback(async () => {
    try {
      const data = await listVideos()
      setHistoryData(data.videos || [])
    } catch (err) {
      console.error('Error loading video history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Poll video status
  const startPolling = useCallback((videoId: number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getVideoStatus(videoId)

        // Map API steps to pipeline steps
        const apiSteps = status.steps || []
        const mappedSteps: PipelineStep[] = apiSteps.map((s: any) => ({
          id: s.id,
          name: stepNameMap[s.id] || s.name,
          icon: stepIconMap[s.id] || FileText,
          status: s.status,
        }))

        setProcessingVideo((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            status: status.status,
            progress: status.progress || prev.progress,
            steps: mappedSteps.length > 0 ? mappedSteps : prev.steps,
          }
        })

        if (status.status === 'completed') {
          setCompleted(true)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          loadHistory() // Refresh history
        } else if (status.status === 'failed' || status.status === 'error') {
          setProcessingError('Erro no processamento do video.')
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 3000)
  }, [loadHistory])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleUpload = useCallback(async (uploadFile: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 5
      })
    }, 100)

    try {
      const settings = {
        cutHesitations,
        jumpCuts,
        autoSubtitles,
        language,
        subtitleStyle,
      }

      const result = await uploadVideo(uploadFile, settings)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Set processing state
      const initialSteps: PipelineStep[] = [
        { id: 'transcription', name: 'Transcricao', icon: FileText, status: 'pending' },
        { id: 'cuts', name: 'Cortes', icon: Scissors, status: 'pending' },
        { id: 'jumpcuts', name: 'Jump Cuts', icon: Zap, status: 'pending' },
        { id: 'subtitles', name: 'Legendas', icon: Subtitles, status: 'pending' },
        { id: 'export', name: 'Export', icon: Download, status: 'pending' },
      ]

      // Mark first step as current
      if (initialSteps.length > 0) initialSteps[0].status = 'current'

      setProcessingVideo({
        id: result.id,
        filename: uploadFile.name,
        status: result.status,
        progress: 0,
        steps: initialSteps,
      })

      setFile({
        name: uploadFile.name,
        size: `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`,
        duration: '4:32',
      })

      setIsUploading(false)
      setCompleted(false)
      setProcessingError(null)

      // Start polling
      startPolling(result.id)
    } catch (err) {
      clearInterval(progressInterval)
      setIsUploading(false)
      console.error('Upload error:', err)
      setProcessingError('Erro no upload do video. Tente novamente.')
    }
  }, [cutHesitations, jumpCuts, autoSubtitles, language, subtitleStyle, startPolling])

  const startUpload = useCallback(() => {
    if (fileInputRef.current?.files?.[0]) {
      handleUpload(fileInputRef.current.files[0])
    }
  }, [handleUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!isUploading && !processingVideo && !completed && e.dataTransfer.files?.[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }, [isUploading, processingVideo, completed, handleUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const resetAll = useCallback(() => {
    setFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setProcessingVideo(null)
    setCompleted(false)
    setProcessingError(null)
    setPlaying(false)
    setProgress(65)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSchedule = useCallback(async () => {
    if (!processingVideo || !scheduleDate) return
    setScheduling(true)
    setScheduleError(null)
    try {
      const payload: ScheduleVideoPayload = {
        event_date: new Date(scheduleDate).toISOString(),
        platform: schedulePlatform,
        content_format: scheduleFormat,
      }
      await scheduleVideo(processingVideo.id, payload)
      setShowScheduleModal(false)
    } catch (err: any) {
      console.error('Schedule error:', err)
      setScheduleError(err.message || 'Erro ao agendar no calendario.')
    } finally {
      setScheduling(false)
    }
  }, [processingVideo, scheduleDate, schedulePlatform, scheduleFormat])

  const currentStepIndex = processingVideo?.steps.findIndex((s) => s.status === 'current') ?? -1

  const getStepDetail = (stepId: string) => {
    switch (stepId) {
      case 'transcription':
        return { label: 'TRANSICAO DE AUDIO', text: 'Transcrevendo audio para texto...', detail: 'Idioma detectado: Portugues (BR) • Confianca: 94%', progress: 70 }
      case 'cuts':
        return { label: 'REMOCAO DE HESITACOES', text: 'Analisando pausas e hesitacoes...', detail: '12 hesitacoes detectadas • Economia estimada: 23s', progress: 45 }
      case 'jumpcuts':
        return { label: 'GERACAO DE JUMP CUTS', text: 'Aplicando transicoes dinamicas...', detail: '8 jump cuts gerados • Transicao: Zoom pulse', progress: 60 }
      case 'subtitles':
        return { label: 'LEGENDAS AUTOMATICAS', text: 'Gerando legendas com estilo...', detail: 'Estilo: TikTok • Fonte: Bold • Animacao: Palavra por palavra', progress: 55 }
      case 'export':
        return { label: 'EXPORTACAO', text: 'Renderizando video final...', detail: 'Formato: MP4 • Qualidade: 1080p • Tamanho estimado: 180MB', progress: 80 }
      default:
        return { label: '', text: '', detail: '', progress: 0 }
    }
  }

  const currentStepData = currentStepIndex >= 0 && processingVideo && !completed
    ? getStepDetail(processingVideo.steps[currentStepIndex]?.id)
    : null

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: easeSmooth }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Editor de Video</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Processamento com IA: cortes, legendas e export</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-sm text-[#10B981]">Sistema Online</span>
        </div>
      </motion.div>

      {/* Upload Area */}
      <AnimatePresence mode="wait">
        {!file && !isUploading && !processingVideo && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: easeSmooth }}
            className={`max-w-2xl mx-auto h-80 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mb-8 ${
              dragOver
                ? 'border-[#7C3AED] bg-[rgba(124,58,237,0.05)] shadow-glow'
                : 'border-[#27272A] bg-[#1A1A1A]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload size={48} className={`transition-colors ${dragOver ? 'text-[#7C3AED]' : 'text-[#71717A]'}`} />
            <p className="text-lg font-medium text-white mt-4">Arraste videos aqui</p>
            <p className="text-sm text-[#A1A1AA] mt-1">ou clique para selecionar arquivos</p>
            <div className="flex items-center gap-6 mt-4 text-xs text-[#71717A]">
              <span className="flex items-center gap-1"><FileVideo size={14} /> MP4, MOV, MKV</span>
              <span className="flex items-center gap-1"><HardDrive size={14} /> Ate 2GB</span>
              <span className="flex items-center gap-1"><Clock size={14} /> Ate 10 minutos</span>
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={() => startUpload()} />
          </motion.div>
        )}

        {isUploading && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto h-80 rounded-2xl border border-[#27272A] bg-[#1A1A1A] flex flex-col items-center justify-center mb-8"
          >
            <p className="text-sm font-medium text-white">{file?.name || 'Enviando video...'}</p>
            <p className="text-xs text-[#71717A] mt-1">Enviando para o servidor</p>
            <div className="w-80 max-w-[90%] h-1 bg-[#262626] rounded-full mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-[#7C3AED] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <p className="text-lg font-semibold text-[#7C3AED] mt-3">{uploadProgress}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {processingError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto mb-6 p-4 bg-[rgba(239,68,68,0.1)] border border-[#EF4444] rounded-xl text-center"
        >
          <AlertCircle size={20} className="text-[#EF4444] mx-auto mb-2" />
          <p className="text-sm text-[#EF4444]">{processingError}</p>
          <button
            onClick={resetAll}
            className="mt-2 px-4 py-1.5 bg-[#262626] text-[#A1A1AA] rounded-lg text-xs hover:text-white transition-colors"
          >
            Tentar Novamente
          </button>
        </motion.div>
      )}

      {/* Pipeline + Details */}
      <AnimatePresence>
        {(processingVideo || completed) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeSmooth }}>
            {/* Pipeline */}
            <div className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-8 mb-6">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-0 max-w-2xl w-full justify-center">
                  {processingVideo?.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center">
                      <StepNode step={step} index={i} />
                      {i < (processingVideo?.steps.length || 0) - 1 && (
                        <div className="w-12 md:w-16 h-0.5 mx-1 flex-shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              step.status === 'completed'
                                ? 'bg-[#10B981]'
                                : 'bg-[#27272A]'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Step Detail */}
              <AnimatePresence mode="wait">
                {currentStepData && (
                  <motion.div
                    key={processingVideo?.steps[currentStepIndex]?.id || 'detail'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-6 bg-[#262626] rounded-lg p-5 max-w-lg mx-auto"
                  >
                    <p className="text-[10px] font-semibold uppercase text-[#06B6D4] tracking-wider">{currentStepData.label}</p>
                    <p className="text-sm text-white mt-2">{currentStepData.text}</p>
                    <p className="text-xs text-[#71717A] mt-1">{currentStepData.detail}</p>
                    <div className="w-full h-1 bg-[#1A1A1A] rounded-full mt-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-[#06B6D4] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${currentStepData.progress}%` }}
                        transition={{ duration: 2, ease: 'linear' }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completed message */}
              <AnimatePresence>
                {completed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-[#10B981]">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium">Processamento concluido com sucesso!</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video Details + Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Details Card */}
              <div className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <FileVideo size={16} className="text-[#7C3AED]" />
                  <h3 className="text-lg font-semibold text-white">Detalhes do Video</h3>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Nome', value: file?.name || processingVideo?.filename || 'video.mp4', icon: FileText },
                    { label: 'Tamanho', value: file?.size || '450 MB', icon: HardDrive },
                    { label: 'Duracao', value: completed ? '3:48 (apos cortes)' : (file?.duration || '4:32'), icon: Clock, highlight: completed },
                    { label: 'Formato', value: 'MP4 (H.264)', icon: Film },
                    { label: 'Resolucao', value: '1920x1080', icon: Monitor },
                    { label: 'FPS', value: '30fps', icon: Gauge },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xs text-[#71717A] w-24 flex-shrink-0 flex items-center gap-2">
                        <item.icon size={14} /> {item.label}
                      </span>
                      <span className={`text-sm font-medium ${item.highlight ? 'text-[#10B981]' : 'text-white'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-[#27272A] my-5" />

                {/* Settings */}
                <h4 className="text-base font-medium text-white mb-4">Configuracoes</h4>
                <div className="space-y-3.5">
                  {[
                    { label: 'Cortar hesitacoes', sub: 'Remove pausas e "humms" automaticamente', checked: cutHesitations, onChange: setCutHesitations },
                    { label: 'Adicionar jump cuts', sub: 'Transicoes dinamicas entre cortes', checked: jumpCuts, onChange: setJumpCuts },
                    { label: 'Legendas automaticas', sub: 'Gera e sincroniza legendas', checked: autoSubtitles, onChange: setAutoSubtitles },
                  ].map((toggle) => (
                    <div key={toggle.label} className="flex items-start gap-3">
                      <ToggleSwitch checked={toggle.checked} onChange={toggle.onChange} />
                      <div>
                        <p className="text-sm text-white">{toggle.label}</p>
                        <p className="text-xs text-[#71717A]">{toggle.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 mt-4">
                  <div>
                    <label className="text-xs text-[#71717A] block mb-1">Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-9 px-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                    >
                      <option value="pt-BR">Portugues (BR)</option>
                      <option value="en">Ingles</option>
                      <option value="es">Espanhol</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#71717A] block mb-1">Estilo das Legendas</label>
                    <select
                      value={subtitleStyle}
                      onChange={(e) => setSubtitleStyle(e.target.value)}
                      className="w-full h-9 px-3 bg-[#262626] border border-[#27272A] rounded-lg text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                    >
                      <option value="hormozi">Hormozi (destaque palavras-chave)</option>
                      <option value="tiktok">TikTok Style</option>
                      <option value="youtube">YouTube Style</option>
                      <option value="minimalista">Minimalista</option>
                      <option value="destaque">Destaque</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview Player */}
              <div className="bg-[#1A1A1A] border border-[#27272A] rounded-xl overflow-hidden">
                <div className="aspect-video bg-black relative flex items-center justify-center">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      key={videoUrl}
                    />
                  ) : (
                    <div className="text-center">
                      <FileVideo size={48} className="text-[#333333] mx-auto" />
                      <p className="text-sm text-[#52525B] mt-2">Previa do video</p>
                    </div>
                  )}
                  {processingVideo && !completed && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center pointer-events-none">
                      <Loader2 size={32} className="text-[#06B6D4] animate-spin" />
                      <p className="text-sm text-white mt-3">Processando...</p>
                      <p className="text-xs text-[#71717A] mt-1">
                        {processingVideo.progress > 0 ? `${processingVideo.progress}%` : 'Aguardando...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Player Controls */}
                <div className="px-4 py-3 bg-[#262626] flex items-center justify-between">
                  <span className="text-xs text-[#A1A1AA]">
                    {completed ? 'Video processado' : processingVideo ? 'Original durante o processamento' : 'Previa do video'}
                  </span>
                  <span className="text-xs text-[#71717A] font-mono">
                    {completed ? 'MP4 • 1080p' : processingVideo ? 'Original' : ''}
                  </span>
                </div>

                {/* Download Area */}
                <AnimatePresence>
                  {completed && processingVideo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-4 py-4 border-t border-[#27272A] space-y-2"
                    >
                      <div className="flex items-center gap-2 text-[#10B981]">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Processamento concluido!</span>
                      </div>
                      <p className="text-xs text-[#71717A]">{processingVideo.filename} • Processado</p>
                      <a
                        href={downloadVideo(processingVideo.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all animate-pulse-glow"
                      >
                        <Download size={16} /> Baixar Video Final
                      </a>
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#262626] border border-[#27272A] text-[#A1A1AA] rounded-lg text-sm hover:border-[rgba(124,58,237,0.4)] hover:text-white transition-colors"
                      >
                        <Calendar size={16} /> Agendar no calendario
                      </button>
                      <button
                        onClick={resetAll}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#262626] border border-[#27272A] text-[#A1A1AA] rounded-lg text-sm hover:border-[rgba(124,58,237,0.4)] transition-colors"
                      >
                        <RefreshCw size={16} /> Reprocessar com outras configuracoes
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <ScheduleModal
            date={scheduleDate}
            platform={schedulePlatform}
            format={scheduleFormat}
            scheduling={scheduling}
            error={scheduleError}
            onDateChange={setScheduleDate}
            onPlatformChange={setSchedulePlatform}
            onFormatChange={setScheduleFormat}
            onClose={() => setShowScheduleModal(false)}
            onConfirm={handleSchedule}
          />
        )}
      </AnimatePresence>

      {/* Processing History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: easeSmooth }}
        className="bg-[#1A1A1A] border border-[#27272A] rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#71717A]" />
            <h3 className="text-lg font-semibold text-white">Historico de Processamento</h3>
          </div>
          <button
            onClick={loadHistory}
            className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-[#7C3AED] animate-spin" />
            <span className="ml-2 text-xs text-[#A1A1AA]">Carregando historico...</span>
          </div>
        ) : (
          <div className="divide-y divide-[#27272A]">
            {historyData.length === 0 ? (
              <div className="py-8 text-center">
                <History size={32} className="text-[#333333] mx-auto mb-3" />
                <p className="text-sm text-[#71717A]">Nenhum video processado ainda</p>
                <p className="text-xs text-[#52525B] mt-1">Faca upload de um video raw para comecar — a IA cuida do resto</p>
              </div>
            ) : (
              historyData.map((item, i) => (
                <motion.div
                  key={item.id || item.filename}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.06, ease: easeSmooth }}
                  className="flex items-center gap-3 py-3.5"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.status === 'completed'
                      ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                      : item.status === 'processing'
                      ? 'bg-[rgba(6,182,212,0.1)] text-[#06B6D4]'
                      : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]'
                  }`}>
                    {item.status === 'completed' ? <CheckCircle size={16} /> : item.status === 'processing' ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.filename}</p>
                    <p className="text-xs text-[#71717A]">{item.size} • {item.duration} • {item.time}{item.error ? ` • ${item.error}` : ''}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-[#71717A]">
                    {['Transcricao', 'Cortes', 'Jump Cuts', 'Legendas', 'Export'].map((s, j) => (
                      <span key={s}>
                        <span className={item.status === 'completed' ? 'text-[#10B981]' : ''}>✓</span> {s}
                        {j < 4 && <span className="mx-1">|</span>}
                      </span>
                    ))}
                  </div>
                  {item.status === 'completed' && item.id && (
                    <a
                      href={downloadVideo(item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:bg-[#7C3AED] hover:text-white transition-colors flex-shrink-0"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
