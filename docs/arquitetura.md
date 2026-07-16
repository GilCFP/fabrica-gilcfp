> **INSTRUÇÃO OBRIGATÓRIA:** Antes de alterar qualquer endpoint, modelo ou serviço, leia este arquivo.

# Arquitetura — Fábrica GilCFP

## Visão geral (pós-pivot)

O produto pivotou de **editor de vídeo local** para **fábrica de roteiros virais baseada em conteúdo real da web**. A edição de vídeo passa a ser externalizada via OpusClip (API REST). O core é o pipeline de roteirização.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BROWSER (React Frontend)                          │
│  Dashboard │ Roteiros │ Inteligência │ Editor Local (Legado)        │
│  Calendário │ OpusClip (futuro)                                     │
│                                                                     │
│  Config (chaves OpenAI/YouTube/OpusClip)                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │ fetch() / REST API
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Python)                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DISCOVERY LAYER                           │   │
│  │  YouTube Data API │ Hacker News (Algolia) │ Reddit (P1)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  filtering.py  →  transcription.py  →  angle_generator.py   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ai_writer.py  →  scripts (hook/body/CTA/caption/hashtags)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Aprovação humana  →  gravação  →  OpusClip (long-to-short) │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐   │
│  │/api/trends  │ │/api/scripts │ │   /api/videos               │   │
│  │             │ │             │ │   local (legado)            │   │
│  │ discovery   │ │ generate    │ │   opusclip                  │   │
│  └─────────────┘ └─────────────┘ └─────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              SQLite (gilcfp.db)                              │   │
│  │  scripts │ trends │ videos │ calendar_events                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Rotas da API

### Roteiros e inteligência

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Status do sistema |
| GET | `/api/trends/` | Lista fontes descobertas (ordenadas por engagement_score) |
| POST | `/api/trends/refresh` | Dispara discovery em YouTube + Hacker News e persiste no DB |
| POST | `/api/trends/{id}/angles` | Gera 2 ângulos de adaptação para uma fonte |
| GET | `/api/scripts/` | Lista roteiros (filtros: `category`, `search`) |
| POST | `/api/scripts/generate-ai` | Gera roteiro manualmente a partir de um tema |
| POST | `/api/scripts/from-trend/{trend_id}?angle_index=0` | Gera roteiro a partir de uma fonte + ângulo |
| POST | `/api/scripts/{id}/approve` | Altera status do roteiro (`draft`, `approved`, `rejected`, `recorded`, etc) |
| POST | `/api/scripts/{id}/copy` | Copia roteiro (retorna texto completo) |

### Vídeos

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/videos/upload` | Upload de vídeo. Aceita `editor_type=local` (padrão) ou `editor_type=opusclip` |
| GET | `/api/videos/{id}/status` | Status do processamento local |
| GET | `/api/videos/{id}/preview` | Preview do arquivo original durante o processamento |
| GET | `/api/videos/{id}/download` | Download do vídeo processado localmente |
| POST | `/api/videos/{id}/schedule` | Cria evento draft no calendário a partir do vídeo |
| POST | `/api/videos/{id}/edit-opusclip` | Envia vídeo bruto para edição na OpusClip |
| GET | `/api/videos/{id}/edit-status` | Consulta status do job OpusClip |

### Calendário

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/calendar/` | Lista eventos (filtros: `month`, `year`) |
| POST | `/api/calendar/` | Cria evento |
| POST | `/api/calendar/{event_id}/attach-video/{video_id}` | Anexa vídeo processado a um evento |
| DELETE | `/api/calendar/{id}` | Remove evento |

### Configuração

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/config/` | Mostra config atual (chaves mascaradas) |
| POST | `/api/config/` | Atualiza chaves (salva em `.env`) |

---

## Pipeline de roteiros (core)

```text
DISCOVERY (YouTube + HN)
        ↓
FILTERING (engagement_score = engagement / idade * relevância)
        ↓
TRANSCRIPTION (YouTube captions / Whisper fallback / HN texto)
        ↓
ANGLE GENERATION (2 ângulos no tom do Gil)
        ↓
SCRIPT WRITING (hook/body/CTA/caption/hashtags)
        ↓
APROVAÇÃO HUMANA (status: draft → approved)
        ↓
