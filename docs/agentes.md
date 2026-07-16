> **INSTRUÇÃO OBRIGATÓRIA:** Antes de criar ou modificar uma skill, leia este arquivo e o [`context.md`](context.md).

# Agentes / Skills — Fábrica GilCFP

## Skills criadas

### 1. content-scout-eua

| Campo | Descrição |
|-------|-----------|
| **Função** | Raspa fontes dos EUA para encontrar temas em alta |
| **Fontes** | YouTube: Matt Wolfe, Nate Herk, Alex Finn, Fireship; Newsletters: The Rundown, TLDR AI, Superhuman AI, Lenny's; Twitter/X: Rowan Cheung, Barsee |
| **Quando usar** | "Buscar temas dos EUA", "O que está em alta", "Novidades de IA" |
| **Input** | Comando do usuário |
| **Output** | Lista de tendências com título, fonte, resumo e adaptação para o Brasil |
| **Arquivo** | `content-scout-eua.skill` |

### 2. script-writer-gil

| Campo | Descrição |
|-------|-----------|
| **Função** | Adapta conteúdo para o tom de voz do Gilberto e gera roteiros |
| **Input** | Tema + categoria |
| **Output** | Roteiro completo: hook, corpo, CTA, legenda, hashtags |
| **Memória** | Acessa `/mnt/agents/.store/gilcfp_context.json` |
| **Quando usar** | "Escrever roteiro", "Gerar script", "Adaptar conteúdo" |
| **Arquivo** | `script-writer-gil.skill` |

### 3. video-editor-ai

| Campo | Descrição |
|-------|-----------|
| **Função** | Pipeline de edição de vídeo automatizado |
| **Input** | Vídeo cru (Gilberto lendo roteiro) |
| **Output** | Vídeo editado: cortes, legendas, 9:16 |
| **Pipeline** | Whisper → cortes → jump cuts → legendas → export |
| **Quando usar** | "Editar vídeo", "Processar vídeo", "Adicionar legendas" |
| **Arquivo** | `video-editor-ai.skill` |

---

## Como instalar as skills

```bash
# Opção 1: copiar os arquivos .skill
cp content-scout-eua.skill /app/.user/skills/
cp script-writer-gil.skill /app/.user/skills/
cp video-editor-ai.skill /app/.user/skills/

# Opção 2: descompactar
mkdir -p /app/.user/skills/content-scout-eua
mkdir -p /app/.user/skills/script-writer-gil
mkdir -p /app/.user/skills/video-editor-ai

tar xf content-scout-eua.skill -C /app/.user/skills/content-scout-eua
tar xf script-writer-gil.skill -C /app/.user/skills/script-writer-gil
tar xf video-editor-ai.skill -C /app/.user/skills/video-editor-ai
```

> **Nota:** os caminhos `/app/.user/skills/` podem variar conforme o ambiente do agente. Ajuste se necessário.

---

## Contexto persistente

O contexto do Gilberto está salvo em:

```
/mnt/agents/.store/gilcfp_context.json
```

Qualquer agente que produza conteúdo deve ler este arquivo antes de gerar roteiros, legendas ou textos.

---

## Regras para novas skills

1. **Leia o contexto primeiro.** Sempre consulte [`context.md`](context.md) ou `gilcfp_context.json`.
2. **Preserve o tom de voz.** Nunca gere conteúdo formal ou genérico.
3. **Use cases reais.** Preferencialmente cliente americano, Brena, FairSet ou SKEPS.
4. **Output padronizado.** Siga a estrutura hook → corpo → CTA → legenda → hashtags.
5. **CTA único.** Uma palavra-chave e um recurso claro.
