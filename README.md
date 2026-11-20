# MAECLIP V1

AI-assisted YouTube clipping workspace with manual clip controls.

## V1 features
- YouTube URL field as source reference (does not download video).
- Timestamped transcript input.
- Cloudflare Workers AI transcript analysis endpoint.
- Highlight candidate list with hook, reason, score, and timestamps.
- Local video upload and manual start/end adjustment.
- Browser-based WebM capture export where supported.
- Responsive dark workspace UI.

## Important limitations
- A YouTube URL alone is not enough to access or download the video's media or transcript. Provide a transcript you have permission to use.
- The local fallback creates rough timestamp-based suggestions, not genuine AI analysis.
- Browser capture export is experimental, WebM-only, and browser-dependent. It does not yet render a reliable vertical 9:16 MP4.
- For production-grade export, add a dedicated FFmpeg/WASM or server-side rendering pipeline in a later version.
- Use only video/audio you own or are authorized to edit.

## Run frontend locally
```bash
npm install
npm run dev
```

## Deploy API to Cloudflare Workers
```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```
Enable the Workers AI binding in your Cloudflare account. Update `APP_ORIGIN` in `worker/wrangler.toml` to your actual GitHub Pages origin.

Then set `VITE_API_BASE_URL` in `.env` to your deployed Worker URL:
```env
VITE_API_BASE_URL=https://maeclip-api.YOUR-SUBDOMAIN.workers.dev
```
Build frontend:
```bash
cd ..
npm run build
```

## Deploy frontend to GitHub Pages
1. Create a GitHub repository named `maeclip`.
2. Push this project to the repository.
3. In Settings → Pages, choose **GitHub Actions** as the build and deployment source.
4. Add repository variable `VITE_API_BASE_URL` with your Worker URL.
5. Commit/push. The included workflow builds and publishes `dist`.

If the repository is a project page at `https://USERNAME.github.io/maeclip/`, the workflow sets Vite base path to `/maeclip/`.

## Transcript format
One timestamped sentence per line:
```text
00:00 Opening sentence.
00:08 The next sentence.
01:12 A new moment begins.
00:01:25 Timestamp can include hours.
```
