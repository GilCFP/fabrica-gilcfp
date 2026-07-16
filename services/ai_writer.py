"""AI-powered script writer that adapts viral content to Gilberto's voice."""
import os
import json
import httpx
from typing import Dict, List, Optional

GIL_CONTEXT = """
PERFIL DO CRIADOR:
- Nome: Gilberto de Carvalho (GilCFP)
- Idade: 23 anos, Product Manager + Dev Full-Stack
- Formação: Engenharia de Sistemas UFMG + Técnico Eletrônica CEFET-MG
- Inglês: C1 — trabalha com clientes internacionais
- Cargo: Full-Stack Developer na SKEPS (2+ anos)
- Experiência prévia: 2.5 anos em consultoria (CAC, churn, ticket, ICP)

PROJETOS REAIS:
1. Cliente Americano (arquitetura): PM solo, automação end-to-end — ClickUp, n8n, Missive, TheHandover IA.
2. Brena (Banco Rendimento): Bot WhatsApp AI — Pix, contas, saldo, FAQ. Gemini 1.5 + Vertex AI.
3. FairSet: Plataforma de vôlei com IA para balancear times. React + NestJS + PostgreSQL.
4. SKEPS: Wellhub, UFC, FoodToSave, Stix, Banco Rendimento, dsm firmenich.

TOM DE VOZ (REGRAS ABSOLUTAS):
- NUNCA "Olá pessoal, tudo bem?" — começa DIRETO no hook
- NUNCA "Vou te ensinar" — usa "deixa eu te mostrar"
- NUNCA linguagem de coach/influencer
- SEMPRE "cara", "sério", "olha só", "na moral"
- SEMPRE referencia experiência real: "no projeto do cliente americano..."
- SEMPRE dados concretos: "2 horas virou 10 minutos"
- CTA é "comenta X" — nunca "compre meu curso"
"""


def _extract_project_reference(topic: str) -> str:
    """Sugere um projeto real para mencionar com base no tema."""
    lowered = topic.lower()
    if any(k in lowered for k in ["automation", "automação", "n8n", "workflow", "clickup", "missive"]):
        return "cliente americano (automação end-to-end com n8n + ClickUp)"
    if any(k in lowered for k in ["whatsapp", "bot", "gemini", "fintech", "banco"]):
        return "Brena (bot WhatsApp AI do Banco Rendimento)"
    if any(k in lowered for k in ["ia", "ai", "machine learning", "produto", "pm"]):
        return "FairSet (IA balanceando times de vôlei)"
    if any(k in lowered for k in ["cliente", "internacional", "americano", "inglês", "consultoria"]):
        return "SKEPS e cliente americano"
    return "cliente americano"


async def generate_script_from_angle(source: Dict, angle: Dict) -> Dict:
    """Gera roteiro completo a partir de uma fonte viral e um ângulo escolhido."""
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY not configured")

    project = _extract_project_reference(source.get("title", ""))

    prompt = f"""{GIL_CONTEXT}

Você vai escrever um ROTEIRO COMPLETO de Reel (30-60 segundos) para o Gil gravar.

FONTE VIRAL (base do roteiro):
- Título: {source.get('title', '')}
- Plataforma: {source.get('platform', '')}
- URL: {source.get('url', '')}
- Resumo/transcrição: {source.get('transcript_summary', '')}

ÂNGULO ESCOLHIDO:
- Template: {angle.get('template', 'A')}
- Hook: {angle.get('hook', '')}
- Premissa do corpo: {angle.get('premise', '')}
- CTA: {angle.get('cta', '')}
- Keyword do CTA: {angle.get('cta_keyword', 'CODE')}

INSTRUÇÕES:
1. O roteiro deve ser 100% no tom de voz do Gil (regras acima).
2. Comece DIRETO com o hook fornecido. NÃO mude o hook. NÃO adicione apresentação.
3. Corpo: 2-3 blocos curtos com contexto, solução e resultado concreto.
4. Mencione obrigatoriamente o projeto real: {project}.
5. Inclua um dado concreto (tempo economizado, % de melhoria, etc).
6. CTA final: exatamente como fornecido no ângulo.
7. Máximo 130 palavras no total.
8. Gere também caption para Instagram (1-2 frases) e 5-8 hashtags em português/inglês do nicho.
9. Defina visual_format adequado (ex: facecam + tela compartilhada).
10. NUNCA use frases genéricas como "a IA está mudando tudo", "isso é incrível", "você não vai acreditar".

Responda em JSON:
{{"title": "...", "hook": "...", "body": "...", "cta": "...", "cta_keyword": "...", "visual_format": "...", "caption": "...", "hashtags": "...", "source_usa": "...", "adaptation_note": "..."}}
"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
                "response_format": {"type": "json_object"},
            },
        )
        if response.status_code != 200:
            raise RuntimeError(f"OpenAI API error: {response.status_code}")
        result = response.json()
        content = json.loads(result["choices"][0]["message"]["content"])
        return {
            "title": content.get("title", source.get("title", "")),
            "hook": content.get("hook", ""),
            "body": content.get("body", ""),
            "cta": content.get("cta", ""),
            "cta_keyword": content.get("cta_keyword", angle.get("cta_keyword", "CODE")),
            "visual_format": content.get("visual_format", "Facecam + tela compartilhada"),
            "caption": content.get("caption", ""),
            "hashtags": content.get("hashtags", "#IA #Produtividade #Automação"),
            "source_usa": content.get("source_usa", source.get("url", "")),
            "adaptation_note": content.get("adaptation_note", f"Adaptado de {source.get('platform', '')}: {source.get('title', '')}"),
        }


async def generate_script(topic: str, category: str = "ferramentas") -> Dict:
    """Modo manual: gera roteiro a partir de um tema, sem fonte viral."""
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY not configured")

    project = _extract_project_reference(topic)

    prompt = f"""{GIL_CONTEXT}

GERE UM ROTEIRO COMPLETO DE REEL (60 segundos) sobre o tema: {topic}
Categoria: {category}
Formato: Reel 60s para Instagram

Estrutura obrigatória:
1. HOOK (0-3s): Primeira frase que PARA o scroll. Sem apresentação.
2. CORPO (3-50s): 2-3 blocos curtos com contexto/problema, solução, resultado concreto.
3. CTA (últimos 10s): "Comenta [PALAVRA] que eu te mando [RECURSO]"

Regras:
- Máximo 150 palavras
- Tom: informal-didático, direto, sem rodeios
- Mencione pelo menos 1 projeto real do Gil (preferência: {project})
- Inclui dado concreto

Responda em JSON:
{{"title": "...", "hook": "...", "body": "...", "cta": "...", "cta_keyword": "...", "visual_format": "...", "caption": "...", "hashtags": "...", "source_usa": "...", "adaptation_note": "..."}}
"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
                "response_format": {"type": "json_object"},
            },
        )
        if response.status_code != 200:
            raise RuntimeError(f"OpenAI API error: {response.status_code}")
        result = response.json()
        content = json.loads(result["choices"][0]["message"]["content"])
        return {
            "title": content.get("title", topic),
            "hook": content.get("hook", ""),
            "body": content.get("body", ""),
            "cta": content.get("cta", ""),
            "cta_keyword": content.get("cta_keyword", "CODE"),
            "visual_format": content.get("visual_format", "Facecam + tela compartilhada"),
            "caption": content.get("caption", ""),
            "hashtags": content.get("hashtags", "#IA #Produtividade #Automação"),
            "source_usa": content.get("source_usa", "Adaptação original"),
            "adaptation_note": content.get("adaptation_note", "Roteiro gerado manualmente para persona GilCFP"),
        }
