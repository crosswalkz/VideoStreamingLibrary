import { Request, Response } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { transcodeVideo } from '../services/transcodeVideo';
import { sendSuccess, sendError } from '../utils/responseHandlers';
import { extractVideoMetadata } from '../utils/extractVideoMetadata';
import { generateThumbnail } from '../utils/generateThumbnail';
import { VIDEO_STATUS, VIDEO_STATUSES } from '../config/constants';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/mpeg',
];

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const isVideo = file.mimetype.startsWith('video/') || ALLOWED_VIDEO_MIMES.includes(file.mimetype);
  if (isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

// This is the multer middleware that is used to upload the video file and to check if the file is a video file.
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export async function handleVideoUpload(req: Request, res: Response): Promise<void> {
  const file = req.file!;
  const videoId = path.parse(file.filename).name;
  const uploadPath = `uploads/${file.filename}`;

  try {
    await prisma.video.create({
      data: {
        id: videoId,
        title: (req.body?.title as string) || null,
        uploadPath,
        streamPath: null,
        status: VIDEO_STATUS.UPLOADED,
      },
    });
  } catch (err) {
    console.error('Failed to store video metadata:', err);
    sendError(
      res,
      500,
      'Database error',
      'Video file was saved but metadata could not be stored.'
    );
    return;
  }

  try {
    const metadata = await extractVideoMetadata(file.path);
    await prisma.video.update({
      where: { id: videoId },
      data: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        bitrate: metadata.bitrate,
      } as Prisma.VideoUpdateInput,
    });
  } catch (metaErr) {
    console.error('Failed to extract video metadata for', videoId, metaErr);
    // Continue without metadata; transcoding still runs
  }

  try {
    const thumbnailPath = await generateThumbnail(file.path, videoId);
    await prisma.video.update({
      where: { id: videoId },
      data: { thumbnailPath } as Prisma.VideoUpdateInput,
    });
  } catch (thumbErr) {
    console.error('Failed to generate thumbnail for', videoId, thumbErr);
    // Continue without thumbnail
  }

  console.log('transcoding started for videoId: ', videoId);
  transcodeVideo(videoId, file.path).catch((err) =>
    console.error('Transcode error for', videoId, err)
  );

  sendSuccess(res, { videoId, filename: file.filename, message: 'Upload successful' }, 201);
}

export function handleUploadError(
  err: unknown,
  _req: Request,
  res: Response,
  _next: () => void
): void {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 413, 'File too large', 'Maximum file size is 500MB.');
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      sendError(
        res,
        400,
        'Invalid field',
        'Unexpected file field. Use the correct upload field name.'
      );
      return;
    }
  }

  if (err instanceof Error) {
    if (err.message === 'Only video files are allowed') {
      sendError(res, 400, 'Invalid file type', 'Only video files are allowed.');
      return;
    }
  }

  sendError(res, 500, 'Upload failed', 'An error occurred while uploading the file.');
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function listVideos(req: Request, res: Response): Promise<void> {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

    if (statusFilter !== undefined && statusFilter !== '') {
      if (!VIDEO_STATUSES.includes(statusFilter as (typeof VIDEO_STATUSES)[number])) {
        sendError(
          res,
          400,
          'Invalid status filter',
          `status must be one of: ${VIDEO_STATUSES.join(', ')}.`
        );
        return;
      }
    }

    let page = typeof rawPage === 'string' ? parseInt(rawPage, 10) : DEFAULT_PAGE;
    let limit = typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;

    if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const where: { status?: string | { not: string }; title?: { contains: string; mode: 'insensitive' } } = {};
    if (statusFilter !== undefined && statusFilter !== '') {
      where.status = statusFilter;
    } else {
      where.status = { not: VIDEO_STATUS.DISCARDED };
    }
    if (search && search !== '') {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [total, videos] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    sendSuccess(res, {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (error) {
    console.error('Failed to list videos:', error);
    sendError(res, 500, 'Failed to list videos', 'An error occurred while fetching the video list.');
  }
}

export async function getVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      sendError(res, 404, 'Video not found', 'No video found with the given id.');
      return;
    }

    // if the video is ready and the stream path is not found, then mark the video as failed
    if (video.status === VIDEO_STATUS.READY && video.streamPath) {
      const backendRoot = path.join(__dirname, '../..');
      const streamFilePath = path.join(backendRoot, video.streamPath);
      if (!fs.existsSync(streamFilePath)) {
        await prisma.video.update({
          where: { id },
          data: { status: VIDEO_STATUS.FAILED },
        });
        sendSuccess(res, {
          ...video,
          status: VIDEO_STATUS.FAILED,
          message: 'Stream file missing',
        });
        return;
      }
    }

    sendSuccess(res, video);
  } catch (error) {
    console.error('Failed to fetch video:', error);
    sendError(res, 500, 'Failed to fetch video', 'An error occurred while fetching the video.');
  }
}

