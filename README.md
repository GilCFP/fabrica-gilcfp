# Fábrica GilCFP

Fábrica de roteiros virais para personal branding em IA.

> **Para agentes e desenvolvedores que assumirem este projeto:** leia [`AGENTS.md`](AGENTS.md) antes de qualquer alteração. Ele contém o contexto essencial sobre domínio, arquitetura, padrões e restrições.

---

## O que faz

A Fábrica GilCFP ajuda Gilberto de Carvalho (GilCFP) a criar conteúdo para Instagram e LinkedIn a partir do que já está viralizando na web:

- **Descoberta de conteúdo viral:** busca vídeos e discussões em alta no YouTube e Hacker News.
- **Inteligência de ângulos:** para cada fonte, propõe 2 ângulos de adaptação no tom do Gil.
- **Geração de roteiros:** cria hook, corpo, CTA, caption e hashtags usando GPT-4o-mini.
- **Aprovação humana:** o Gil revisa e aprova antes de gravar.
- **Edição externalizada:** envia o vídeo bruto para OpusClip (API REST), que corta, adiciona legendas e entrega shorts prontos.
- **Calendário editorial:** planeja datas, formatos, plataformas e linka roteiros.

---

## Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Discovery:** YouTube Data API, Hacker News (Algolia)
- **IA:** OpenAI GPT-4o-mini
- **Edição de vídeo:** OpusClip API (REST)
- **Fallback legado:** FFmpeg + OpenAI Whisper + Apify

---

## Rodar local

### Sem Docker

```bash
# Terminal 1 — Backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend (dev mode)
cd frontend
npm install
npm run dev
```

Acesse:

- Dashboard: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Com Docker

```bash
cd frontend
npm install
npm run build
cd ..
cp -r frontend/dist/* .
docker-compose up
```

> Sem chaves de API, o sistema funciona 100% com os 28 roteiros e 8 trends pré-carregados.

---

## Documentação

- [`AGENTS.md`](AGENTS.md) — Contexto essencial para agentes
- [`docs/index.md`](docs/index.md) — Índice da documentação completa
- [`docs/context.md`](docs/context.md) — Perfil, persona e projetos do Gilberto
- [`docs/arquitetura.md`](docs/arquitetura.md) — Arquitetura técnica detalhada
- [`docs/fluxos.md`](docs/fluxos.md) — Fluxos de trabalho
- [`docs/estrategia.md`](docs/estrategia.md) — Estratégia de conteúdo
- [`docs/agentes.md`](docs/agentes.md) — Agentes e skills
- [`docs/setup.md`](docs/setup.md) — Setup completo, deploy e configuração

---

## Configuração de chaves

Copie `.env.example` para `.env` (ou use a aba **Config** no dashboard):

```env
OPENAI_API_KEY=sk-sua-chave-aqui
YOUTUBE_API_KEY=sua-chave-aqui
OPUSCLIP_API_KEY=sua-chave-aqui
APIFY_API_TOKEN=sua-token-aqui  # opcional, fallback legado
DATABASE_URL=sqlite:///./gilcfp.db
```

| Serviço | Para que serve | Onde pegar |
|---------|----------------|------------|
| OpenAI | Gera ângulos e roteiros | https://platform.openai.com/api-keys |
| YouTube Data API | Discovery de vídeos virais | https://console.cloud.google.com/apis/credentials |
| OpusClip | Edição externalizada de vídeo | https://www.opus.pro/api (plano pago) |
| Apify | Fallback legado de scraping | https://console.apify.com |

---

## Estrutura do projeto

```
fabrica-gilcfp/
├── main.py                 # FastAPI app
├── models.py               # Modelos SQLAlchemy
├── database.py             # Config SQLite
├── init_db.py              # Seed inicial
├── routers/                # Endpoints da API
├── services/               # Lógica de negócio
├── frontend/               # React + Vite
├── docs/                   # Documentação
├── uploads/                # Vídeos originais
└── outputs/                # Vídeos processados
```

---

## Deploy

Veja instruções completas em [`docs/setup.md`](docs/setup.md).

Deploy rápido no Render via `render.yaml`.

---

## Licença

Uso interno do projeto GilCFP.
