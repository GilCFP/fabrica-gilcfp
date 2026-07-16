"""Database seeding.

O conteúdo pré-carregado foi removido. Roteiros e trends agora são gerados
dinamicamente a partir de fontes externas (web scraping, APIs de trends e IA).
A função `seed_scripts` permanece vazia para manter compatibilidade com o
lifespan da aplicação.
"""
from database import SessionLocal
from models import Script, Trend


def seed_scripts():
    """No-op: conteúdo é gerado dinamicamente."""
    pass


if __name__ == "__main__":
    seed_scripts()