export async function retryTranscode(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      sendError(res, 404, 'Video not found', 'No video found with the given id.');
      return;
    }

    if (video.status !== VIDEO_STATUS.FAILED) {
      sendError(
        res,
        400,
        'Invalid status',
        'Retry is only allowed for videos with status "failed".'
      );
      return;
    }

    const backendRoot = path.join(__dirname, '../..');
    const absolutePath = path.join(backendRoot, video.uploadPath);

    if (!fs.existsSync(absolutePath)) {
      await prisma.video.update({
        where: { id },
        data: { status: VIDEO_STATUS.TERMINATED },
      });
      sendSuccess(
        res,
        { message: 'Source file missing; video marked as terminated', status: VIDEO_STATUS.TERMINATED },
        200
      );
      return;
    }

    transcodeVideo(id, absolutePath).catch((err) =>
      console.error('Transcode error on retry for', id, err)
    );

    sendSuccess(res, { message: 'Retry started', status: VIDEO_STATUS.PROCESSING }, 202);
  } catch (error) {
    console.error('Failed to retry transcode:', error);
    sendError(res, 500, 'Failed to retry', 'An error occurred while starting retry.');
  }
}

export async function updateVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const rawTitle = req.body?.title;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      sendError(res, 404, 'Video not found', 'No video found with the given id.');
      return;
    }

    const title =
      rawTitle === undefined || rawTitle === null || (typeof rawTitle === 'string' && rawTitle.trim() === '')
        ? null
        : (typeof rawTitle === 'string' ? rawTitle.trim() : null);

    const updated = await prisma.video.update({
      where: { id },
      data: { title },
    });

    sendSuccess(res, updated);
  } catch (error) {
    console.error('Failed to update video:', error);
    sendError(res, 500, 'Failed to update video', 'An error occurred while updating the video.');
  }
}

export async function discardVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      sendError(res, 404, 'Video not found', 'No video found with the given id.');
      return;
    }

    if (
      video.status === VIDEO_STATUS.UPLOADED ||
      video.status === VIDEO_STATUS.PROCESSING
    ) {
      sendError(
        res,
        400,
        'Cannot discard',
        'Video cannot be discarded while it is uploading or processing. Wait for processing to complete or fail.'
      );
      return;
    }

    const backendRoot = path.join(__dirname, '../..');

    // Remove uploaded file if it exists
    const uploadFilePath = path.join(backendRoot, video.uploadPath);
    if (fs.existsSync(uploadFilePath)) {
      fs.unlinkSync(uploadFilePath);
    }

    // Remove stream directory if it exists
    const streamDir = path.join(backendRoot, 'streams', id);
    if (fs.existsSync(streamDir)) {
      fs.rmSync(streamDir, { recursive: true });
    }

    // Remove thumbnail if it exists
    const thumbnailPath = (video as { thumbnailPath?: string | null }).thumbnailPath;
    if (thumbnailPath) {
      const thumbnailFilePath = path.join(backendRoot, thumbnailPath);
      if (fs.existsSync(thumbnailFilePath)) {
        fs.unlinkSync(thumbnailFilePath);
      }
    }

    await prisma.video.update({
      where: { id },
      data: { status: VIDEO_STATUS.DISCARDED },
    });

    sendSuccess(res, { message: 'Video discarded' }, 200);
  } catch (error) {
    console.error('Failed to discard video:', error);
    sendError(res, 500, 'Failed to discard video', 'An error occurred while discarding the video.');
  }
}
