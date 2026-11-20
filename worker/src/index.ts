import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = { AI: Ai; APP_ORIGIN: string };
const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  const origin = c.env.APP_ORIGIN || "*";
  return cors({ origin, allowMethods: ["POST", "GET", "OPTIONS"], allowHeaders: ["Content-Type"] })(c, next);
});

app.get("/api/health", c => c.json({ ok: true, service: "maeclip-api", version: "1.0.0" }));

app.post("/api/analyze", async c => {
  try {
    const body = await c.req.json<{ transcript?: string; sourceUrl?: string; maxDuration?: number; language?: string }>();
    const transcript = body.transcript?.trim();
    if (!transcript || transcript.length < 30) return c.json({ error: "Transcript is too short. Provide timestamped transcript text." }, 400);
    if (transcript.length > 60000) return c.json({ error: "Transcript exceeds the 60,000 character limit." }, 413);

    const prompt = `You are MAECLIP, a short-form video editor. Analyze this timestamped transcript and return JSON only.
Find up to 8 engaging, context-preserving clips. Each clip must be 8 to ${Math.min(40, Math.max(8, body.maxDuration || 40))} seconds.
Prioritize strong opening hooks, curiosity, humor, surprising insights, emotional moments, and clear payoff. Do not fabricate quotes or events.
Timestamps in transcript are seconds in MM:SS or HH:MM:SS. Estimate end from the next timestamps. Keep start/end within transcript coverage.
Return exactly this shape: {"clips":[{"title":"...","start":12,"end":42,"hook":"...","reason":"...","score":85,"structure":"Hook → context → payoff"}]}
Score from 0 to 100. Use concise Indonesian explanations unless the transcript is clearly English.
SOURCE: ${body.sourceUrl || "Not supplied"}
TRANSCRIPT:
${transcript}`;

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a precise video editor. Output valid JSON only. Never include markdown fences." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1800
    }) as { response?: string };

    const raw = response.response || "";
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return c.json({ error: "AI returned an unreadable response. Try again." }, 502);
    const parsed = JSON.parse(jsonText) as { clips?: Array<Record<string, unknown>> };
    const clips = (parsed.clips || []).map((clip, index) => {
      const start = Number(clip.start), end = Number(clip.end);
      return {
        id: crypto.randomUUID(),
        title: String(clip.title || `Candidate ${index + 1}`).slice(0, 100),
        start: Math.max(0, start),
        end: Math.max(0, Math.min(end, start + 40)),
        hook: String(clip.hook || "").slice(0, 240),
        reason: String(clip.reason || "").slice(0, 500),
        score: Math.max(0, Math.min(100, Number(clip.score) || 0)),
        structure: String(clip.structure || "").slice(0, 300)
      };
    }).filter(x => Number.isFinite(x.start) && Number.isFinite(x.end) && x.end > x.start + 1 && x.end - x.start <= 40).slice(0, 8);
    return c.json({ clips });
  } catch (error) {
    console.error("analyze_error", error);
    return c.json({ error: "Analysis failed. Check the Worker AI binding and transcript format." }, 500);
  }
});

app.notFound(c => c.json({ error: "Route not found" }, 404));
export default app;