STAGE 1 — PROJECT SETUP (Completed)

Objective
Initialize backend project and server.

Tasks

• Create project structure
• Setup Node.js + TypeScript
• Install Express
• Create base server
• Add health check endpoint

Endpoint

GET /health

Expected Response

{ "status": "ok" }

Checkpoint

Server runs successfully.

STAGE 2 — VIDEO UPLOAD SYSTEM (Completed)

Objective
Upload video files to the server.

Tasks

• Install multer
• Create upload controller
• Create POST upload endpoint
• Generate UUID for videoId
• Save videos locally
• Validate video types
• Set file size limit

Endpoint

POST /videos/upload

Storage

uploads/

Flow

Client Upload
   ↓
Server saves file
   ↓
videoId returned

Checkpoint

Video appears inside uploads folder.

STAGE 3 — DATABASE INTEGRATION (Completed)

Objective
Store video metadata.

Database
PostgreSQL

ORM
Prisma

Table

Video

id
title
uploadPath
streamPath
status
createdAt

Status lifecycle

uploading
processing
ready
failed

Flow

Upload complete
↓
Create DB record
↓
status = processing

Checkpoint

Uploading video creates DB entry.

STAGE 4 — VIDEO TRANSCODING PIPELINE (Completed)

Objective
Convert uploaded videos into HLS.

Tool
FFmpeg

Output structure

streams/
   videoId/
      master.m3u8
      segment0.ts
      segment1.ts

Flow

Upload complete
↓
Trigger transcoding
↓
FFmpeg converts video
↓
Segments generated
↓
status = ready

Checkpoint

Streams folder contains .m3u8 and .ts.

STAGE 5 — STREAMING API (Completed)

Objective
Serve HLS playlist and segments.

Routes

GET /streams/:videoId/master.m3u8
GET /streams/:videoId/:segment

Implementation

Serve streams folder via Express static middleware.

Checkpoint

Opening playlist URL shows HLS playlist.

STAGE 6 — VIDEO LIST API (NEW)

Objective
Provide list of uploaded videos.

Endpoint

GET /videos

Response

[
  {
    "id": "video123",
    "status": "ready"
  }
]

Flow

Frontend
↓
fetch videos
↓
display library

Checkpoint

Frontend can list videos.

STAGE 7 — VIDEO PLAYER FRONTEND (NEW)

Objective
Play videos in browser.

Library
hls.js

Flow

User opens page
↓
fetch video list
↓
select video
↓
load master.m3u8
↓
stream segments

Checkpoint

Video plays smoothly.

STAGE 8 — VIDEO DELETE SYSTEM

Objective
Safely delete videos.

Endpoint

DELETE /videos/:id

Operations

delete DB record
delete uploads file
delete streams folder

Checkpoint

All related files removed.

STAGE 9 — TRANSCODING PROGRESS TRACKING (To be done later)

Objective
Track encoding progress.

Add DB column

progress INT

Status example

processing 15%
processing 42%
processing 80%
ready

Checkpoint

Progress visible through API.

STAGE 10 — VIDEO METADATA EXTRACTION (Completed)

Objective
Extract video information from uploaded videos using ffprobe (FFmpeg) and store in the database.

Using
ffprobe (part of FFmpeg)

Extract and store in DB

duration (Float)
width (Int)
height (Int)
codec (String)
bitrate (Int)

Flow: Upload → Save file → Extract metadata → Update DB → Start transcoding.

Checkpoint
GET /videos and GET /videos/:id responses include duration, width, height, codec, bitrate.

STAGE 11 — THUMBNAIL GENERATION

Objective
Generate preview image.

Output

thumbnails/{videoId}.jpg

Example command

ffmpeg -ss 00:00:05 -i video.mp4 -vframes 1 thumbnail.jpg

Checkpoint

Thumbnails appear in UI.

STAGE 12 — EDGE CASE HANDLING

Cases

1 Upload interrupted
2 DB record exists but file missing
3 File exists but DB record missing
4 Transcoding fails
5 Stream deleted but source exists
6 Source deleted but stream exists
7 Both source and stream missing
8 Streaming before transcoding
9 Concurrent transcoding jobs
10 Large file uploads

Checkpoint

System handles failures gracefully.

STAGE 13 — STORAGE AUDITOR WORKER

Objective
Detect inconsistencies automatically.

Worker checks

DB vs uploads
DB vs streams

Example

DB says ready
but stream missing
→ mark corrupted

Checkpoint

System self-heals inconsistencies.

STAGE 14 — ADAPTIVE BITRATE STREAMING (ADVANCED)

Generate multiple resolutions.

Example

360p
720p
1080p

Structure

streams/
  videoId/
    360p/
    720p/
    1080p/
    master.m3u8

Player auto-switches quality.

This is the core of HTTP Live Streaming.

Checkpoint

Video quality auto-adjusts.

FINAL SYSTEM ARCHITECTURE
Frontend
   │
   ▼
Node API
   │
   ├── PostgreSQL (metadata)
   ├── uploads (original videos)
   ├── streams (HLS segments)
   ├── thumbnails
   └── FFmpeg worker