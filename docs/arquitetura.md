# Arquitetura — Fábrica GilCFP

## Visão Geral

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (React Frontend)                   │
│  Dashboard │ Roteiros │ Inteligência │ Editor │ Calendário   │
│                                                             │
│  Config (chaves OpenAI/Apify)                               │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch() / REST API
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Python)                   │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ /api/trends │ │/api/scripts │ │   /api/videos       │   │
│  │             │ │             │ │                     │   │
│  │ Apify scrap │ │ AI generate │ │ Upload → Whisper    │   │
│  │ (real-time) │ │ (OpenAI)    │ │ → FFmpeg → Export   │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │/api/calendar│ │ /api/config │ │    /api/health      │   │
│  │             │ │             │ │                     │   │
│  │ CRUD events │ │ Save keys   │ │ Status check        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SQLite (gilcfp.db)                      │    │
│  │  scripts │ trends │ videos │ calendar_events         │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐   ┌──────────┐   ┌──────────┐
    │ Apify   │   │ OpenAI   │   │ FFmpeg   │
    │ (scrap) │   │ (GPT +   │   │ (video   │
    │         │   │ Whisper) │   │ editing) │
    └─────────┘   └──────────┘   └──────────┘
```

## Rotas da API

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

## Banco de Dados (SQLite)

### Tabela: scripts
```
id, title, hook, body, cta, cta_keyword, category, content_format,
visual_format, source_usa, adaptation_note, caption, hashtags,
created_at, times_copied
```

### Tabela: trends
```
id, title, source, channel, url, summary, brazil_adaptation,
adaptation_angle, suggested_format, priority_score, is_new, scraped_at
```

### Tabela: videos
```
id, original_filename, processed_filename, status, file_size_mb,
duration_seconds, transcript, srt_content, settings, error_message,
created_at, completed_at
```

### Tabela: calendar_events
```
id, title, event_date, content_format, platform, status, script_id, notes, created_at
```

## Pipeline de Vídeo

```
[Upload MP4] → [Transcrição Whisper API] → [Encontra cortes (hesitações + pausas)]
                                                                    ↓
[Exporta MP4 pronto] ← [Queima legendas SRT] ← [Gera SRT com timestamps]
                                                                    ↑
[FFmpeg concatena segmentos] ← [Corta segmentos no silêncio]
```

## Pipeline de Scraping

```
[Usuário clica "Atualizar"] → [Apify Google Search Scraper]
                                          ↓
[Salva no DB] ← [OpenAI enriquece com adaptação BR] ← [Parse resultados]
```

## Pipeline de Geração de Roteiro

```
[Usuário digita tema] → [OpenAI GPT-4o-mini]
                                ↓
[Prompt com contexto do Gil] → [Roteiro completo]
                                ↓
                        [Salva no DB] → [Retorna pro frontend]
```

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Não | Chave da OpenAI (roteiros + transcrição) |
| `APIFY_API_TOKEN` | Não | Token do Apify (scraping) |
| `DATABASE_URL` | Não | URL do DB (default: sqlite:///./gilcfp.db) |
