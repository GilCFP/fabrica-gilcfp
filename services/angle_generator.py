"""Generate adaptation angles from discovered viral content."""
import os
import json
import httpx
from typing import Dict, List

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


async def generate_angles(source: Dict) -> List[Dict]:
    """Gera 2 ângulos de adaptação para o tom do Gil a partir de uma fonte."""
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY not configured")

    prompt = f"""{GIL_CONTEXT}

Você é um estrategista de conteúdo. Recebeu uma fonte de conteúdo viral do nicho de IA/automação/produto. Proponha 2 ângulos de adaptação para o criador acima gravar um Reel de 30-60s.

FONTE:
- Título: {source.get('title', '')}
- Plataforma: {source.get('platform', '')}
- URL: {source.get('url', '')}
- Resumo/transcrição: {source.get('transcript_summary', '')}

Regras para cada ângulo:
1. Use obrigatoriamente um dos 3 templates:
   A) "Case do cliente americano": conecta o tema a um resultado real do projeto americano.
   B) "Hot take técnico": posicionamento forte + referência a Brena, FairSet ou SKEPS.
   C) "Antes/depois de produtividade": listicle curto com ferramentas/workflow reais.
2. O HOOK deve ser específico e concreto. PROIBIDO frases genéricas como "A IA tá mudando tudo", "Você precisa ver isso", "Sério, isso é incrível", "Olha só". O hook deve conter: um dado, uma promessa de tempo/economia, uma cifra ou uma crença errada que será quebrada.
3. Cada ângulo deve ter: hook direto (0-3s), premissa do corpo, CTA "comenta [PALAVRA]".
4. Máximo 60 palavras por ângulo.
5. Tom informal-didático, direto, sem coach.
6. O CTA keyword deve ser UMA palavra curta em português, relacionada ao tema.

Bons exemplos de hook:
- "No projeto americano, 2 horas de relatório viraram 10 minutos."
- "Você ainda faz isso manual? No caso do Brena a gente resolveu assim."
- "3 ferramentas me fazem parecer equipe. A primeira salvou 15h semana passada."

Responda em JSON:
{{"angles": [{{"template": "A|B|C", "hook": "...", "premise": "...", "cta": "...", "cta_keyword": "...", "why_it_works": "..."}}]}}
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
            raise RuntimeError(f"OpenAI API error: {response.status_code} - {response.text}")
        result = response.json()
        content = json.loads(result["choices"][0]["message"]["content"])
        angles = content.get("angles", [])
        # Garante estrutura mínima
        normalized = []
        for i, angle in enumerate(angles[:2]):
            normalized.append({
                "index": i,
                "template": angle.get("template", "A"),
                "hook": angle.get("hook", ""),
                "premise": angle.get("premise", ""),
                "cta": angle.get("cta", ""),
                "cta_keyword": angle.get("cta_keyword", "CODE"),
                "why_it_works": angle.get("why_it_works", ""),
            })
        return normalized
