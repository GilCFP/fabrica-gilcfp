# AGENTS.md — Fábrica GilCFP

> **INSTRUÇÃO OBRIGATÓRIA PARA AGENTES:** Leia este arquivo antes de qualquer ação no projeto. Ele contém o contexto essencial sobre o domínio, arquitetura, padrões e restrições.

---

## 1. O que é este projeto

**Fábrica GilCFP** é uma fábrica de roteiros virais para personal branding em IA. O objetivo é descobrir conteúdo que já performou na web (YouTube, Hacker News, Reddit), adaptar para o tom de voz de Gilberto de Carvalho (GilCFP) e gerar roteiros prontos para gravar. A edição de vídeo é externalizada para OpusClip (API REST).

- **Repositório:** `fabrica-gilcfp`
- **Stack principal:** Python (FastAPI) + React + SQLite
- **Autor/Gerente de produto:** Gilberto de Carvalho
- **Status:** MVP pós-pivot — roteiros virais como core; edição local legada

---

## 1.1 Pivot de produto (Jul/2026)

O produto original era um editor de vídeo local (FFmpeg + Whisper). Decidimos pivotar:

- **Core:** criação de roteiros a partir de conteúdo viral real da web.
- **Edição:** externalizada para OpusClip (API REST). A edição local continua como fallback legado.
- **Fluxo:** discovery → filtering → transcription → angle generation → script writing → aprovação humana → gravação → OpusClip.
- **Fontes atuais:** YouTube Data API + Hacker News (Algolia).
- **Fontes futuras:** LinkedIn, Twitter/X, Reddit, GitHub Trending, TikTok Creative Center.

A máquina sugere roteiros; o Gil aprova, grava e posta.

---

## 2. Contexto do negócio

### 2.1 Quem é Gilberto de Carvalho (GilCFP)

| Campo | Valor |
|-------|-------|
| Nome | Gilberto de Carvalho |
| Handle | GilCFP |
| Idade | 23 anos |
| Localização | Belo Horizonte, MG, Brasil |
| Inglês | C1 — trabalha com clientes internacionais |
| Formação | Engenharia de Sistemas — UFMG (2023-atual); Técnico em Eletrônica — CEFET-MG (2017-2021) |
| Cargo atual | Full-Stack Developer na SKEPS (2+ anos) |
| Experiência prévia | 2.5 anos em consultoria (prospect, lead, CAC, churn, ticket, ICP) |
| CNPJ | Sim — presta serviços B2B |
| Skills | Product Management, Full-Stack Dev, Arquitetura Cloud, LLMs/RAG, Automação, n8n, Comunicação |

### 2.2 Posicionamento

> **"Sou o engenheiro brasileiro que usa IA e automação para resolver problemas reais de negócio — e te mostro como fazer o mesmo sem enrolação."**

**Diferencial:** produto + negócio + técnico + comunicação + inglês C1.

**Pilares de conteúdo:**

| Pilar | % | O que cobre |
|-------|---|-------------|
| Ferramentas em Ação | 40% | Claude Code, n8n, Cursor, Gemini, etc. na prática |
| Produtividade & Workflows | 20% | Como trabalha no projeto americano, automações |
| Mindset & Estratégia | 20% | High Agency, precificação, negociação, carreira |
| Cases & Tendências | 20% | Projetos reais + tendências dos EUA adaptadas |

**O que ele NÃO é:** coach de produtividade, guru de prompts, vendedor de curso de R$997, cara de bot de WhatsApp de bairro, sensacionalista.

### 2.3 Tom de voz (regras absolutas)

| ✅ SEMPRE | ❌ NUNCA |
|-----------|----------|
| "Cara", "sério", "olha só", "na moral" | "Olá pessoal, tudo bem?" |
| "Deixa eu te mostrar" | "Vou te ensinar" |
| Referencia experiência real | Conteúdo genérico sem case |
| Dados concretos ("2h virou 10 min") | Promessas vagas |
| CTA: "Comenta X que eu te mando Y" | "Compre meu curso" |
| Direto ao ponto, sem rodeios | Enrolação, fluff |

