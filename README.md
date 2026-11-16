# CLIPFORGE AI

Create vertical Shorts from videos you own or are licensed to use.

## MVP features
- Upload a local video file (MP4, MOV, MKV, WebM).
- Optional source URL field for attribution/reference.
- Speech transcription with faster-whisper.
- Transcript-based highlight selection.
- Automatic 9:16 (1080×1920) crop and burned-in captions.
- Download individual MP4 clips or one ZIP bundle.

## Copyright and platform compliance
This app intentionally does **not** download YouTube videos from pasted URLs. The URL field is metadata/reference only. Upload the source video file only if you own it or have permission to edit and publish it. Cropping, zooming, subtitles, or changing aspect ratio does not make someone else's content copyright-free. No background music is added by default; use only music and visual assets you have rights to use. No tool can guarantee that a platform will never issue a claim.

## Requirements
- Python 3.11+
- FFmpeg installed and available on PATH
- Node.js 20+

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-ml.txt
uvicorn app.main:app --reload --port 8000
```

The first faster-whisper run downloads model weights. Set `WHISPER_MODEL=tiny` for lower resource use or `base` for a better balance.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000. The API defaults to http://localhost:8000.

### Docker
```bash
docker compose up --build
```

## Environment
Backend:
- `CLIPFORGE_OUTPUT_DIR` default `./storage`
- `MAX_UPLOAD_MB` default `800`
- `WHISPER_MODEL` default `base`
- `CORS_ORIGINS` default local Next.js origin

Frontend:
- `NEXT_PUBLIC_API_URL` default `http://localhost:8000`

## Known limitations
- YouTube URL ingestion is not implemented; upload an authorized source file.
- Highlight selection is a heuristic MVP, not editorial judgment.
- Reframing uses a centered crop; automatic face/speaker tracking is planned.
- Captions are segment-level and may need manual correction.
- Processing speed depends on local CPU/GPU, video duration, and model size.
- This MVP is not a copyright clearance service and does not guarantee platform acceptance.

## Roadmap
1. Speaker-aware reframing and editable clip timeline.
2. Word-level animated caption presets.
3. Licensed music and stock-asset integrations.
4. Background job queue and cloud deployment with storage limits.

## License
MIT for this project code. Third-party packages and all media retain their own licenses.
