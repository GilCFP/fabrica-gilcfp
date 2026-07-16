> **INSTRUÇÃO OBRIGATÓRIA:** Qualquer alteração nas telas, endpoints ou pipelines deve preservar os fluxos descritos aqui.

# Fluxos de Trabalho — Fábrica GilCFP

## FLUXO 1: Produzir Conteúdo (mais comum)

```
1. Gilberto abre o dashboard → aba "Roteiros"
2. Escolhe um dos 28 roteiros (filtra por categoria)
3. Copia o roteiro (clica no botão "Copiar")
4. Grava 1 take no celular (pode errar, hesitar)
5. Envia o vídeo para a aba "Editor"
6. Sistema processa automaticamente:
   - Transcreve com Whisper
   - Corta "eh", "ah", pausas longas
   - Aplica jump cuts
   - Gera legendas estilo Hormozi
   - Exporta em 9:16 (1080x1920)
7. Baixa o vídeo pronto
8. Posta no Instagram/LinkedIn
9. Marca como "publicado" no calendário
```

**Endpoint envolvido:** `POST /api/videos/upload`

---

## FLUXO 2: Descobrir Tema Novo

```
1. Gilberto abre a aba "Inteligência"
2. Clica "Atualizar Tendências"
3. Sistema raspa fontes dos EUA (Apify)
4. Mostra temas em alta com sugestão de adaptação para o BR
5. Gilberto escolhe um tema
6. Pode:
   a) Usar o roteiro sugerido direto
   b) Clicar "Gerar com IA" → sistema cria roteiro no tom dele
7. Grava e segue FLUXO 1 a partir do passo 4
```

**Endpoints envolvidos:** `POST /api/trends/refresh`, `POST /api/scripts/generate-ai`

---

## FLUXO 3: Gravar Sem Roteiro (Freestyle)

```
1. Gilberto grava vídeo falando livremente sobre um tema
2. Envia para o editor
3. Sistema transcreve e mostra o que ele falou
4. Gera legenda otimizada automaticamente
5. Exporta com legendas e cortes
```

**Endpoint envolvido:** `POST /api/videos/upload`

---

## FLUXO 4: Planejar Semana

```
1. Abre a aba "Calendário"
2. Adiciona eventos: data, tema, formato, plataforma
3. Pode linkar a um roteiro existente
4. Exporta/visualiza a semana
5. Grava os roteiros na ordem do calendário
```

**Endpoints envolvidos:** `GET /api/calendar/`, `POST /api/calendar/`, `DELETE /api/calendar/{id}`

---

## Integração ManyChat (futuro)

```
[Reel publicado]
    ↓
[Usuário comenta "N8N"]
    ↓
[ManyChat captura comentário]
    ↓
[DM automática com template]
    ↓
[Lead salvo no banco]
    ↓
[Segmentação: interessado em n8n]
```

> **Status:** não implementado. Deve ser adicionado como nova tabela/endpoint quando priorizado.

---

## Custos operacionais

| Serviço | Custo por uso | Frequência |
|---------|---------------|------------|
| OpenAI Whisper | ~$0.006/min | Por vídeo enviado |
| OpenAI GPT-4o-mini | ~$0.01/roteiro | Por roteiro gerado |
| Apify | $5 grátis/mês | Por refresh de trends |
| FFmpeg | Grátis | Sempre |
| Hosting (Render) | $7/mês ou grátis | Fixo |

**Custo estimado mensal (produção ativa):** $10-30.
