"""OpusClip API client for external video editing.

Documentação: https://www.opus.pro/api
Requer conta paga (Pro/Business) para obter API key.
"""
import os
from typing import Dict, Optional
import httpx

OPUSCLIP_BASE_URL = "https://api.opus.pro/api/v1"


def _get_api_key() -> str:
    key = os.environ.get("OPUSCLIP_API_KEY", "")
    if not key:
        raise ValueError("OPUSCLIP_API_KEY not configured")
    return key


async def submit_clip_job(video_path: str, options: Optional[Dict] = None) -> Dict:
    """Envia um vídeo bruto para a OpusClip e retorna o job_id.

    Fluxo simplificado (a confirmar com documentação oficial):
    1. Upload do arquivo MP4.
    2. Criação de projeto.
    3. Submissão do job de clipping.
    """
    api_key = _get_api_key()
    options = options or {}

    async with httpx.AsyncClient(timeout=120.0) as client:
        headers = {"Authorization": f"Bearer {api_key}"}

        # 1. Upload
        with open(video_path, "rb") as f:
            upload_resp = await client.post(
                f"{OPUSCLIP_BASE_URL}/upload",
                headers=headers,
                files={"file": (os.path.basename(video_path), f, "video/mp4")},
            )
        upload_resp.raise_for_status()
        upload_data = upload_resp.json()
        asset_id = upload_data.get("asset_id") or upload_data.get("id")

        # 2. Create project
        project_resp = await client.post(
            f"{OPUSCLIP_BASE_URL}/projects",
            headers={**headers, "Content-Type": "application/json"},
            json={"asset_id": asset_id, "title": options.get("title", "GilCFP Clip")},
        )
        project_resp.raise_for_status()
        project_data = project_resp.json()
        project_id = project_data.get("id")

        # 3. Submit editing job
        job_resp = await client.post(
            f"{OPUSCLIP_BASE_URL}/projects/{project_id}/jobs",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "job_type": "clip",
                "options": {
                    "aspect_ratio": "9:16",
                    "caption_style": "hormozi",
                    "clip_length": options.get("clip_length", "30-60s"),
                    "language": options.get("language", "pt"),
                    "add_b_roll": options.get("add_b_roll", False),
                },
            },
        )
        job_resp.raise_for_status()
        return job_resp.json()


async def get_job_status(job_id: str) -> Dict:
    """Consulta status de um job OpusClip."""
    api_key = _get_api_key()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{OPUSCLIP_BASE_URL}/jobs/{job_id}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
