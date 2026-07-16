# Pesquisa de Pivot — Fábrica GilCFP (Jul/2026)

## Contexto do pivot

A edição automática local (FFmpeg + Whisper) entregou legendas funcionais, mas o usuário decidiu que o valor real do produto está na **criação de roteiros virais replicáveis**. A edição de vídeo será externalizada para serviços especializados com API/MCP.

## 1. Ferramentas de edição de vídeo com API/MCP

### OpusClip (recomendado principal)
- **Site/API**: https://www.opus.pro/api
- **MCP server oficial**: https://www.opus.pro/mcp — 25 ferramentas para clip, caption, reframe e schedule.
- **Propósito**: transformar vídeos longos em shorts virais (long-to-short), com legendas automáticas, reframing 9:16, B-roll e agendamento.
- **Preço**: plano gratuito com 60 créditos/mês; API acessível nos planos pagos (Pro/Business); ~$1.00–$1.45 por vídeo de 15 min.
- **Fit para Gil**: ele grava vídeos longos (tutoriais, cases, opiniões) e quer extrair reels/shorts prontos para postar. OpusClip é o case de uso ideal.
- **Limitação**: não gera vídeo do zero; precisa de gravação bruta (talking head, podcast, aula).

### Higgsfield AI
- **Propósito**: geração de vídeo a partir de texto/imagem (image-to-video, text-to-video), com modelos Sora 2, Veo 3.1, Kling 2.6.
- **Preço**: a partir de $9/mês; API só no plano Creator ($249/mês).
- **Fit para Gil**: baixo. Não é edição de vídeos gravados; é geração sintética. Não resolve o workflow atual.

### Outras opções avaliadas
| Ferramenta | Propósito | API/MCP | Observação |
|---|---|---|---|
| Descript | Edição por texto, transcrição, overdub | Sim | Bom para podcasts/long-form, menos para shorts virais automáticos. |
| Captions.ai | Legendas e clipping | Limitado | Concorrente do OpusClip, menos maduro em API. |
| Vizard | Alternativa ao OpusClip | Sim | Menos conhecida, pricing similar. |
| CapCut | Editor mobile/desktop | API limitada | Não é programático o suficiente. |

**Decisão preliminar**: adotar **OpusClip** como serviço de edição principal, integrado via API ou MCP. Deixar Higgsfield como opção futura apenas para geração de assets visuais, não como core.

## 2. Fontes de conteúdo viral para roteiros

O problema atual: o scraper Apify retorna resultados genéricos de busca do Google, não vídeos virais reais. Precisamos de fontes que entreguem:
- Título/caption do vídeo.
- Views/likes/shares (engajamento).
- Transcrição ou resumo do conteúdo.
- Nicho alinhado ao GilCFP (IA, produto, dev, automação, carreira).

### Fontes viáveis
1. **TikTok Creative Center / Top Ads**
   - Apify actor oficial: `codebyte/tiktok-creative-center-top-ads-scraper`
   - Entrega anúncios e vídeos em alta com métricas.
   - Requer adaptação para conteúdo orgânico, não só ads.

2. **TikTok unofficial scraper (TikTokApi + playwright)**
   - GitHub: `riyagoelrs/tiktok-scraper`
   - Busca por hashtag, usuário, trending, search.
   - Risco: quebra com mudanças do TikTok; requer `msToken`.

3. **YouTube Data API v3**
   - Busca por keywords, retorna shorts/vídeos com viewCount.
   - Gratuito com quota generosa.
   - Dá para filtrar por data (esta semana/mês) e ordenar por relevância/viewCount.

4. **Reddit (PRAW / Reddit API)**
   - Subreddits: r/artificial, r/MachineLearning, r/ProductManagement, r/SaaS, r/startups
   - Threads em alta são ótimos para ângulos de roteiro (dores reais, discussões polêmicas).

5. **Hacker News (Algolia API)**
   - `https://hn.algolia.com/api`
   - Stories em alta sobre IA/dev/produto nas últimas 24h–7d.
   - Alto sinal, baixo ruído, ótimo para nicho tech/B2B.

6. **Product Hunt**
   - API não oficial / scraping para produtos do dia/semana em IA/automação.

### Estratégia recomendada
- **Combinação YouTube + Hacker News + Reddit** como fontes principais.
- Filtrar por keywords do nicho: `AI automation`, `Claude Code`, `vibe coding`, `n8n`, `AI agents`, `product management`, `cliente americano`.
- Ranquear por engajamento relativo (views, likes, comments, upvotes) e idade do conteúdo.
- Usar OpenAI para resumir e propor ângulo de adaptação para o tom do Gil.

## 3. Frameworks de roteiro viral

Estruturas que se repetem em conteúdo de performance no nicho tech/B2B:

### Hook-Body-CTA (base)
- **Hook (0-3s)**: para o scroll com problema, dado chocante ou promessa concreta.
- **Body (3-50s)**: contexto pessoal, solução, resultado mensurável.
- **CTA (últimos 10s)**: comentar palavra-chave para receber recurso.

### Frameworks de hook testados
1. **Contradição / wrong belief**: "Você acha que X, mas a verdade é Y."
2. **Dado concreto**: "Economizei 15h/semana com isso."
3. **Curiosidade**: "O que ninguém te conta sobre X."
4. **Como eu fiz**: "Como eu consegui Y em Z tempo."
5. **Mistake / erro comum**: "O erro que custou $X para meu cliente."
6. **Listicle compacto**: "3 ferramentas que me fazem parecer equipe."

### Regras de tom para GilCFP
- Nunca começar com "Olá pessoal".
- Sempre referenciar experiência real (cliente americano, Brena, FairSet, SKEPS).
- Linguagem informal: "cara", "sério", "na moral", "olha só".
- CTA sempre "comenta [PALAVRA]" — nunca "compre meu curso".
- Dados concretos e específicos.

## 4. Proposta de nova arquitetura de roteiros

1. **Discovery**: buscar conteúdo viral nas fontes (YouTube, HN, Reddit).
2. **Filtering**: ranquear por engajamento e relevância para o nicho.
3. **Transcription/Summarization**: extrair/transcrever o vídeo/texto original.
4. **Angle Generation**: propor 2-3 ângulos de adaptação para o Gil.
5. **Script Writing**: gerar roteiro completo (hook, body, CTA, caption, hashtags) no tom do Gil.
6. **Storage**: salvar na tabela `scripts` com referência à fonte original.
7. **Editorial Link**: conectar ao calendário editorial.

## 5. Próximos passos

- Descartar edição local como core; marcar como legado/opcional.
- Integrar OpusClip via API ou MCP para edição externalizada.
- Implementar pipeline de discovery com YouTube + HN + Reddit.
- Refinar prompt de geração de roteiros para usar transcrições reais de conteúdo viral.
- Rodar loop crítico/engenharia para validar qualidade dos primeiros roteiros gerados.
