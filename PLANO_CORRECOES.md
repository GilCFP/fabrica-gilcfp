# Plano de Correções — Fábrica GilCFP

> **Objetivo:** deixar o projeto testável de ponta a ponta, corrigindo os bugs críticos e gaps de implementação identificados na auditoria.

---

## 1. Contexto

A auditoria comparou o que está documentado (`AGENTS.md`, `docs/`) com o código real (`routers/`, `services/`, `frontend/`). Foram encontrados bugs e gaps que impedem o teste ponta a ponta dos fluxos principais.

---

## 2. Problemas mapeados e soluções

### Problema 1 — Pipeline de vídeo nunca é executado

**Local:** `routers/videos.py`, `services/video_pipeline.py`

**Comportamento atual:** `POST /api/videos/upload` apenas salva o arquivo e retorna `status: "uploaded"`. Nenhum processamento é iniciado. O status nunca muda para `completed`, e o download nunca funciona.

**Solução:**
- Criar uma função `process_video(video_id: int)` em `services/video_pipeline.py` que:
  1. Crie uma **nova sessão SQLAlchemy** (`SessionLocal()`) — a sessão do request não pode ser reutilizada em background task.
  2. Busque o vídeo no banco e atualize `status` para `"processing"`.
  3. Extraia áudio com FFmpeg, rodando em thread separada (`asyncio.to_thread`) para não bloquear o event loop.
  4. Transcreva com Whisper (`transcribe_with_whisper`).
  5. Encontre cortes de hesitações e pausas (`find_cuts`).
  6. Gere SRT (`generate_srt`) e salve o conteúdo em `video.srt_content`; persistir o arquivo `.srt` em disco temporário para passar ao FFmpeg.
  7. Defina o nome do arquivo processado: `f"{video_id}_processed.mp4"` em `OUTPUT_DIR`.
  8. Processe o vídeo com FFmpeg (`process_video_with_ffmpeg`), em thread separada.
  9. Salve a transcrição em `video.transcript`, `processed_filename` e atualize `status` para `"completed"` e `completed_at`.
  10. Em caso de erro, capture a exceção, atualize `status` para `"error"` e `error_message`, e garanta `db.commit()`.
  11. Faça cleanup em `finally` de todos os arquivos temporários: áudio WAV, SRT temporário, `.seg*.mp4`, `.concat.txt`, `.temp.mp4`.
- No router `videos.py`, após o upload, inicie o processamento em background usando `asyncio.create_task(process_video(video.id))` (ou `BackgroundTasks`). Importar e usar uma `asyncio.Lock` global para evitar processamento simultâneo de múltiplos vídeos no SQLite (`database is locked`).
- Garantir que o processamento seja resiliente a erros (try/except) e nunca derrube a requisição de upload.
- Retornar `status: "processing"` no response do upload (não `"uploaded"`).

**Critérios de aceitação:**
- Upload de vídeo retorna imediatamente com `status: "processing"`.
- `GET /api/videos/{id}/status` eventualmente retorna `status: "completed"` (para vídeos curtos, em ambiente com FFmpeg/OpenAI).
- `GET /api/videos/{id}/download` retorna o vídeo processado quando `status == "completed"`.
- O frontend consegue fazer polling e mostrar o vídeo como concluído.
- FFmpeg/Whisper rodam fora do event loop principal (sem bloquear outras requisições).
- Apenas um vídeo é processado por vez (lock global), evitando `database is locked` no SQLite.
- Arquivos temporários são removidos após o processamento.

---

### Problema 2 — `import json` ausente em `services/apify_scraper.py`

**Local:** `services/apify_scraper.py`, linha 75

**Comportamento atual:** `json.loads` é usado sem importar `json`, causando `NameError` quando a OpenAI retorna sucesso.

**Solução:** Adicionar `import json` no topo do arquivo.

**Critério de aceitação:** `POST /api/trends/refresh` funciona sem erros mesmo quando `OPENAI_API_KEY` está configurada.

---

### Problema 3 — Filtro de calendário quebra com mês/ano

**Local:** `routers/calendar.py`, linhas 25-27

**Comportamento atual:** `CalendarEvent.event_date.year == year` não funciona no SQLAlchemy, retornando 500.

