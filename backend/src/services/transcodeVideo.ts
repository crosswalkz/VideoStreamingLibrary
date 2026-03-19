import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { VIDEO_STATUS } from '../config/constants';

const execAsync = promisify(exec);

const STREAMS_BASE = path.join(__dirname, '../../streams');

export async function transcodeVideo(
  videoId: string,
  inputPath: string
): Promise<void> {
  await prisma.video.update({
    where: { id: videoId },
    data: { status: VIDEO_STATUS.PROCESSING },
  });

  const outputDir = path.join(STREAMS_BASE, videoId);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'master.m3u8');

  const command = `ffmpeg -i "${inputPath}" -codec:v libx264 -codec:a aac -strict -2 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "${outputPath}"`;

  try {
    await execAsync(command);
  } catch (error) {
    console.error('Transcoding failed:', error);
    await prisma.video.update({
      where: { id: videoId },
      data: { status: VIDEO_STATUS.FAILED },
    });
    return;
  }

  const streamPathRelative = `streams/${videoId}/master.m3u8`;

  await prisma.video.update({
    where: { id: videoId },
    data: {
      status: VIDEO_STATUS.READY,
      streamPath: streamPathRelative,
    },
  });

  console.log('Transcoding complete:', videoId);
}
