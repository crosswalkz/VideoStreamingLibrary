# Video Streaming Project Progress

## Current Stage

Stage 8 — Delete Video

## Completed

* Project folder initialized
* TypeScript backend setup
* Express server created
* Video upload endpoint created
* Files stored locally in uploads folder
* PostgreSQL connected
* Video table created (Prisma migration)
* Prisma client generated
* Backend can access database via `src/lib/prisma.ts`
* Stage 3B: Video metadata stored in DB on upload (id, title, uploadPath, streamPath, status, createdAt)
* Stage 4: FFmpeg transcoding to HLS; `streams/{videoId}/master.m3u8` + segments; status `processing` → `ready` or `failed`
* Stage 5: Static serving of streams at `/streams`; GET `/videos/:id` returns video metadata
* Stage 6: GET `/videos` list API with pagination (`page`, `limit`) and optional `status` filter; edge cases handled (invalid page/limit, invalid status, page beyond total)
* Stage 7: Next.js frontend with sidebar (Videos section), video grid (GET /videos), click → `/video/[id]`, HLS playback via hls.js using slug and GET /videos/:id
* Stage 8: DELETE `/videos/:id` — delete not allowed when status is `uploaded` or `processing`; frontend delete control on grid and detail page, disabled for uploading/processing

## Checkpoint

At this stage:

* Frontend runs on port 3001 (`cd frontend && npm run dev`). Backend on 3000.
* Home: sidebar, search, video grid with delete icon per card (disabled while uploading/processing).
* `/video/[id]`: playback, back link, delete button (disabled while uploading/processing); on delete success redirect to home.

## Next Stage

Further frontend or backend improvements (e.g. sort, rate limiting, confirmation dialog before delete).

## Suggested edge cases / improvements (for later)

* **Sort order**: Allow `?sort=createdAt` and `?order=asc|desc` (default: `createdAt` desc).
* **Empty DB**: Already handled (total=0, totalPages=1, empty videos array).
* **Rate limiting**: Consider rate limiting on GET /videos and upload to avoid abuse.
* **Caching**: Optional short-lived cache or `Cache-Control` for list response when data doesn’t change often.
* **Validation layer**: Move query parsing/validation (page, limit, status) into a small middleware or validator so the controller stays thin.
