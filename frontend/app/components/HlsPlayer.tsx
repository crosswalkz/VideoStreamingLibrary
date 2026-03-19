'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  streamUrl: string | null;
  status: string;
  onError?: (message: string) => void;
}

export default function HlsPlayer({ streamUrl, status, onError }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || status !== 'ready') return;

    const reportError = (msg: string) => {
      onError?.(msg);
    };

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          reportError(data.details || 'Playback failed');
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      return () => {
        hls.destroy();
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      const onVideoError = () => reportError('Playback failed');
      video.addEventListener('error', onVideoError);
      video.src = streamUrl;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      return () => {
        video.removeEventListener('error', onVideoError);
      };
    }
  }, [streamUrl, status, onError]);

  if (status !== 'ready' || !streamUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
        {status === 'processing' && 'Video is still processing. Try again later.'}
        {status === 'failed' && 'This video failed to process.'}
        {status === 'terminated' && 'This video is no longer available.'}
        {status === 'ready' && !streamUrl && 'Stream URL is missing.'}
      </div>
    );
  }

  return (
    <div className="aspect-video max-h-[70vh] w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        controls
        playsInline
        autoPlay
        // muted
      />
    </div>
  );
}
