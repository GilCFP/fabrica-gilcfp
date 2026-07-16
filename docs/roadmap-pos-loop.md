> **Relatório final do loop interativo de agentes**
> Agente Crítico (especialista em conteúdo e personal branding B2B) + Agente de Engenharia.

# Roadmap Pós-Loop — Fábrica GilCFP

## Resumo executivo

O loop interativo convergiu para uma proposta aprovada com ressalvas. A decisão central é **manter o pipeline customizado FFmpeg + Whisper no MVP**, mas investir nas melhorias que desbloqueiam o fluxo real de publicação: preview, calendário e repurposing. Legendas estilo Hormozi entram em terceiro lugar, com protótipo visual obrigatório antes de virar padrão. Score de hook com IA foi descartado em favor de um checklist objetivo de qualidade.

---

## Decisões arquiteturais aprovadas

### 1. Manter FFmpeg + Whisper

**Por quê:**
- Inputs são takes curtos (30-60s).
- Custo baixo e previsível (~$0.006/min no Whisper).
- Controle total sobre cortes, legendas e formato 9:16.
- Sistema continua funcionando offline com dados pré-carregados.

**Quando reavaliar:**
1. Gil começar a gravar conteúdo longo regularmente (> 3 min).
2. Volume passar de 30 vídeos/mês com processamento médio > 2 min/vídeo.
3. Qualidade visual das legendas estáticas não for aceitável após 2 iterações de protótipo.
4. Custo mensal de Whisper + GPT ultrapassar US$ 50.
5. Surgir necessidade de extrair clipes automáticos de momentos "virais" em vídeos longos.

### 2. Não usar Opus Clip / Descript no MVP

**Por quê:**
- Opus Clip não tem API pública aberta; bulk API é enterprise.
- Descript é mais adequado para podcasts/long-form.
- Ambos aumentam custo fixo mensal e reduzem controle.
- Para takes curtos, são overkill.

---

## Melhorias aprovadas e priorizadas

### Onda 1 — Implementar imediatamente

#### 1.1 Preview real do vídeo no editor

**Problema:** hoje o player na página Editor é um placeholder visual. O usuário precisa baixar o vídeo para revisar.

**Solução:**
- Backend: endpoint `GET /api/videos/{id}/preview` que serve o arquivo original durante o processamento.
- Frontend: substituir placeholder por `<video>` real. Durante processamento, carrega o original; após `completed`, carrega o processado.

**Arquivos:** `routers/videos.py`, `frontend/src/pages/Editor.tsx`, `frontend/src/api/client.ts`.

**Valor:** remove incerteza do fluxo; permite revisar antes de publicar.

#### 1.2 Integração vídeo processado ↔ calendário editorial

**Problema:** vídeo processado fica isolado; o usuário precisa lembrar de marcar no calendário manualmente.

**Solução:**
- Adicionar `video_id` e `processed_at` em `calendar_events`.
- Endpoints:
  - `POST /api/calendar/{event_id}/attach-video/{video_id}`
  - `POST /api/videos/{id}/schedule` (cria evento a partir do vídeo)
- Frontend: botão "Agendar no calendário" após processamento; modal com data, plataforma e formato.

**Arquivos:** `models.py`, `routers/calendar.py`, `routers/videos.py`, `frontend/src/pages/Editor.tsx`, `frontend/src/pages/Calendario.tsx`.

**Valor:** transforma o editor em etapa produtiva do pipeline editorial.

---

### Onda 2 — Implementar em seguida

#### 2.1 Repurposing automático: roteiro → carrossel LinkedIn + thread

**Problema:** cada roteiro gera apenas um reel. Perde-se o formato LinkedIn (autoridade B2B).

**Solução:**
- Endpoint `POST /api/scripts/{id}/repurpose`.
- Gera carrossel (5-10 slides) e thread (3-5 posts) a partir do roteiro.
- Validação mínima: exige hook, body e CTA preenchidos.
- Salvar em `repurposed_outputs` (JSON) na tabela `scripts`.
- Frontend: aba "Repurposing" no drawer do roteiro.

**Arquivos:** `services/ai_writer.py`, `routers/scripts.py`, `models.py`, `frontend/src/pages/Roteiros.tsx`, `frontend/src/api/client.ts`.

**Valor:** maximiza retorno do tempo de gravação; cobre LinkedIn + Instagram.

---

### Onda 3 — Implementar com cuidado

#### 3.1 Legendas estilo Hormozi (estáticas bem desenhadas)

**Problema:** legendas atuais são funcionais, mas básicas. Para competir visualmente, precisam de upgrade.

**Solução:**
- Começar com legendas estáticas queimadas: fonte bold, palavra-chave destacada, posicionamento correto.
- Criar 2-3 protótipos visuais e documentar em `docs/prototipo_legendas.md`.
- Só aprovar como padrão após revisão manual.
- Animações palavra-por-palavra ficam para o futuro (MoviePy ou ferramenta especializada).

**Arquivos:** `services/video_pipeline.py`, possivelmente novo `services/subtitle_renderer.py`.

**Valor:** melhora percepção de marca e retenção em vídeos assistidos sem som.

**Risco:** legendas mal feitas prejudicam a marca. Mitigação: protótipo aprovado antes.

---

### Melhoria adicional aprovada

#### 4.1 Modo "gravar sem roteiro"

**Problema:** fluxo previsto na documentação, mas não implementado de forma completa.

**Solução:**
- Permitir upload sem roteiro prévio.
- Após transcrição, gerar automaticamente: título, resumo, caption, hashtags, CTA sugerido.
- Endpoint `POST /api/videos/{id}/generate-caption-from-transcript`.
- Frontend: toggle "Gravar sem roteiro" + painel lateral com textos gerados.

**Arquivos:** `services/ai_writer.py`, `routers/videos.py`, `frontend/src/pages/Editor.tsx`.

**Valor:** aumenta utilidade real da máquina para o dia a dia do Gil.

---

## Melhoria descartada

### Score de hook com IA

**Por que descartar:**
- Risco de ruído e notas inconsistentes.
- Pode homogeneizar o conteúdo se o Gil passar a escrever para agradar o score.
- Tom de voz pessoal do Gil não é mensurável por métrica universal.
- Pode soar como o tipo de "hype de IA" que o anti-posicionamento rejeita.

**Substituição:** checklist objetivo de qualidade no drawer do roteiro:
- [ ] Hook tem < 10 palavras.
- [ ] Hook começa com problema, promessa ou provocação.
- [ ] Body menciona case real.
- [ ] Body tem dado concreto.
- [ ] CTA segue padrão "Comenta X que eu te mando Y".
- [ ] Tom de voz adequado (presença de termos como "cara", "sério", "olha só").

---

## Próximos passos

1. **Implementar Onda 1** (preview + calendário) — maior impacto operacional imediato.
2. **Validar com testes ponta a ponta** usando vídeo real e chave OpenAI.
3. **Implementar Onda 2** (repurposing) após validação da Onda 1.
4. **Criar protótipos visuais** para legendas Hormozi antes de implementar.
5. **Reavaliar FFmpeg + Whisper** conforme critérios objetivos definidos.

---

## Fontes e referências

- Research completo: `docs/research-content-machine.md`
- Perfil do agente crítico: `docs/agent-content-critic.md`
- Perfil do agente de engenharia: `docs/agent-engineering.md`
- Contexto do projeto: `AGENTS.md`, `docs/context.md`, `docs/estrategia.md`, `docs/arquitetura.md`
