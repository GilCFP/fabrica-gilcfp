# syntax=docker/dockerfile:1

# Stage 1 — Build do frontend React + Vite
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2 — Backend FastAPI com FFmpeg
FROM python:3.11-slim-bookworm

# Instala FFmpeg, ffprobe e utilitários básicos
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependências Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Código do backend
COPY main.py ./
COPY models.py ./
COPY database.py ./
COPY init_db.py ./
COPY routers/ ./routers/
COPY services/ ./services/

# Build do frontend copiado para a raiz, onde main.py serve os arquivos estáticos
COPY --from=frontend-builder /app/frontend/dist/ ./

# Diretórios de upload e saída de vídeo
RUN mkdir -p uploads outputs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