### 2.4 Personas

**B2B — Rafael:** CTO / Head de Produto / CEO de empresa média, 35-45 anos. Quer implementar IA sem contratar time novo, precisa de resultados mensuráveis. Está no LinkedIn. Consome carrosséis, vídeos médios, threads.

**B2C — Camila:** Profissional em transição de carreira, 25-35 anos. Quer aprender IA aplicada, se sentir capacitada. Está no Instagram e LinkedIn. Consome reels curtos e stories.

### 2.5 Projetos reais para referenciar

1. **Cliente Americano (arquitetura):** PM solo para automação completa de posicionamento digital. Stack: ClickUp, n8n, Missive, TheHandover. Resultado: automação end-to-end que antes exigia uma equipe.
2. **Brena — Banco Rendimento:** Bot de WhatsApp AI que faz Pix, paga contas, consulta saldo, FAQ. Stack: Gemini 1.5 + Vertex AI.
3. **FairSet:** Plataforma de vôlei com IA para inferir níveis técnicos e balancear times. Stack: React, TypeScript, NestJS, PostgreSQL, Prisma.
4. **SKEPS:** Empresa onde trabalha. Clientes: Wellhub (Gympass), Multi, UFC, FoodToSave, Stix, Banco Rendimento, dsm firmenich.

### 2.6 Stack pessoal do Gilberto

| Categoria | Ferramenta |
|-----------|------------|
| Gestão de projetos | ClickUp |
| Automação | n8n |
| Email | Missive |
| IA Coding | Claude Code, Cursor |
| IA Models | Gemini 1.5, Vertex AI |

### 2.7 Monetização e objetivos

**Ofertas B2B (foco principal):**
- Consultoria IA: R$500/hora
- Projeto de automação: R$15K
- Retenção mensal: R$50K+/ano

**Ofertas B2C (topo de funil):**
- Lead magnet: grátis
- Produto digital: R$197-497
- Comunidade: futuro

**Objetivos:** ser referência B2B em IA no Brasil, atrair clientes corporativos, usar B2C como topo de funil, crescer base de seguidores, evoluir para agência de IA.

**Restrições operacionais:**
- Não é criador de conteúdo nativo
- Tem pouco tempo
- Precisa de fluxo ultra-otimizado
- IA deve fazer o trabalho pesado
- Ele só grava a base e aperta "publicar"

---

## 3. Arquitetura técnica

### 3.1 Visão geral

```
┌─────────────────────────────────────────────┐
│  BROWSER (React + Vite + Tailwind)          │
│  Dashboard │ Roteiros │ Inteligência │       │
│  Editor    │ Calendário │ Config      │       │
└─────────────────────┬───────────────────────┘
                      │ fetch() / REST API
                      ▼
┌─────────────────────────────────────────────┐
│  FASTAPI BACKEND (Python)                   │
│                                             │
│  /api/trends    /api/scripts    /api/videos │
│  /api/calendar  /api/config     /api/health │
│                                             │
│  SQLite (gilcfp.db)                         │
│  scripts │ trends │ videos │ calendar_events│
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌───────┐    ┌────────┐    ┌─────────┐
    │ Apify │    │ OpenAI │    │ FFmpeg  │
    └───────┘    └────────┘    └─────────┘
```

### 3.2 Estrutura de diretórios

```
fabrica-gilcfp/
├── main.py                 # FastAPI app + lifespan + static files
├── models.py               # SQLAlchemy models
├── database.py             # SQLite engine/session
├── init_db.py              # Seed: 28 scripts + 8 trends
├── requirements.txt        # Dependências Python
├── .env                    # Chaves (não commitar)
├── AGENTS.md               # Este arquivo
├── README.md               # Visão geral do projeto
├── routers/                # Endpoints FastAPI
│   ├── trends.py
│   ├── scripts.py
│   ├── videos.py
│   ├── calendar.py
│   └── config.py
├── services/               # Lógica de negócio
│   ├── apify_scraper.py
│   ├── ai_writer.py
│   └── video_pipeline.py
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── Footer.tsx
│   │   └── pages/
│   │       ├── Home.tsx
│   │       ├── Roteiros.tsx
│   │       ├── Inteligencia.tsx
│   │       ├── Editor.tsx
│   │       ├── Calendario.tsx
│   │       └── Config.tsx
│   └── ...
├── uploads/                # Vídeos originais
├── outputs/                # Vídeos processados
└── docs/                   # Documentação completa
```

