import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

interface FfprobeStream {
  codec_type: string;
  width?: number;
  height?: number;
  codec_name?: string;
  bit_rate?: string;
}

interface FfprobeFormat {
  duration?: string;
  bit_rate?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
}

export async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const escapedPath = path.resolve(filePath);
  const command = `ffprobe -v quiet -print_format json -show_streams -show_format "${escapedPath}"`;
  const { stdout } = await execPromise(command);
  const data: FfprobeOutput = JSON.parse(stdout);

  const videoStream = data.streams?.find((stream) => stream.codec_type === 'video');
  if (!videoStream) {
    throw new Error('No video stream found');
  }

  const duration = data.format?.duration ? parseFloat(data.format.duration) : 0;
  const bitRateStr = videoStream.bit_rate || data.format?.bit_rate || '0';
  const bitrate = parseInt(bitRateStr, 10) || 0;

  return {
    duration,
    width: videoStream.width ?? 0,
    height: videoStream.height ?? 0,
    codec: videoStream.codec_name ?? 'unknown',
    bitrate,
  };
}
