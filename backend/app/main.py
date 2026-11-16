from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .processor import build_clips

APP_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = Path(os.getenv("CLIPFORGE_OUTPUT_DIR", str(APP_DIR.parent / "storage"))).resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "800"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

app = FastAPI(title="CLIPFORGE AI API", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.mount("/downloads", StaticFiles(directory=str(OUTPUT_DIR)), name="downloads")


@app.get("/api/health")
def health() -> dict[str, str]:
    ffmpeg = shutil.which("ffmpeg")
    return {"status": "ok", "ffmpeg": "available" if ffmpeg else "missing"}


@app.post("/api/process")
async def process_video(
    file: UploadFile = File(...),
    rights_confirmed: bool = Form(...),
    clip_count: int = Form(3),
    max_clip_seconds: int = Form(45),
    source_url: str = Form(""),
) -> dict[str, Any]:
    if not rights_confirmed:
        raise HTTPException(status_code=400, detail="Confirm that you own or are authorized to use this video.")
    if clip_count < 1 or clip_count > 10:
        raise HTTPException(status_code=400, detail="Clip count must be between 1 and 10.")
    if max_clip_seconds < 15 or max_clip_seconds > 90:
        raise HTTPException(status_code=400, detail="Clip duration must be between 15 and 90 seconds.")

    suffix = Path(file.filename or "source.mp4").suffix.lower()
    if suffix not in {".mp4", ".mov", ".mkv", ".webm", ".m4v"}:
        raise HTTPException(status_code=415, detail="Supported formats: MP4, MOV, MKV, WebM, M4V.")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise HTTPException(status_code=503, detail="FFmpeg and FFprobe must be installed on the server.")

    job_id = uuid.uuid4().hex[:12]
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / f"source{suffix}"

    total = 0
    try:
        with input_path.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail=f"Upload exceeds {MAX_UPLOAD_MB} MB.")
                out.write(chunk)

        if total == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        result = build_clips(
            input_path=input_path,
            output_dir=job_dir,
            clip_count=clip_count,
            max_clip_seconds=max_clip_seconds,
        )
        manifest = {
            "job_id": job_id,
            "source_filename": file.filename,
            "source_url_reference": source_url[:1000],
            **result,
        }
        (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        zip_path = job_dir / "clipforge-shorts.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for clip in result["clips"]:
                archive.write(job_dir / clip["filename"], arcname=clip["filename"])

        return {
            **manifest,
            "zip_url": f"/downloads/{job_id}/{zip_path.name}",
            "clips": [
                {**clip, "download_url": f"/downloads/{job_id}/{clip['filename']}"}
                for clip in result["clips"]
            ],
        }
    except HTTPException:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(exc)[:500]}") from exc
    finally:
        await file.close()