**Solução:** Usar `extract('year', CalendarEvent.event_date) == year` e `extract('month', CalendarEvent.event_date) == month` do SQLAlchemy. Importar `from sqlalchemy import extract`.

**Critério de aceitação:** `GET /api/calendar/?month=7&year=2026` retorna os eventos filtrados sem erro.

---

### Problema 4 — Chaves de API lidas em tempo de importação

**Local:** `services/apify_scraper.py`, `services/ai_writer.py`, `services/video_pipeline.py`

**Comportamento atual:** `OPENAI_API_KEY` e `APIFY_API_TOKEN` são lidos no topo dos módulos. Se o usuário configurar via dashboard, os serviços continuam sem chave até reiniciar.

**Solução:** Remover as variáveis globais no topo e usar `os.environ.get("OPENAI_API_KEY", "")` / `os.environ.get("APIFY_API_TOKEN", "")` dentro das funções que precisam.

**Critério de aceitação:** Configurar a chave via dashboard e, sem reiniciar o servidor, conseguir gerar roteiros, transcrever vídeos e/ou fazer scraping.

---

### Problema 5 — Falta `.env.example`

**Local:** raiz do projeto

**Solução:** Criar `.env.example` com as variáveis documentadas:

```env
# OpenAI — geração de roteiros e transcrição de vídeo
OPENAI_API_KEY=sk-sua-chave-aqui

# Apify — scraping de tendências dos EUA
APIFY_API_TOKEN=sua-token-aqui

# SQLite (padrão)
DATABASE_URL=sqlite:///./gilcfp.db
```

**Critério de aceitação:** `cp .env.example .env` funciona conforme documentado.

---

### Problema 6 — Docker e Docker Compose ausentes

**Local:** raiz do projeto

**Solução:** Criar `Dockerfile` (multi-stage) e `docker-compose.yml` que:
- Usem imagem Python 3.11+ para o backend.
- Instalem FFmpeg e ffprobe no container final.
- Instalem dependências Python.
- Buildem o frontend com Node.js em stage separado.
- Copiem o build do frontend (`frontend/dist/*`) para a raiz do projeto no container, pois `main.py` serve arquivos estáticos da raiz.
- Sirvam o backend na porta 8000.

**Critérios de aceitação:**
- `docker-compose up` sobe a aplicação completa.
- O container tem FFmpeg/ffprobe disponíveis.

---

### Problema 7 — Dependência de FFmpeg no ambiente local

**Local:** ambiente de execução

**Solução:** Documentar no `docs/setup.md` como instalar FFmpeg no macOS/Linux/Windows. Para este ambiente específico (macOS), verificar se é possível instalar via Homebrew ou se o processamento de vídeo só será viável via Docker.

**Critério de aceitação:** Instruções claras de instalação do FFmpeg no setup.

---

### Problema 8 — Content-type errado no upload para Whisper

**Local:** `services/video_pipeline.py`, linha 46

**Comportamento atual:** O áudio extraído é WAV (`pcm_s16le`), mas é enviado para a OpenAI como `audio/mpeg` com nome `audio.mp3`. A API pode rejeitar.

**Solução:** Corrigir o upload para Whisper usando `files={"file": ("audio.wav", f, "audio/wav")}` ou converter o áudio para MP3 antes do upload.

**Critério de aceitação:** A transcrição Whisper funciona sem erro de formato de arquivo.

---

### Problema 9 — Frontend mostra progresso enganoso durante processamento

**Local:** `frontend/src/api/client.ts`, linhas 117-128

**Comportamento atual:** Para qualquer status diferente de `completed` e `uploaded`, o frontend exibe 50% de progresso e o step "Transcrição" como atual, mesmo o vídeo estiver processando há minutos.

**Solução:** Ajustar o mapeamento para que `processing` mostre um estado intermediário honesto (ex: step 0 atual, progresso 15%, sem animar steps futuros). Alternativamente, o backend pode retornar um campo `phase` ou `progress` simples.

**Critério de aceitação:** Durante o processamento, o usuário vê um indicador claro de que o vídeo está sendo processado, sem progresso falso.

---

### Problema 10 — `render.yaml` possivelmente ausente

**Local:** raiz do projeto

**Comportamento atual:** `docs/setup.md` menciona `render.yaml` já configurado. Se o arquivo não existir, o deploy 1-click no Render não funciona.

