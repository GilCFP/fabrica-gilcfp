# Agentes / Skills

## Skills Criadas (arquivos .skill)

### 1. content-scout-eua
- **Função:** Raspa fontes dos EUA para encontrar temas em alta
- **Fontes:** YouTube (Matt Wolfe, Nate Herk, Alex Finn, Fireship), Newsletters (The Rundown, TLDR AI, Superhuman AI, Lenny's), Twitter/X (Rowan Cheung, Barsee)
- **Quando usar:** "Buscar temas dos EUA", "O que está em alta", "Novidades de IA"
- **Arquivo:** `content-scout-eua.skill`

### 2. script-writer-gil
- **Função:** Adapta conteúdo pro tom de voz do Gilberto e gera roteiros
- **Input:** Tema + categoria
- **Output:** Roteiro completo (hook, corpo, CTA, legenda, hashtags)
- **Memória:** Acessa `/mnt/agents/.store/gilcfp_context.json`
- **Quando usar:** "Escrever roteiro", "Gerar script", "Adaptar conteúdo"
- **Arquivo:** `script-writer-gil.skill`

### 3. video-editor-ai
- **Função:** Pipeline de edição de vídeo automatizado
- **Input:** Vídeo cru (Gilberto lendo roteiro)
- **Output:** Vídeo editado (cortes, legendas, 9:16)
- **Pipeline:** Whisper → cortes → jump cuts → legendas → export
- **Quando usar:** "Editar vídeo", "Processar vídeo", "Adicionar legendas"
- **Arquivo:** `video-editor-ai.skill`

## Como Instalar as Skills

```bash
# Baixe os arquivos .skill
cp content-scout-eua.skill /app/.user/skills/
cp script-writer-gil.skill /app/.user/skills/
cp video-editor-ai.skill /app/.user/skills/

# Ou descompacte
mkdir -p /app/.user/skills/content-scout-eua
tar xf content-scout-eua.skill -C /app/.user/skills/content-scout-eua
```

## Contexto Persistente

O contexto do Gilberto está salvo em:
```
/mnt/agents/.store/gilcfp_context.json
```

Qualquer agente deve ler este arquivo antes de produzir conteúdo.
