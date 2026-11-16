from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any


def run(command: list[str]) -> str:
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr[-2500:] or "External command failed")
    return completed.stdout


def probe_duration(path: Path) -> float:
    raw = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ]).strip()
    return max(0.0, float(raw))


def transcribe(path: Path) -> list[dict[str, Any]]:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "Speech model is not installed. Run: pip install -r requirements-ml.txt"
        ) from exc

    model_name = os.getenv("WHISPER_MODEL", "base")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(str(path), vad_filter=True, word_timestamps=False)
    output = []
    for segment in segments:
        text = re.sub(r"\s+", " ", segment.text).strip()
        if text:
            output.append({"start": float(segment.start), "end": float(segment.end), "text": text})
    return output


def rank_windows(segments: list[dict[str, Any]], duration: float, count: int, max_seconds: int) -> list[dict[str, Any]]:
    candidates = []
    for index, segment in enumerate(segments):
        start = max(0.0, float(segment["start"]) - 1.5)
        end = min(duration, start + max_seconds)
        text_parts = []
        for item in segments[index:]:
            if item["start"] > end:
                break
            if item["end"] >= start:
                text_parts.append(item["text"])
        text = " ".join(text_parts).strip()
        words = re.findall(r"\b[\w']+\b", text)
        if len(words) < 12:
            continue
        score = min(len(words), 90) / 90
        score += 0.22 if re.search(r"[?!]", text) else 0
        score += 0.10 if re.search(r"\b(but|because|however|secret|important|why|how|mistake|learn)\b", text, re.I) else 0
        score -= 0.15 if len(words) < 20 else 0
        candidates.append({"start": start, "end": end, "text": text, "score": round(score, 3)})

    if not candidates:
        raise RuntimeError("No useful speech segments found. Try a video with clear spoken audio.")

    selected = []
    for candidate in sorted(candidates, key=lambda item: item["score"], reverse=True):
        if all(abs(candidate["start"] - item["start"]) > max_seconds * 0.65 for item in selected):
            selected.append(candidate)
        if len(selected) >= count:
            break
    return sorted(selected, key=lambda item: item["start"])


def ass_time(seconds: float) -> str:
    centiseconds = max(0, int(seconds * 100))
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    secs, cs = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{cs:02d}"


def write_ass(path: Path, segments: list[dict[str, Any]], clip_start: float, clip_end: float) -> None:
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,66,&H00FFFFFF,&H0000FFFF,&H00101010,&H99000000,1,0,1,4,1,2,80,80,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for segment in segments:
        start = max(clip_start, segment["start"])
        end = min(clip_end, segment["end"])
        if end <= start:
            continue
        text = segment["text"].replace("\\", "").replace("{", "").replace("}", "").replace("\n", " ")
        lines.append(f"Dialogue: 0,{ass_time(start-clip_start)},{ass_time(end-clip_start)},Default,,0,0,0,,{text}\n")
    path.write_text("".join(lines), encoding="utf-8")


def build_clips(input_path: Path, output_dir: Path, clip_count: int, max_clip_seconds: int) -> dict[str, Any]:
    duration = probe_duration(input_path)
    if duration < 15:
        raise RuntimeError("Video must be at least 15 seconds long.")
    segments = transcribe(input_path)
    windows = rank_windows(segments, duration, clip_count, max_clip_seconds)
    clips = []

    for index, window in enumerate(windows, start=1):
        start = window["start"]
        end = min(window["end"], start + max_clip_seconds, duration)
        caption_path = output_dir / f"captions-{index:02d}.ass"
        output_name = f"clip-{index:02d}.mp4"
        output_path = output_dir / output_name
        write_ass(caption_path, segments, start, end)
        subtitle_filter = "subtitles=" + str(caption_path).replace("\\", "/").replace(":", "\\:")
        vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{subtitle_filter}"
        run([
            "ffmpeg", "-y", "-ss", f"{start:.3f}", "-i", str(input_path),
            "-t", f"{end-start:.3f}", "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
            str(output_path),
        ])
        clips.append({
            "filename": output_name,
            "duration_seconds": round(end-start, 1),
            "start_seconds": round(start, 1),
            "end_seconds": round(end, 1),
            "score": window["score"],
            "transcript_preview": window["text"][:220],
        })

    return {"duration_seconds": round(duration, 1), "clips": clips}