**Solução:** Verificar existência de `render.yaml`. Se ausente, criar um arquivo básico compatível com o Dockerfile.

**Critério de aceitação:** Deploy no Render pode ser feito via blueprint.

---

## 3. Divisão de tarefas entre agentes

### Agente Arquiteto

- Revisar este plano e validar a abordagem técnica.
- Garantir que as mudanças sigam os padrões do projeto (`AGENTS.md`).
- Identificar riscos adicionais (ex: processamento síncrono vs assíncrono, timeout de upload, cleanup de arquivos temporários).
- Definir se o processamento de vídeo deve usar `asyncio.create_task`, `BackgroundTasks` do FastAPI ou outra abordagem.
- Validar a estrutura do `Dockerfile`/`docker-compose.yml`.

### Agente Desenvolvedor

- Implementar as correções 1, 2, 3 e 4 (backend).
- Criar `.env.example` (correção 5).
- Criar `Dockerfile` e `docker-compose.yml` (correção 6).
- Atualizar `docs/setup.md` com instruções de FFmpeg (correção 7).
- Garantir que todos os testes manuais básicos passem.

---

## 4. Ordem de execução recomendada

1. **Correções rápidas no backend:** `import json`, filtro do calendário, chaves em tempo de execução.
2. **Pipeline de vídeo:** implementar `process_video()` com sessão própria, thread para FFmpeg, lock global, cleanup e acioná-lo no upload.
3. **Ajuste no frontend:** mapear status `processing` de forma honesta.
4. **Infra:** `.env.example`, `Dockerfile`, `docker-compose.yml`, `render.yaml` (se ausente).
5. **Documentação:** atualizar `docs/setup.md` com FFmpeg, Docker e realidade dos arquivos.
6. **Testes ponta a ponta:** subir backend, testar todos os fluxos.

---

## 5. Critérios gerais de aceitação

- [ ] Backend sobe sem erros.
- [ ] `/api/health` reporta `video_processing: true` quando `OPENAI_API_KEY` está configurada.
- [ ] Roteiros listam, copiam e geram via IA.
- [ ] Tendências listam e atualizam sem erros.
- [ ] Upload de vídeo inicia processamento e o status evolui para `completed`.
- [ ] Download do vídeo processado funciona.
- [ ] Calendário filtra por mês/ano sem erros.
- [ ] Configuração de chaves via dashboard funciona sem reiniciar o servidor.
- [ ] Whisper aceita o áudio enviado (content-type correto).
- [ ] Frontend mostra status `processing` de forma honesta durante o processamento.
- [ ] `docker-compose up` sobe a aplicação completa (backend + frontend estático + FFmpeg).
- [ ] `render.yaml` existe e está configurado (se não existir, deve ser criado).
- [ ] Documentação reflete a realidade (`docs/setup.md`, `AGENTS.md` se necessário).

---

## 6. Riscos e observações

- **Processamento síncrono de vídeo:** vídeos longos podem estourar timeout. Para o MVP, aceitar vídeos curtos (< 2 min). Futuramente, migrar para fila (Celery/RQ).
- **Subprocess síncrono no event loop:** FFmpeg/Whisper podem bloquear outras requisições se não rodarem em thread separada. Usar `asyncio.to_thread()` para FFmpeg.
- **Sessão DB fechada na background task:** a sessão do request não pode ser reutilizada. Criar `SessionLocal()` dentro de `process_video()`.
- **SQLite com concorrência de escrita:** múltiplos vídeos processando ao mesmo tempo podem gerar `database is locked`. Usar lock global ou fila única no MVP.
- **Cleanup de arquivos temporários:** o pipeline de FFmpeg gera áudio WAV, SRT, `.seg*.mp4`, `.concat.txt`, `.temp.mp4`. Verificar cleanup em `finally`.
- **Content-type do áudio no Whisper:** enviar WAV como `audio/wav` ou converter para MP3.
- **Frontend com progresso falso:** ajustar mapeamento de `processing` para refletir estado real.
- **Static files no Docker:** `main.py` serve frontend da raiz; build do React deve ser copiado para raiz no container.
- **SQLite em produção:** não é recomendado para concorrência, mas serve para o MVP.
- **CORS:** `allow_origins=["*"]` está aberto. OK para MVP local, mas deve ser restrito em produção.
