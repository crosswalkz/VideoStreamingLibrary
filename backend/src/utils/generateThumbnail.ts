import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export async function generateThumbnail(videoPath: string, videoId: string): Promise<string> {
  const thumbnailDir = path.join(process.cwd(), 'thumbnails');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);
  const absoluteVideoPath = path.resolve(videoPath);

  const command = `ffmpeg -ss 00:00:05 -i "${absoluteVideoPath}" -vframes 1 "${thumbnailPath}"`;
  await execPromise(command);

  return `thumbnails/${videoId}.jpg`;
}
