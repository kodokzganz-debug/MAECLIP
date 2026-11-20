import { useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, AudioLines, Check, ChevronRight, Clapperboard, Clock3, FileText, Film, Link2, Loader2, Play, Scissors, Settings2, Sparkles, Upload, WandSparkles, X } from "lucide-react";
import type { Clip } from "./types";
import { demoClips, parseTranscript, toTime } from "./lib";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function App() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [active, setActive] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready to create");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = clips.find(c => c.id === active) || clips[0];
  const segments = useMemo(() => parseTranscript(transcript), [transcript]);

  function loadDemo() {
    const items = demoClips();
    setClips(items); setActive(items[0].id); setStatus("Demo clips loaded");
    setError("");
  }

  async function analyze() {
    setError("");
    if (!transcript.trim()) { setError("Masukkan transkrip bertimestamp terlebih dahulu."); return; }
    setBusy(true); setStatus("Analyzing transcript...");
    try {
      let result: Clip[];
      if (API) {
        const response = await fetch(`${API.replace(/\/$/, "")}/api/analyze`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, sourceUrl: url, maxDuration: 40, language: "auto" })
        });
        if (!response.ok) throw new Error((await response.text()) || "AI analysis failed");
        const data = await response.json() as { clips: Clip[] };
        result = data.clips;
      } else {
        result = localSuggestions();
      }
      if (!result.length) throw new Error("Belum ada kandidat klip. Periksa format timestamp transkrip.");
      setClips(result); setActive(result[0].id); setStatus(API ? "AI analysis complete" : "Local suggestions generated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setStatus("Analysis failed");
    } finally { setBusy(false); }
  }

  function localSuggestions(): Clip[] {
    const rows = segments;
    if (!rows.length) throw new Error("Format transkrip harus seperti 00:12 Kalimat yang diucapkan.");
    const candidates: Clip[] = [];
    for (let i = 0; i < rows.length; i += Math.max(2, Math.floor(rows.length / 8))) {
      const start = rows[i].timestamp;
      const next = rows.slice(i, i + 8);
      const end = Math.min(start + 40, next.length > 1 ? next[next.length - 1].timestamp + 5 : start + 20);
      if (end - start < 8) continue;
      const body = next.map(x => x.text).join(" ");
      candidates.push({
        id: crypto.randomUUID(), title: `Candidate ${candidates.length + 1}`,
        start, end, hook: rows[i].text.slice(0, 110),
        reason: "Kandidat otomatis berbasis rentang transkrip. Tinjau konteks dan kualitas hook secara manual.",
        score: Math.max(55, 82 - candidates.length * 4),
        structure: body.slice(0, 180)
      });
      if (candidates.length >= 8) break;
    }
    return candidates;
  }

  function uploadVideo(file?: File) {
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const next = URL.createObjectURL(file);
    setVideoUrl(next); setVideoName(file.name); setStatus("Video loaded");
  }

  function seek(seconds: number) {
    if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.pause(); }
  }

  function updateSelected(key: "start" | "end", value: number) {
    if (!selected) return;
    setClips(old => old.map(c => c.id === selected.id ? { ...c, [key]: Math.max(0, value) } : c));
  }

  function exportClip() {
    if (!selected || !videoRef.current) { setError("Upload video lokal untuk preview dan export."); return; }
    const video = videoRef.current;
    const start = selected.start, end = selected.end;
    if (end <= start || end - start > 40) { setError("Durasi klip harus antara 1 dan 40 detik."); return; }
    if (!("captureStream" in video) || !("MediaRecorder" in window)) {
      setError("Browser ini belum mendukung export real-time. Gunakan browser Chrome terbaru atau ekspor melalui editor video.");
      return;
    }
    seek(start);
    const stream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
      link.download = `${selected.title.replace(/[^a-z0-9-_]/gi, "-").toLowerCase()}.webm`; link.click();
      URL.revokeObjectURL(link.href); setStatus("Clip export finished");
    };
    video.currentTime = start;
    video.onseeked = () => {
      video.onseeked = null; video.play();
      const stop = () => { if (video.currentTime >= end) { video.pause(); video.removeEventListener("timeupdate", stop); recorder.stop(); } };
      video.addEventListener("timeupdate", stop);
      recorder.start();
    };
    setStatus("Recording clip in browser...");
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">M</div><div><b>MAECLIP</b><span>CREATOR WORKSPACE</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="nav-item active"><Clapperboard size={17}/> Clipper <span className="nav-dot"/></button>
      <button className="nav-item" onClick={() => setStatus("V1 analytics coming soon")}><Activity size={17}/> Analytics</button>
      <button className="nav-item" onClick={() => setStatus("Export history coming soon")}><Film size={17}/> Export history</button>
      <div className="sidebar-bottom"><div className="status-indicator"/><span>LOCAL WORKSPACE</span><span className="version">V1.0</span></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="eyebrow">VIDEO INTELLIGENCE / WORKSPACE</span><h1>Clipper studio</h1></div><div className="top-actions"><span className="live-status"><i/> {status}</span><div className="avatar">M</div></div></header>
      <section className="intro"><div><div className="eyebrow accent">LONG-FORM IN. SHORT-FORM OUT.</div><h2>Find the moment.<br/><em>Shape the story.</em></h2><p>Analyze, shortlist, refine, and export clips from your long-form content.</p></div><div className="intro-icon"><WandSparkles size={34}/><span>AI ASSISTED<br/>MANUAL CONTROL</span></div></section>

      <div className="content-grid">
        <section className="panel source-panel">
          <div className="panel-heading"><div className="step">01</div><div><h3>Source & transcript</h3><p>Start with a YouTube reference and timestamped transcript.</p></div></div>
          <label className="field-label">YOUTUBE SOURCE URL <span>OPTIONAL REFERENCE</span></label>
          <div className="url-field"><Link2 size={17}/><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."/></div>
          <div className="field-row"><label className="field-label">TIMESTAMPED TRANSCRIPT</label><button className="text-button" onClick={() => setTranscript("00:00 Welcome back, today we are talking about a decision that changed everything.\n00:08 At first I thought it was a terrible idea.\n00:16 But then something unexpected happened.\n00:24 The biggest lesson is that you need to understand the problem first.\n00:33 And that is where most people get it wrong.\n00:42 Once I changed that, the result was completely different.\n00:51 I wish someone had explained this to me earlier.")}>Load sample</button></div>
          <textarea className="transcript-input" value={transcript} onChange={e => setTranscript(e.target.value)} placeholder={"00:00 First sentence from the video...\n00:07 Next sentence...\n00:15 Another sentence..."} rows={8}/>
          <div className="hint"><FileText size={14}/> Format: <code>MM:SS text</code> or <code>HH:MM:SS text</code>, one segment per line.</div>
          {error && <div className="error"><X size={14}/>{error}</div>}
          <div className="action-row"><button className="secondary-button" onClick={loadDemo}>Load demo clips</button><button className="primary-button" onClick={analyze} disabled={busy}>{busy ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} Analyze with AI</button></div>
          {!API && <div className="notice"><Settings2 size={15}/> AI endpoint belum dikonfigurasi. Saat ini tombol analisis membuat kandidat lokal dari timestamp, bukan analisis AI sungguhan.</div>}
        </section>

        <section className="panel candidates-panel">
          <div className="panel-heading"><div className="step">02</div><div><h3>Highlight candidates</h3><p>{clips.length} selected moments · Max 40 seconds each</p></div><span className="count">{clips.length.toString().padStart(2,"0")}</span></div>
          {clips.length === 0 ? <div className="empty-state"><div className="empty-icon"><AudioLines size={25}/></div><b>No highlights yet</b><span>Analyze a transcript or load demo clips to see candidates here.</span></div> :
            <div className="clip-list">{clips.map((clip, i) => <button key={clip.id} className={`clip-card ${selected?.id === clip.id ? "selected" : ""}`} onClick={() => setActive(clip.id)}><div className="clip-index">{String(i+1).padStart(2,"0")}</div><div className="clip-info"><b>{clip.title}</b><span>{toTime(clip.start)} – {toTime(clip.end)} · {Math.round(clip.end-clip.start)}s</span><small>{clip.hook}</small></div><div className="score"><b>{clip.score}</b><span>SCORE</span></div></button>)}</div>}
          {selected && <div className="candidate-detail"><div className="detail-title"><Sparkles size={15}/> AI EDITOR NOTES</div><p>{selected.reason}</p><div className="structure">{selected.structure}</div></div>}
        </section>
      </div>

      <section className="panel editor-panel">
        <div className="panel-heading"><div className="step">03</div><div><h3>Manual clip editor</h3><p>Load your authorized local video, review the selected moment, and adjust the cut.</p></div><span className="manual-tag"><Check size={13}/> HUMAN CONTROL</span></div>
        <div className="editor-grid">
          <div className="preview">
            {videoUrl ? <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={e => setDuration(e.currentTarget.duration)} /> : <button className="upload-zone" onClick={() => fileRef.current?.click()}><Upload size={25}/><b>Upload local video</b><span>MP4, WebM or supported browser format</span><small>Video stays in your browser</small></button>}
            <input ref={fileRef} type="file" accept="video/*" hidden onChange={e => uploadVideo(e.target.files?.[0])}/>
            {videoUrl && <div className="video-meta"><span><Film size={13}/> {videoName}</span><button onClick={() => fileRef.current?.click()}>Replace</button></div>}
          </div>
          <div className="edit-controls">
            <div className="control-heading"><Scissors size={16}/> CUT SETTINGS <span>MAX 00:40</span></div>
            {selected ? <>
              <label className="field-label">CLIP TITLE</label><input className="control-input" value={selected.title} onChange={e => setClips(old => old.map(c => c.id === selected.id ? {...c,title:e.target.value}:c))}/>
              <div className="time-fields"><div><label className="field-label">START (SECONDS)</label><input type="number" min="0" value={selected.start} onChange={e => updateSelected("start", Number(e.target.value))}/></div><div><label className="field-label">END (SECONDS)</label><input type="number" min="0" value={selected.end} onChange={e => updateSelected("end", Number(e.target.value))}/></div></div>
              <div className="duration-line"><Clock3 size={14}/> Duration <b>{Math.max(0, selected.end-selected.start).toFixed(1)}s</b><span>{duration ? `Source ${toTime(duration)}` : "Source not loaded"}</span></div>
              <div className="control-buttons"><button className="secondary-button" onClick={() => seek(selected.start)}><Play size={14}/> Preview start</button><button className="primary-button" onClick={exportClip}><ArrowDownToLine size={15}/> Export clip</button></div>
            </> : <div className="no-selection">Choose a highlight candidate to edit its cut.</div>}
          </div>
        </div>
      </section>
      <footer><span>MAECLIP / PERSONAL CLIPPING SYSTEM</span><span>BUILT FOR CONTROL, NOT AUTOPILOT.</span></footer>
    </main>
  </div>;
}