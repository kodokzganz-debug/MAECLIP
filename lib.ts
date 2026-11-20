import type { Clip } from "./types";

export function toSeconds(value: string): number {
  const parts = value.trim().split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function toTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTranscript(text: string) {
  return text.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/);
    return match ? { timestamp: toSeconds(match[1]), text: match[2].trim() } : null;
  }).filter((item): item is { timestamp: number; text: string } => Boolean(item));
}

export function demoClips(): Clip[] {
  return [
    { id: crypto.randomUUID(), title: "The unexpected answer", start: 18, end: 49, hook: "“Gue nggak pernah menyangka hasilnya bakal begini...”", reason: "Ada pertanyaan yang memancing rasa penasaran, lalu jawaban yang punya payoff.", score: 88, structure: "Hook → konteks singkat → jawaban" },
    { id: crypto.randomUUID(), title: "A useful turning point", start: 92, end: 126, hook: "“Kesalahan terbesar justru dimulai dari sini.”", reason: "Pernyataan kuat dengan konteks yang relatif mudah dipahami.", score: 81, structure: "Pernyataan → penjelasan → kesimpulan" },
    { id: crypto.randomUUID(), title: "Funny moment", start: 204, end: 235, hook: "“Tunggu, bagian ini malah makin aneh.”", reason: "Perubahan emosi dan punchline membuat bagian ini berpotensi menghibur.", score: 76, structure: "Setup → reaksi → punchline" }
  ];
}