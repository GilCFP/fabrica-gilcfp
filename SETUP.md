# Setup Completo - Fábrica GilCFP

## Rodar Local (passo a passo)

### 1. Clone o repo

```bash
git clone https://github.com/GilCFP/fabrica-gilcfp.git
cd fabrica-gilcfp
```

### 2. Configure as chaves de API (opcional)

```bash
cp .env.example .env
# Edite .env com suas chaves:
# OPENAI_API_KEY=sk-sua-chave-aqui
# APIFY_API_TOKEN=sua-token-aqui
```

Sem as chaves, o sistema funciona com **28 roteiros e 8 trends pré-carregados**.

### 3. Rode o Backend

**Com Docker (recomendado):**
```bash
# Primeiro build o frontend
cd frontend
npm install
npm run build
cd ..
cp -r frontend/dist/* .

# Depois rode
docker-compose up
```

**Sem Docker:**
```bash
# Terminal 1 - Backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend (dev mode)
cd frontend
npm install
npm run dev
# Acesse http://localhost:3000
```

### 4. Acesse

- **Dashboard:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 5. Configure as chaves via UI

Acesse a aba **Config** no dashboard e adicione suas chaves da OpenAI e Apify.

## Configuração de Chaves

| Serviço | Pra que serve | Custo | Onde pegar |
|---|---|---|---|
| **OpenAI** | Gera roteiros com IA + transcrição de vídeo | ~$0.36/vídeo de 60s | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Apify** | Scraping de tendências dos EUA em tempo real | $5 grátis/mês | [console.apify.com](https://console.apify.com) |

## Estrutura do Projeto

```
fabrica-gilcfp/
├── main.py                 # FastAPI app
├── models.py               # DB models (Script, Trend, Video, Calendar)
├── init_db.py              # Seed: 28 scripts + 8 trends
├── database.py             # SQLite config
├── requirements.txt        # Python deps
├── Dockerfile              # Container
├── docker-compose.yml      # Docker orchestration
├── render.yaml             # Deploy 1-click no Render
├── .env.example            # Template de config
├── routers/                # API endpoints
│   ├── trends.py           # Scraping de tendências
│   ├── scripts.py          # CRUD + geração AI
│   ├── videos.py           # Upload + processamento
│   ├── calendar.py         # Calendário editorial
│   └── config.py           # Painel de config
├── services/               # Lógica de negócio
│   ├── apify_scraper.py    # Scraping Apify
│   ├── ai_writer.py        # Geração de roteiros com IA
│   └── video_pipeline.py   # FFmpeg + Whisper
├── frontend/               # React source
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Layout.tsx
│       │   └── Footer.tsx
│       └── pages/
│           ├── Home.tsx
│           ├── Roteiros.tsx
│           ├── Inteligencia.tsx
│           ├── Editor.tsx
│           ├── Calendario.tsx
│           └── Config.tsx
└── index.html              # Frontend buildado (gerado pelo npm run build)
```

## Segurança

- `.gitignore` exclui: `.env`, `*.db`, `uploads/`, `outputs/`
- Chaves são salvas em `.env` local — nunca commitadas no repo
- Painel de config máscara as chaves (`sk-abc...xyz`)
- Sem chaves, o sistema funciona 100% com dados pré-carregados

## Deploy na Nuvem (Render)

1. Fork este repo no GitHub
2. Crie um serviço Web no [Render](https://render.com)
3. Conecte seu fork do GitHub
4. Adicione as env vars no painel: `OPENAI_API_KEY` e `APIFY_API_TOKEN`
5. O `render.yaml` já está configurado com o Dockerfile
