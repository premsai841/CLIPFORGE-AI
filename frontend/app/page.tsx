"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

type ExportedClip = { name: string; url: string; size: number };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [clipCount, setClipCount] = useState(3);
  const [clipLength, setClipLength] = useState(30);
  const [status, setStatus] = useState("Upload a video you own or are authorized to edit.");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [exports, setExports] = useState<ExportedClip[]>([]);
  const [error, setError] = useState("");
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const engine = new FFmpeg();
    engine.on("progress", ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100)))));
    ffmpegRef.current = engine;
    return () => { for (const item of exports) URL.revokeObjectURL(item.url); };
  }, []);

  function chooseVideo(next: File | null) {
    setExports([]);
    setError("");
    setFile(next);
    setDuration(0);
    if (!next) return;
    const preview = document.createElement("video");
    preview.preload = "metadata";
    preview.onloadedmetadata = () => { setDuration(Number.isFinite(preview.duration) ? preview.duration : 0); URL.revokeObjectURL(preview.src); };
    preview.onerror = () => setError("This video format could not be read by your browser.");
    preview.src = URL.createObjectURL(next);
  }

  async function loadEngine() {
    if (loaded) return;
    setStatus("Loading free browser video engine…");
    const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpegRef.current!.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    setLoaded(true);
  }

  async function generate() {
    if (!file || !duration || busy) return;
    if (file.size > 300 * 1024 * 1024) { setError("For this free browser version, please use a video under 300 MB."); return; }
    setBusy(true); setError(""); setExports([]); setProgress(0);
    const created: ExportedClip[] = [];
    try {
      await loadEngine();
      const ffmpeg = ffmpegRef.current!;
      const inputName = "clipforge-source";
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
      const count = Math.min(clipCount, Math.max(1, Math.floor(duration / 5)));
      const length = Math.min(clipLength, Math.floor(duration));
      for (let i = 0; i < count; i++) {
        const maxStart = Math.max(0, duration - length);
        const start = count === 1 ? 0 : Math.round((maxStart * i) / (count - 1));
        const output = `clipforge-${i + 1}.mp4`;
        setStatus(`Creating vertical clip ${i + 1} of ${count}…`);
        const code = await ffmpeg.exec([
          "-ss", String(start), "-i", inputName, "-t", String(length),
          "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
          "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
          "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output
        ]);
        if (code !== 0) throw new Error("FFmpeg could not process this file. Try an MP4 video.");
        const data = await ffmpeg.readFile(output);
        const blob = new Blob([data as BlobPart], { type: "video/mp4" });
        created.push({ name: `CLIPFORGE-Short-${i + 1}.mp4`, url: URL.createObjectURL(blob), size: blob.size });
        setExports([...created]);
      }
      setStatus("Your vertical clips are ready to download.");
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while processing.");
      setStatus("Processing stopped.");
    } finally { setBusy(false); }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <a className="logo" href="#"><span className="logoIcon">C</span><span>CLIPFORGE<span className="logoAI"> AI</span></span></a>
        <div className="sideLabel">WORKSPACE</div>
        <a className="sideLink active" href="#clipper"><span>✂</span> AI Clipper <b>NEW</b></a>
        <a className="sideLink" href="#captions"><span>▤</span> Auto Captions <em>SOON</em></a>
        <a className="sideLink" href="#resize"><span>▣</span> Video Resizer <em>SOON</em></a>
        <div className="sideLabel toolsLabel">YOUR LIBRARY</div>
        <a className="sideLink" href="#exports"><span>◷</span> Recent exports</a>
        <div className="sidebarBottom"><div className="freePlan"><span className="planIcon">✦</span><div><strong>Free workspace</strong><small>Browser-based processing</small></div></div><p>Your videos stay on your device. No account or subscription needed.</p></div>
      </aside>

      <section className="mainArea">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> AI Clipper</div><div className="topRight"><span className="onlineDot"/> FREE PLAN <div className="avatar">C</div></div></header>
        <div className="content">
          <div className="welcome"><div><div className="eyebrow"><span/> YOUR AI VIDEO WORKSPACE</div><h1>Make every second <span>count.</span></h1><p>Turn your own long videos into scroll-stopping vertical clips.</p></div><div className="heroBadge">✦ &nbsp;100% FREE TO USE</div></div>

          <div className="toolTabs"><a className="tab selected" href="#clipper">✂ &nbsp; AI Clipper</a><a className="tab disabled" href="#captions">▤ &nbsp; Captions <small>SOON</small></a><a className="tab disabled" href="#resize">▣ &nbsp; Resize <small>SOON</small></a></div>

          <section className="panel" id="clipper">
            <div className="panelHead"><div><div className="stepLabel">01 / SOURCE VIDEO</div><h2>Start with your video</h2><p>Upload a video file from your device. Processing happens in your browser.</p></div><div className="outputPill"><span/> 9:16 VERTICAL</div></div>
            <div className={`dropzone ${file ? "hasFile" : ""}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); chooseVideo(e.dataTransfer.files?.[0] || null); }}>
              <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={e => chooseVideo(e.target.files?.[0] || null)} />
              <button className="uploadSymbol" onClick={() => inputRef.current?.click()}>↑</button>
              <strong>{file ? file.name : "Drop your video here"}</strong>
              <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ${duration ? formatTime(duration) : "Reading video…"}` : "or browse files from your device"}</span>
              <small>MP4, MOV, WebM · Max 300 MB · No upload to a server</small>
            </div>
            <div className="settingsGrid">
              <label><span>NUMBER OF CLIPS</span><select value={clipCount} onChange={e => setClipCount(Number(e.target.value))}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} clips</option>)}</select></label>
              <label><span>CLIP DURATION</span><select value={clipLength} onChange={e => setClipLength(Number(e.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></label>
              <div className="settingStatic"><span>ASPECT RATIO</span><strong>9:16 <small>1080 × 1920</small></strong></div>
            </div>
            <div className="notice"><span>ⓘ</span><p>This free version creates evenly spaced vertical clips. AI highlight detection and automatic speech captions are not enabled yet. Only use videos you own or have permission to edit.</p></div>
            {error && <div className="errorBox">{error}</div>}
            {busy && <div className="progressWrap"><div className="progressText"><span>{status}</span><strong>{progress}%</strong></div><div className="progressTrack"><i style={{width:`${progress}%`}}/></div></div>}
            <button className="generateBtn" disabled={!file || !duration || busy} onClick={generate}>{busy ? <><span className="loader"/> Processing in your browser…</> : <>Generate vertical clips <span>↗</span></>}</button>
            <div className="privacyLine">🔒 &nbsp;Your video stays on your device. No sign-up. No paid credits.</div>
          </section>

          <section className="exports" id="exports"><div className="exportsHead"><div><div className="stepLabel">02 / YOUR CONTENT</div><h2>Your exports <span>{exports.length}</span></h2></div><span className="exportStatus">{exports.length ? "READY TO DOWNLOAD" : "YOUR CLIPS WILL APPEAR HERE"}</span></div>
            {exports.length ? <div className="exportGrid">{exports.map((item,i)=><article className="exportCard" key={item.name}><div className="videoThumb"><span>9:16</span><strong>SHORT<br/>{String(i+1).padStart(2,"0")}</strong><small>MP4</small></div><div className="exportInfo"><strong>{item.name}</strong><span>{(item.size/1024/1024).toFixed(1)} MB · Vertical video</span><a href={item.url} download={item.name}>↓ &nbsp; Download MP4</a></div></article>)}</div> : <div className="emptyState"><div>▧</div><strong>No exports yet</strong><span>Your finished vertical clips will show up here.</span></div>}
          </section>
          <footer><span>CLIPFORGE AI</span><span>BUILT FOR CREATORS · POWERED BY OPEN SOURCE</span></footer>
        </div>
      </section>
    </main>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
