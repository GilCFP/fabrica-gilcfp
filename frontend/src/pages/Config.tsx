import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Save, Check, AlertCircle, ExternalLink } from 'lucide-react'

const easeSmooth: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function Config() {
  const [openaiKey, setOpenaiKey] = useState('')
  const [apifyToken, setApifyToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [currentConfig, setCurrentConfig] = useState({ has_openai: false, has_apify: false })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/config/')
      .then(r => r.json())
      .then(data => setCurrentConfig(data))
      .catch(() => {})
  }, [status])

  const handleSave = async () => {
    if (!openaiKey && !apifyToken) {
      setMessage('Preencha pelo menos uma chave')
      setStatus('error')
      return
    }
    setStatus('saving')
    try {
      const res = await fetch('/api/config/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openai_api_key: openaiKey,
          apify_api_token: apifyToken,
        }),
      })
      if (res.ok) {
        setStatus('saved')
        setMessage('Chaves salvas com sucesso!')
        setOpenaiKey('')
        setApifyToken('')
      } else {
        throw new Error('Erro ao salvar')
      }
    } catch {
      setStatus('error')
      setMessage('Erro ao salvar. Tente novamente.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeSmooth }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[rgba(124,58,237,0.1)] flex items-center justify-center">
            <Key size={20} className="text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Configuração</h1>
            <p className="text-sm text-[#71717A]">Adicione suas chaves de API para ativar funcionalidades premium</p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`rounded-xl border p-4 ${currentConfig.has_openai ? 'border-[#10B981]/30 bg-[rgba(16,185,129,0.05)]' : 'border-[#27272A] bg-[#1A1A1A]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${currentConfig.has_openai ? 'bg-[#10B981]' : 'bg-[#52525B]'}`} />
              <span className="text-sm font-medium text-white">OpenAI</span>
            </div>
            <p className="text-xs text-[#71717A]">
              {currentConfig.has_openai ? 'Configurada' : 'Não configurada'}
            </p>
          </div>
          <div className={`rounded-xl border p-4 ${currentConfig.has_apify ? 'border-[#10B981]/30 bg-[rgba(16,185,129,0.05)]' : 'border-[#27272A] bg-[#1A1A1A]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${currentConfig.has_apify ? 'bg-[#10B981]' : 'bg-[#52525B]'}`} />
              <span className="text-sm font-medium text-white">Apify</span>
            </div>
            <p className="text-xs text-[#71717A]">
              {currentConfig.has_apify ? 'Configurada' : 'Não configurada'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-[#27272A] bg-[#1A1A1A] p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              OpenAI API Key
            </label>
            <p className="text-xs text-[#71717A] mb-2">
              Para geração de roteiros com IA e transcrição de vídeo.{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline inline-flex items-center gap-0.5">
                Criar chave <ExternalLink size={10} />
              </a>
            </p>
            <input
              type="password"
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-[#0A0A0A] border border-[#27272A] rounded-lg px-4 py-3 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Apify API Token
            </label>
            <p className="text-xs text-[#71717A] mb-2">
              Para scraping de tendências dos EUA em tempo real.{' '}
              <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline inline-flex items-center gap-0.5">
                Criar token <ExternalLink size={10} />
              </a>
            </p>
            <input
              type="password"
              value={apifyToken}
              onChange={e => setApifyToken(e.target.value)}
              placeholder="apify_api_..."
              className="w-full bg-[#0A0A0A] border border-[#27272A] rounded-lg px-4 py-3 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm ${status === 'saved' ? 'text-[#10B981]' : status === 'error' ? 'text-[#EF4444]' : 'text-[#71717A]'}`}>
              {status === 'saved' && <Check size={16} />}
              {status === 'error' && <AlertCircle size={16} />}
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="w-full py-3 rounded-lg bg-[#7C3AED] text-white font-medium text-sm hover:bg-[#6D28D9] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {status === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Configuração
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 rounded-xl border border-[#27272A] bg-[#1A1A1A] p-6">
          <h3 className="text-sm font-medium text-white mb-3">O que cada chave faz?</h3>
          <div className="space-y-3 text-xs text-[#71717A]">
            <div className="flex gap-3">
              <span className="text-[#7C3AED] font-medium shrink-0">OpenAI</span>
              <span>Gera roteiros novos com IA, transcreve seus vídeos com Whisper, e enriquece tendências dos EUA com adaptações para o Brasil. Custo: ~$0.36 por vídeo de 60s.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#7C3AED] font-medium shrink-0">Apify</span>
              <span>Raspa fontes dos EUA em tempo real (YouTube, newsletters, Twitter) para encontrar temas em alta antes de todo mundo. Custo: $5 grátis/mês.</span>
            </div>
          </div>
          <p className="text-xs text-[#52525B] mt-4">
            Sem as chaves, o sistema funciona normalmente com os 28 roteiros e 8 tendências pré-carregados.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
