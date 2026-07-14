"""Apify integration for scraping US content sources."""
import os
import httpx
from typing import List, Dict

APIFY_API_TOKEN = os.environ.get("APIFY_API_TOKEN", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

DEFAULT_TRENDS = [
    {"title": "Claude Code: Vibe Coding para Devs que querem 10x produtividade", "source": "youtube", "channel": "Alex Finn", "url": "https://www.youtube.com/@AlexFinnOfficial", "summary": "Tutorial completo de como usar Claude Code para escrever código sem digitar.", "brazil_adaptation": "Mostrar como devs brasileiros podem usar Claude Code para acelerar entregas.", "adaptation_angle": "PM + Dev: como Claude Code me ajuda a entregar sozinho", "suggested_format": "Reel 60s com tela compartilhada", "priority_score": 95},
    {"title": "Build & Sell n8n AI Agents: Curso Completo de Automação", "source": "youtube", "channel": "Nate Herk", "url": "https://www.youtube.com/@nateherk", "summary": "Curso de 8+ horas ensinando a construir e vender agentes de IA usando n8n.", "brazil_adaptation": "Adaptar para o mercado brasileiro: como montar automações n8n.", "adaptation_angle": "Como montei um workflow de n8n que economiza 15h/semana", "suggested_format": "Reel 45s mostrando o workflow", "priority_score": 91},
    {"title": "Everyone should be using Claude Code more — 50 formas de usar", "source": "newsletter", "channel": "Lenny's Newsletter", "url": "https://www.lennysnewsletter.com", "summary": "Lenny Rachitsky compila 50+ casos de uso de Claude Code para PMs.", "brazil_adaptation": "Focar nos 5 casos de uso mais relevantes para PMs brasileiros.", "adaptation_angle": "5 formas como uso Claude Code como PM no meu dia a dia", "suggested_format": "Carrossel LinkedIn com 5 slides", "priority_score": 88},
    {"title": "Vibe Coding Explained in 100 Seconds", "source": "youtube", "channel": "Fireship", "url": "https://www.youtube.com/@Fireship", "summary": "Jeff Delaney explica o movimento de vibe coding em 100 segundos.", "brazil_adaptation": "Introduzir o conceito de vibe coding pro público brasileiro.", "adaptation_angle": "O que é vibe coding e por que vai explodir no Brasil em 2025", "suggested_format": "Reel 30s rápido e direto", "priority_score": 82},
    {"title": "3 AI Habits So Powerful It Feels Like Cheating", "source": "youtube", "channel": "Jeff Su", "url": "https://www.youtube.com/@JeffSu", "summary": "Jeff Su compartilha 3 hábitos de produtividade com IA.", "brazil_adaptation": "Adaptar os 3 hábitos para ferramentas acessíveis no Brasil.", "adaptation_angle": "3 hábitos de IA que me fazem parecer uma equipe inteira", "suggested_format": "Reel 60s com demonstração", "priority_score": 79},
    {"title": "The Rundown AI #420: GPT-4o Mini, New Claude Features", "source": "newsletter", "channel": "The Rundown AI", "url": "https://www.therundown.ai", "summary": "Resumo diário das principais notícias de IA.", "brazil_adaptation": "Selecionar as 3 notícias mais relevantes para profissionais brasileiros.", "adaptation_angle": "3 novidades de IA essa semana que você precisa conhecer", "suggested_format": "Reel 45s ou Thread LinkedIn", "priority_score": 75},
    {"title": "n8n vs Make.com: Which Automation Tool Wins in 2025?", "source": "youtube", "channel": "Jono Catliff", "url": "https://www.youtube.com/@jono-catliff", "summary": "Comparativo detalhado entre n8n e Make.com.", "brazil_adaptation": "Comparativo focado em custo-benefício para brasileiros.", "adaptation_angle": "n8n vs Make.com: qual eu uso no meu projeto americano e por quê", "suggested_format": "Reel 60s comparativo", "priority_score": 73},
    {"title": "How I'd Learn AI in 2025 (If I Had to Start Over)", "source": "youtube", "channel": "Skill Leap AI", "url": "https://www.youtube.com/@SkillLeapAI", "summary": "Roteiro completo de aprendizado de IA para iniciantes.", "brazil_adaptation": "Criar roteiro de aprendizado adaptado para brasileiros.", "adaptation_angle": "Se eu começasse do zero em IA hoje, faria apenas essas 3 coisas", "suggested_format": "Carrossel LinkedIn ou Reel 60s", "priority_score": 70},
]


async def scrape_with_apify(query: str = "AI tools automation 2025") -> List[Dict]:
    if not APIFY_API_TOKEN:
        return DEFAULT_TRENDS
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.apify.com/v2/acts/apify~google-search-scraper/runs",
                headers={"Authorization": f"Bearer {APIFY_API_TOKEN}"},
                json={"queries": ["best AI tools 2025 productivity", "Claude Code vibe coding tutorial", "n8n AI automation workflow", "Cursor IDE AI coding"], "maxPagesPerQuery": 1, "resultsPerPage": 10},
            )
            response.raise_for_status()
            run_data = response.json()
            run_id = run_data["data"]["id"]
            import asyncio
            for _ in range(30):
                await asyncio.sleep(2)
                status_resp = await client.get(f"https://api.apify.com/v2/actor-runs/{run_id}", headers={"Authorization": f"Bearer {APIFY_API_TOKEN}"})
                status = status_resp.json()["data"]["status"]
                if status in ["SUCCEEDED", "FAILED", "TIMED-OUT"]:
                    break
            dataset_resp = await client.get(f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items", headers={"Authorization": f"Bearer {APIFY_API_TOKEN}"})
            items = dataset_resp.json()
            trends = []
            for item in items[:10]:
                trends.append({"title": item.get("title", "Untitled"), "source": item.get("source", "web"), "channel": item.get("displayedUrl", ""), "url": item.get("url", ""), "summary": item.get("description", "")[:300], "brazil_adaptation": "", "adaptation_angle": "", "suggested_format": "Reel 60s", "priority_score": 70})
            return trends if trends else DEFAULT_TRENDS
    except Exception as e:
        print(f"[Apify] Error: {e}")
        return DEFAULT_TRENDS


async def enrich_with_ai(trends: List[Dict]) -> List[Dict]:
    if not OPENAI_API_KEY:
        return trends
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for trend in trends:
                if trend.get("brazil_adaptation"):
                    continue
                prompt = f"""Você é um estrategista de conteúdo brasileiro especializado em IA.
Tema dos EUA: {trend['title']}
Resumo: {trend['summary']}
Fonte: {trend['source']} - {trend['channel']}

Contexto do criador: Gilberto de Carvalho, 23 anos, PM e Dev Full-Stack. Trabalha com cliente americano (ClickUp, n8n, Missive, TheHandover IA). Projetos: Brena (Bot WhatsApp AI Banco Rendimento), FairSet (IA + vôlei). Tom: informal-didático, direto, sem coach.

Gere em JSON: {{"adaptation_angle": "ângulo pro conteúdo dele (1 frase)", "brazil_adaptation": "como adaptar pro público brasileiro (2-3 frases)", "suggested_format": "formato ideal (Reel 30s, Reel 60s, Carrossel, Thread)"}}"""
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                    json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "temperature": 0.7, "response_format": {"type": "json_object"}},
                )
                if response.status_code == 200:
                    result = response.json()
                    content = json.loads(result["choices"][0]["message"]["content"])
                    trend["adaptation_angle"] = content.get("adaptation_angle", "")
                    trend["brazil_adaptation"] = content.get("brazil_adaptation", "")
                    trend["suggested_format"] = content.get("suggested_format", "Reel 60s")
    except Exception as e:
        print(f"[AI Enrichment] Error: {e}")
    return trends
