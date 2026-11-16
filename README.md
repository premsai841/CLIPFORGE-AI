# CLIPFORGE AI

A free, browser-based video utility for turning videos you own or are authorized to edit into vertical 9:16 MP4 clips.

## Live deployment

GitHub Actions builds and deploys the static website to GitHub Pages on every push to `main`. After enabling **Settings → Pages → Build and deployment → Source: GitHub Actions**, the site is available at:

`https://premsai841.github.io/CLIPFORGE-AI/`

## What works in this free browser MVP

- Kixy-inspired dark creator dashboard.
- Upload a local video file (up to 300 MB recommended).
- Generate multiple 9:16 vertical MP4 clips in the browser with FFmpeg.wasm.
- Download each generated clip.
- No login, API key, subscription, or server upload required for this workflow.

## Important limitations

- The current clip selection is evenly spaced, **not AI highlight detection**.
- Automatic speech recognition and animated captions are not implemented yet.
- The browser does all processing; performance depends on the device and available memory. Large/long videos may fail on phones.
- The YouTube URL workflow is not enabled. A URL alone does not grant permission or provide authorized access to the source media. Upload a video file you own or have permission to edit.
- Editing, cropping, or adding captions does not remove copyright restrictions. No service can guarantee zero copyright claims.

## Deploy

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Push to `main` (or run the deployment workflow manually).
4. Wait for the **Deploy CLIPFORGE AI to GitHub Pages** workflow to finish.
5. Open the Pages URL shown in the workflow deployment.

## Local development (optional)

```bash
cd frontend
npm install
npm run dev
```

## License

MIT for this project code. FFmpeg.wasm and other dependencies retain their respective licenses.
