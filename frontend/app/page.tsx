"use client";

import { useState } from "react";

type Clip = {
  filename: string;
  duration_seconds: number;
  start_seconds: number;
  end_seconds: number;
  score: number;
  transcript_preview: string;
  download_url: string;
};
type Result = { job_id: string; duration_seconds: number; clips: Clip[]; zip_url: string };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [clipCount, setClipCount] = useState(3);
  const [clipLength, setClipLength] = useState(45);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    if (!file || !rights || busy) return;
    setBusy(true); setError(""); setResult(null);
    const body = new FormData();
    body.append("file", file);
    body.append("rights_confirmed", "true");
    body.append("clip_count", String(clipCount));
    body.append("max_clip_seconds", String(clipLength));
    body.append("source_url", sourceUrl);
    try {
      const response = await fetch(`${API}/api/process`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Processing failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to CLIPFORGE API.");
    } finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <nav className="nav"><a className="brand" href="#"><span className="brandMark">C</span> CLIPFORGE<span className="brandAI">AI</span></a><span className="navTag">VIDEO → SHORTS WORKSPACE</span></nav>
      <section className="hero">
        <div className="eyebrow"><span className="pulse" /> AI SHORT-FORM STUDIO</div>
        <h1>Long videos.<br /><span>Short-form impact.</span></h1>
        <p className="heroText">Find the moments worth watching. Turn them into vertical clips with automatic captions and clean edits.</p>
      </section>

      <section className="workspace">
        <div className="sectionHead"><div><span className="step">01 / SOURCE</span><h2>Bring your video</h2></div><span className="format">OUTPUT · 9:16 VERTICAL</span></div>
        <label className="urlLabel" htmlFor="sourceUrl">SOURCE URL <span>OPTIONAL REFERENCE</span></label>
        <input id="sourceUrl" className="urlInput" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="Paste a YouTube or source link for reference…" />
        <div className="upload" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const dropped = e.dataTransfer.files?.[0]; if (dropped) setFile(dropped); }}>
          <input id="videoFile" type="file" accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-m4v" onChange={e => setFile(e.target.files?.[0] || null)} />
          <label htmlFor="videoFile" className="uploadIcon">↑</label>
          <div className="uploadTitle">{file ? file.name : "Drop your video here"}</div>
          <div className="uploadSub">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to process` : "or click to browse · MP4, MOV, MKV, WebM"}</div>
        </div>

        <div className="settings">
          <div className="setting"><label htmlFor="count">NUMBER OF CLIPS</label><select id="count" value={clipCount} onChange={e => setClipCount(Number(e.target.value))}>{[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} clips</option>)}</select></div>
          <div className="setting"><label htmlFor="length">MAX CLIP LENGTH</label><select id="length" value={clipLength} onChange={e => setClipLength(Number(e.target.value))}><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></div>
          <div className="setting"><label>CAPTIONS</label><div className="settingValue"><span className="greenDot" /> Auto-generated</div></div>
          <div className="setting"><label>VIDEO FORMAT</label><div className="settingValue">9:16 · 1080 × 1920</div></div>
        </div>

        <label className="rights"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} /><span>I confirm I own this video or have permission to edit and publish it. I understand that captions, cropping, and effects do not remove copyright restrictions.</span></label>
        <button className="generate" disabled={!file || !rights || busy} onClick={submit}>{busy ? <><span className="spinner" /> Processing video…</> : <>Generate my Shorts <span>↗</span></>}</button>
        <p className="privacy">Your video is processed by the configured server. Do not upload private or sensitive footage.</p>
      </section>

      {error && <div className="error">⚠ {error}</div>}
      {result && <section className="results"><div className="sectionHead"><div><span className="step">02 / YOUR EXPORTS</span><h2>Your clips are ready</h2></div><a className="zip" href={`${API}${result.zip_url}`}>Download all ↓</a></div><p className="resultMeta">Job {result.job_id} · Source duration {result.duration_seconds}s · {result.clips.length} clips created</p><div className="clipGrid">{result.clips.map((clip, i) => <article className="clipCard" key={clip.filename}><div className="clipPreview"><span>9:16</span><strong>CLIP<br />{String(i + 1).padStart(2, "0")}</strong><small>{clip.duration_seconds}s</small></div><div className="clipInfo"><h3>Highlight {i + 1}</h3><p>{clip.start_seconds}s – {clip.end_seconds}s · Match score {clip.score}</p><blockquote>{clip.transcript_preview}</blockquote><a href={`${API}${clip.download_url}`} className="download">Download MP4 ↗</a></div></article>)}</div></section>}

      <footer><span>CLIPFORGE AI</span><span>MAKE EVERY SECOND COUNT.</span></footer>
    </main>
  );
}
