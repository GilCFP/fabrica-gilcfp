> **INSTRUÇÃO OBRIGATÓRIA:** Antes de rodar o projeto, configure as variáveis de ambiente conforme descrito abaixo.

# Setup Completo — Fábrica GilCFP

## Rodar local

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

### 3. Rode o backend

**Com Docker (recomendado — já inclui FFmpeg e build do frontend):**

```bash
cp .env.example .env
# Edite .env com suas chaves:
# OPENAI_API_KEY=sk-sua-chave-aqui
# APIFY_API_TOKEN=sua-token-aqui

# Suba a aplicação completa (backend + frontend estático + FFmpeg)
docker compose up --build
```

Acesse http://localhost:8000.

**Sem Docker:**

```bash
# Terminal 1 — Backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend (dev mode)
cd frontend
npm install
npm run dev
# Acesse http://localhost:3000
```

### FFmpeg no ambiente local

O processamento de vídeo exige o FFmpeg e o ffprobe instalados. Ao usar Docker, eles já vêm no container. Para rodar sem Docker, instale manualmente:

**macOS (Homebrew):**

```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update && sudo apt install -y ffmpeg
```

**Linux (Fedora):**

```bash
sudo dnf install -y ffmpeg
```

**Windows:**

1. Baixe o build completo em https://www.gyan.dev/ffmpeg/builds/ ou em https://github.com/BtbN/FFmpeg-Builds/releases.
2. Extraia o arquivo e adicione a pasta `bin` à variável de ambiente `PATH`.
3. Verifique a instalação no PowerShell:

```powershell
ffmpeg -version
ffprobe -version
```

### 4. Acesse

- **Dashboard:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 5. Configure as chaves via UI

Acesse a aba **Config** no dashboard e adicione suas chaves da OpenAI e Apify.

---

## Configuração de chaves

| Serviço | Para que serve | Custo | Onde pegar |
|---------|----------------|-------|------------|
| **OpenAI** | Gera roteiros com IA + transcrição de vídeo | ~$0.36/vídeo de 60s | https://platform.openai.com/api-keys |
| **Apify** | Scraping de tendências dos EUA em tempo real | $5 grátis/mês | https://console.apify.com |

---

## Estrutura do projeto

```
fabrica-gilcfp/
├── main.py                 # FastAPI app
├── models.py               # DB models (Script, Trend, Video, Calendar)
├── database.py             # SQLite config
├── init_db.py              # Seed: 28 scripts + 8 trends
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

---

## Segurança

- `.gitignore` exclui: `.env`, `*.db`, `uploads/`, `outputs/`
- Chaves são salvas em `.env` local — nunca commitadas no repo
- Painel de config mascara as chaves (`sk-abc...xyz`)
- Sem chaves, o sistema funciona 100% com dados pré-carregados

---

## Deploy na nuvem (Render)

1. Fork este repo no GitHub.
2. Crie um serviço Web no [Render](https://render.com).
3. Conecte seu fork do GitHub.
4. Adicione as env vars no painel: `OPENAI_API_KEY` e `APIFY_API_TOKEN` (opcionais). O `DATABASE_URL` usa o padrão `sqlite:///./gilcfp.db`.
5. O `render.yaml` está na raiz e configura o serviço com o Dockerfile.

---

## Troubleshooting

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| Vídeo não processa | `OPENAI_API_KEY` ausente | Configure a chave em `.env` ou na aba Config |
| Trends não atualizam | `APIFY_API_TOKEN` ausente | Configure o token em `.env` ou na aba Config |
| Frontend não carrega | Build não copiado para raiz | Rode `npm run build` e `cp -r frontend/dist/* .` |
| Erro de CORS | Origens bloqueadas | Verifique `allow_origins=["*"]` em `main.py` |
| DB bloqueado | Outro processo usando `gilcfp.db` | Pare a outra instância do uvicorn |
| FFmpeg não encontrado | Ambiente sem FFmpeg no PATH | Use Docker (`docker compose up --build`) ou instale o FFmpeg conforme a seção acima |
