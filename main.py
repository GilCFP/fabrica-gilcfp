"""Fábrica GilCFP — Main FastAPI application.
Serves both API and React frontend static files."""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from database import engine, Base
from routers import trends, scripts, videos, calendar, config
from init_db import seed_scripts


load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and seed data."""
    Base.metadata.create_all(bind=engine)
    seed_scripts()
    yield


app = FastAPI(
    title="Fábrica GilCFP API",
    description="Motor de automação de conteúdo para Personal Branding em IA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trends.router)
app.include_router(scripts.router)
app.include_router(videos.router)
app.include_router(calendar.router)
app.include_router(config.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "fabrica-gilcfp",
        "features": {
            "trends": bool(os.environ.get("APIFY_API_TOKEN") or True),
            "scripts": True,
            "video_processing": bool(os.environ.get("OPENAI_API_KEY")),
            "calendar": True,
        },
    }

STATIC_DIR = os.path.join(os.path.dirname(__file__), "")


@app.get("/")
def root():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Fábrica GilCFP API", "docs": "/docs"}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return {"detail": "Not found"}
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "Not found"}
