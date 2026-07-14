"""AI-powered script writer that adapts content to Gilberto's voice."""
import os
import json
import httpx
from typing import Dict

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

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

DIFERENCIAL: Produto + Negócio + Técnico + Comunicação + Inglês C1
"""


async def generate_script(topic: str, category: str = "ferramentas") -> Dict:
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
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
- Menciona pelo menos 1 projeto real do Gil
- Inclui dado concreto

Responda em JSON:
{{"title": "...", "hook": "...", "body": "...", "cta": "...", "cta_keyword": "...", "visual_format": "...", "caption": "...", "hashtags": "...", "source_usa": "...", "adaptation_note": "..."}}
"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "temperature": 0.8, "response_format": {"type": "json_object"}},
        )
        if response.status_code != 200:
            raise RuntimeError(f"OpenAI API error: {response.status_code}")
        result = response.json()
        content = json.loads(result["choices"][0]["message"]["content"])
        return {
            "title": content.get("title", topic), "hook": content.get("hook", ""),
            "body": content.get("body", ""), "cta": content.get("cta", ""),
            "cta_keyword": content.get("cta_keyword", "CODE"),
            "visual_format": content.get("visual_format", "Facecam + tela compartilhada"),
            "caption": content.get("caption", ""),
            "hashtags": content.get("hashtags", "#IA #Produtividade #Automação"),
            "source_usa": content.get("source_usa", "Adaptação original"),
            "adaptation_note": content.get("adaptation_note", "Roteiro gerado para persona GilCFP"),
        }