### 3.3 Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Status do sistema |
| GET | `/api/trends/` | Lista tendências (DB) |
| POST | `/api/trends/refresh` | Raspa Apify + salva no DB |
| GET | `/api/scripts/` | Lista scripts (filtros: category, search) |
| POST | `/api/scripts/generate-ai` | Gera roteiro com IA (OpenAI) |
| POST | `/api/scripts/{id}/copy` | Copia roteiro (retorna texto completo) |
| POST | `/api/videos/upload` | Upload de vídeo (inicia processamento) |
| GET | `/api/videos/{id}/status` | Status do processamento |
| GET | `/api/videos/{id}/download` | Download do vídeo processado |
| GET | `/api/calendar/` | Lista eventos (filtros: month, year) |
| POST | `/api/calendar/` | Cria evento |
| DELETE | `/api/calendar/{id}` | Remove evento |
| GET | `/api/config/` | Mostra config atual (chaves mascaradas) |
| POST | `/api/config/` | Atualiza chaves (salva em .env) |

### 3.4 Modelos de dados (SQLite)

**scripts:** `id, title, hook, body, cta, cta_keyword, category, content_format, visual_format, source_usa, adaptation_note, caption, hashtags, created_at, times_copied`

**trends:** `id, title, source, channel, url, summary, brazil_adaptation, adaptation_angle, suggested_format, priority_score, is_new, scraped_at`

**videos:** `id, original_filename, processed_filename, status, file_size_mb, duration_seconds, transcript, srt_content, settings, error_message, created_at, completed_at`

**calendar_events:** `id, title, event_date, content_format, platform, status, script_id, notes, created_at`

### 3.5 Pipelines principais

**Pipeline de vídeo:**
```
Upload MP4 → Transcrição Whisper → Encontra cortes (hesitações/pausas)
                                       ↓
Exporta MP4 ← Queima legendas SRT ← Gera SRT com timestamps
                                       ↑
FFmpeg concatena ← Corta segmentos no silêncio
```

**Pipeline de scraping:**
```
Usuário clica "Atualizar" → Apify Google Search Scraper → Parse resultados
                                                          ↓
Salva no DB ← OpenAI enriquece com adaptação BR
```

**Pipeline de geração de roteiro:**
```
Usuário digita tema → OpenAI GPT-4o-mini → Roteiro completo → Salva no DB
```

### 3.6 Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Não | Gera roteiros + transcrição Whisper |
| `APIFY_API_TOKEN` | Não | Scraping de tendências |
| `DATABASE_URL` | Não | URL do DB (padrão: `sqlite:///./gilcfp.db`) |

---

## 4. Padrões e convenções

### 4.1 Código

- Backend em **Python 3.11+** com FastAPI e SQLAlchemy.
- Frontend em **React + TypeScript + Vite + Tailwind CSS**.
- Banco de dados **SQLite** local (`gilcfp.db`).
- Rotas da API prefixadas com `/api/`.
- Arquivos de upload em `uploads/`, saídas em `outputs/`.
- Chaves de API nunca são commitadas; usam `.env`.

### 4.2 Tom de conteúdo gerado

Qualquer texto, roteiro, legenda ou CTA gerado pelo sistema deve seguir o tom de voz do Gilberto (seção 2.3). Conteúdo genérico, formal ou com promessas vagas deve ser rejeitado.

### 4.3 Formato de roteiro

