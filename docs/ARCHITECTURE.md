# Architecture

## Request flow
1. Next.js collects an authorized source file and editing preferences.
2. FastAPI validates consent, file type, size, and FFmpeg availability.
3. faster-whisper transcribes speech into timestamped segments.
4. A heuristic ranks candidate windows using transcript length and linguistic cues.
5. FFmpeg creates 1080×1920 H.264/AAC clips and burns subtitles.
6. The API returns download URLs and a ZIP archive.

## Trust and safety boundaries
- A pasted YouTube URL is stored as a reference only; it is not fetched.
- Uploaders must confirm ownership or permission.
- The MVP does not provide copyright detection, legal advice, or a claim-free guarantee.
- No music is injected by default.
- Production deployment should add authentication, per-user quotas, malware scanning, retention policies, and private object storage.

## Next engineering milestones
- Face/speaker tracking for dynamic vertical crops.
- Word-level caption timing and editable themes.
- Job queue (Redis + worker) for long videos.
- Object storage with expiring signed URLs.
- Licensed music/stock catalog with asset-level license metadata.