GRAVAÇÃO / EDIÇÃO OPUSCLIP
```

A máquina sugere; o Gil aprova e grava. Nenhum roteiro é publicado automaticamente.

---

## Banco de dados (SQLite)

### Tabela: `scripts`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | Integer | PK |
| `title` | String(200) | Título do roteiro |
| `hook` | Text | Hook inicial |
| `body` | Text | Corpo do roteiro |
| `cta` | String(200) | Call to action |
| `cta_keyword` | String(50) | Palavra do CTA |
| `category` | String(50) | Categoria |
| `content_format` | String(50) | Formato do conteúdo (ex: reel_60) |
| `visual_format` | Text | Descrição visual sugerida |
| `source_usa` | String(200) | Fonte original |
| `adaptation_note` | Text | Nota de adaptação |
| `caption` | Text | Legenda para post |
| `hashtags` | String(500) | Hashtags |
| `created_at` | DateTime | Data de criação |
| `times_copied` | Integer | Quantas vezes foi copiado |
| `trend_id` | Integer | FK para `trends` (fonte viral) |
| `angle_index` | Integer | Ângulo escolhido |
| `source_url` | String(500) | URL da fonte original |
| `source_platform` | String(50) | Origem (`youtube`, `hackernews`, etc) |
| `generation_mode` | String(50) | `manual` ou `from_trend` |
| `status` | String(50) | `draft`, `approved`, `rejected`, `recorded`, `scheduled`, `published` |

### Tabela: `trends`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | Integer | PK |
| `title` | String(300) | Título da fonte |
| `platform` | String(50) | Origem (`youtube`, `hackernews`) |
| `source` | String(100) | Alias da origem |
| `channel` | String(200) | Canal/autor |
| `url` | String(500) | URL da fonte |
| `summary` | Text | Resumo do conteúdo |
| `external_id` | String(200) | ID na plataforma externa |
| `raw_metadata` | JSON | Métricas brutas |
| `engagement_score` | Float | Score normalizado |
| `content_age_hours` | Integer | Idade do conteúdo |
| `transcript_summary` | Text | Transcrição/resumo usado nos prompts |
| `angles_generated` | JSON | Ângulos gerados |
| `used_in_script_id` | Integer | FK para `scripts` |
| `scraped_at` | DateTime | Data da descoberta |

### Tabela: `videos`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | Integer | PK |
| `original_filename` | String(200) | Nome do arquivo original |
| `processed_filename` | String(200) | Nome do arquivo processado |
| `status` | String(50) | `uploaded`, `processing`, `completed`, `error` |
| `file_size_mb` | Float | Tamanho do arquivo |
| `duration_seconds` | Integer | Duração |
| `settings` | JSON | Configurações do processamento local |
| `script_id` | Integer | Roteiro vinculado |
| `editor_type` | String(50) | `local` ou `opusclip` |
| `opusclip_job_id` | String(200) | ID do job na OpusClip |
| `opusclip_status` | String(50) | Status do job externo |
| `opusclip_result_url` | String(500) | URL do clip pronto |
| `created_at` | DateTime | Data de upload |
| `completed_at` | DateTime | Data de conclusão |

---

## Serviços

- `services/discovery/youtube.py` — busca vídeos shorts no YouTube Data API.
- `services/discovery/hackernews.py` — busca stories no HN via Algolia.
- `services/discovery/aggregator.py` — une fontes, normaliza e deduplica.
- `services/filtering.py` — calcula engagement_score e ranqueia.
- `services/transcription.py` — extrai transcrição/resumo da fonte.
- `services/angle_generator.py` — gera 2 ângulos com GPT-4o-mini.
- `services/ai_writer.py` — gera roteiro completo a partir de fonte + ângulo.
- `services/opusclip_client.py` — cliente da API OpusClip (P1).
- `services/video_pipeline.py` — edição local FFmpeg+Whisper (**legado**).
- `services/apify_scraper.py` — scraper legado via Apify (fallback opcional).

---

## Edição de vídeo: OpusClip vs Local

### OpusClip (recomendado)
- **Caso de uso**: transformar vídeos longos gravados pelo Gil em shorts/reels.
- **Integração**: API REST (`services/opusclip_client.py`).
- **Credencial**: `OPUSCLIP_API_KEY` (plano pago).
- **Status**: implementado, aguardando teste com conta paga.

### Local (legado)
- **Caso de uso**: fallback para transcrição/legendas simples.
- **Tecnologia**: FFmpeg + OpenAI Whisper.
- **Status**: mantido funcional, mas não é mais core. Será removido após validação da OpusClip.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Sim | Geração de ângulos e roteiros |
| `YOUTUBE_API_KEY` | Sim (P0) | Discovery no YouTube |
| `OPUSCLIP_API_KEY` | Sim (P1) | Edição externalizada |
| `APIFY_API_TOKEN` | Não | Fallback legado |
| `DATABASE_URL` | Não | SQLite padrão |

---

## Próximos passos técnicos

1. P0 validado: discovery + ângulos + roteiros no tom do Gil.
2. P1: ativar OpusClip com conta paga e testar fluxo end-to-end.
3. P2: adicionar LinkedIn/Twitter como fontes; fila assíncrona.
4. P3: analytics pós-publicação; A/B de hooks; MCP opcional.