- **Hook (0-3s):** para o scroll, frase de impacto, sem apresentação.
- **Corpo (3-50s):** 2-3 blocos de contexto/problema → solução → resultado.
- **CTA (últimos 10s):** "Comenta [PALAVRA] que eu te mando [RECURSO]".

### 4.4 CTA e palavras-chave

| Palavra | O que entrega |
|---------|---------------|
| CODE | Template/skill do Claude Code |
| N8N | Template do workflow n8n |
| AUTO | Guia de automação |
| SETUP | Setup completo da ferramenta |
| GRATIS | Recurso gratuito (checklist, template) |

---

## 5. Agentes / Skills

O projeto prevê três skills para automação do conteúdo:

1. **content-scout-eua:** raspa fontes dos EUA para encontrar temas em alta.
2. **script-writer-gil:** adapta conteúdo para o tom do Gilberto e gera roteiros.
3. **video-editor-ai:** pipeline de edição de vídeo automatizado.

Detalhes completos em [`docs/agentes.md`](docs/agentes.md).

---

## 6. Fluxos de trabalho principais

1. **Produzir Conteúdo (mais comum):** dashboard → roteiros → copia → grava → editor → download → publica → marca no calendário.
2. **Descobrir Tema Novo:** aba "Inteligência" → atualiza tendências → escolhe tema → gera roteiro → grava.
3. **Gravar Sem Roteiro:** grava freestyle → transcreve → gera legenda → exporta.
4. **Planejar Semana:** calendário → adiciona eventos → linka roteiros → grava na ordem.

Detalhes completos em [`docs/fluxos.md`](docs/fluxos.md).

---

## 7. Tarefas comuns para agentes

| Tarefa | Onde atuar | Observações |
|--------|------------|-------------|
| Adicionar novo endpoint | `routers/`, `services/`, `models.py` | Sempre prefixar com `/api/` |
| Modificar modelo do DB | `models.py` + `init_db.py` | SQLite exige recriação ou migração manual |
| Alterar geração de roteiros | `services/ai_writer.py` | Preservar tom de voz do Gilberto |
| Alterar pipeline de vídeo | `services/video_pipeline.py` | Requer FFmpeg instalado |
| Adicionar scraping | `services/apify_scraper.py` | Usa Apify Google Search Scraper |
| Mudar frontend | `frontend/src/pages/` | React + TypeScript + Tailwind |
| Deploy | `docs/setup.md` | Render ou Docker local |

---

## 8. Serviços externos e custos

| Serviço | Uso | Custo estimado |
|---------|-----|----------------|
| OpenAI Whisper | Transcrição de vídeo | ~$0.006/min |
| OpenAI GPT-4o-mini | Geração de roteiros | ~$0.01/roteiro |
| Apify | Scraping de tendências | $5 grátis/mês |
| FFmpeg | Edição de vídeo | Grátis |
| Render | Hospedagem | $7/mês ou grátis |

**Custo mensal estimado (produção ativa):** $10-30.

---

## 9. Restrições e cuidados

- Sem chaves de API, o sistema funciona 100% com os 28 roteiros e 8 trends pré-carregados.
- Nunca commite `.env`, `*.db`, `uploads/` ou `outputs/`.
- O painel de config mascara as chaves (`sk-abc...xyz`).
- O frontend em produção é servido como arquivos estáticos pelo FastAPI (`index.html` na raiz).

---

## 10. Documentação completa

- [`docs/index.md`](docs/index.md) — Índice da documentação
- [`docs/context.md`](docs/context.md) — Perfil, persona e projetos do Gilberto
- [`docs/arquitetura.md`](docs/arquitetura.md) — Arquitetura técnica detalhada
- [`docs/fluxos.md`](docs/fluxos.md) — Fluxos de trabalho
- [`docs/estrategia.md`](docs/estrategia.md) — Estratégia de conteúdo
- [`docs/agentes.md`](docs/agentes.md) — Agentes e skills
- [`docs/setup.md`](docs/setup.md) — Setup, deploy e configuração
