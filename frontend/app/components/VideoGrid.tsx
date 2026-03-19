'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import ConfirmDialog from './ConfirmDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PAGE_SIZE = 20;

interface Video {
  id: string;
  title: string | null;
  uploadPath: string;
  streamPath: string | null;
  thumbnailPath?: string | null;
  status: string;
  duration?: number | null;
  createdAt: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ListResponse {
  videos: Video[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

interface VideoGridProps {
  refreshTrigger?: number;
  searchQuery?: string;
}

function Spinner() {
  return (
    <svg
      className="h-10 w-10 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function VideoGrid({ refreshTrigger = 0, searchQuery = '' }: VideoGridProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [hasNext, setHasNext] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevRefreshTriggerRef = useRef(refreshTrigger);
  const prevSearchQueryRef = useRef<string | undefined>(undefined);
  const fetchGenerationRef = useRef(0);

  const fetchPage = useCallback(async (pageNum: number, append: boolean, search: string) => {
    const thisGeneration = fetchGenerationRef.current;
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/videos?${params.toString()}`);
      const data: ListResponse = await res.json();
      if (!res.ok) {
        if (!append) setError('Failed to load videos');
        if (append) setIsLoadingMore(false);
        return;
      }
      if (thisGeneration !== fetchGenerationRef.current) return;
      if (append) {
        setVideos((prev) => {
          const ids = new Set(prev.map((v) => v.id));
          const newVideos = data.videos.filter((v) => !ids.has(v.id));
          return newVideos.length === 0 ? prev : [...prev, ...newVideos];
        });
      } else {
        setVideos(data.videos);
      }
      setHasNext(data.pagination.hasNext);
      setPage(data.pagination.page + 1);
    } catch {
      if (thisGeneration !== fetchGenerationRef.current) return;
      if (!append) setError('Failed to load videos');
      if (append) setIsLoadingMore(false);
    } finally {
      if (thisGeneration !== fetchGenerationRef.current) return;
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setError(null);
    setPage(1);
    setHasNext(true);
    fetchGenerationRef.current += 1;

    const isRefresh = prevRefreshTriggerRef.current !== refreshTrigger;
    const isFirstLoad = prevSearchQueryRef.current === undefined;

    if (isRefresh || isFirstLoad) {
      setVideos([]);
      setIsLoading(true);
    }

    prevRefreshTriggerRef.current = refreshTrigger;
    prevSearchQueryRef.current = searchQuery;

    fetchPage(1, false, searchQuery);
  }, [refreshTrigger, searchQuery, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasNext || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    fetchPage(page, true, searchQuery);
  }, [hasNext, isLoadingMore, isLoading, page, searchQuery, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const refetchFromStart = useCallback(() => {
    setVideos([]);
    setPage(1);
    setHasNext(true);
    setIsLoading(true);
    fetchPage(1, false, searchQuery);
  }, [fetchPage, searchQuery]);

  const handleRetry = async (e: React.MouseEvent, videoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRetryingId(videoId);
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/retry`, { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        refetchFromStart();
      }
    } finally {
      setRetryingId(null);
    }
  };

  const performDiscard = useCallback(
    async (videoId: string) => {
      setDeletingId(videoId);
      try {
        const res = await fetch(`${API_URL}/videos/${videoId}/discard`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          refetchFromStart();
        }
      } finally {
        setDeletingId(null);
      }
    },
    [refetchFromStart]
  );

  const handleDeleteClick = (e: React.MouseEvent, videoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDiscardId(videoId);
  };

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-red-600 dark:text-red-400">
        {error}.
      </div>
    );
  }

  if (isLoading && videos.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-video animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500 dark:text-zinc-400">
        No videos yet.
      </div>
    );
  }

  const cardBase =
    'relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900';
  const thumbnailBase = 'relative aspect-video bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center';

  const renderDeleteButton = (video: Video, canDelete: boolean) => {
    const isDeleting = deletingId === video.id;
    return (
      <button
        type="button"
        onClick={(e) => (canDelete ? handleDeleteClick(e, video.id) : e.stopPropagation())}
        disabled={!canDelete || isDeleting}
        title={canDelete ? 'Discard video' : 'Cannot discard while uploading or processing'}
        className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 hover:ring-2 hover:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black/50 disabled:hover:ring-0"
        aria-label={canDelete ? 'Discard video' : 'Cannot discard while uploading or processing'}
      >
        {isDeleting ? (
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => {
        const isReady = video.status === 'ready';
        const isUploaded = video.status === 'uploaded';
        const isProcessing = video.status === 'processing';
        const isFailed = video.status === 'failed';
        const isTerminated = video.status === 'terminated';
        const isPending = isUploaded || isProcessing;

        const thumbnailUrl = video.thumbnailPath
          ? `${API_URL}/${video.thumbnailPath}`
          : null;

        const thumbnail = (
          <div className={`${thumbnailBase} ${isReady ? 'cursor-pointer' : ''}`}>
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            {isReady && (
              <>
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-violet-500 dark:group-hover:text-violet-400">
                  <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                {video.duration != null && video.duration > 0 && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-xs font-medium text-white">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </>
            )}
            {isPending && (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
                  <Spinner />
                  <span className="text-xs font-medium text-white drop-shadow">
                    {isUploaded ? 'Waiting to get processed' : 'Transcoding video'}
                  </span>
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-amber-600/90 px-2 py-0.5 text-xs text-white">
                  {isUploaded ? 'Uploaded' : 'Processing'}
                </span>
              </>
            )}
            {isFailed && (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                  <button
                    type="button"
                    onClick={(e) => handleRetry(e, video.id)}
                    disabled={retryingId === video.id}
                    className="rounded-full bg-sky-600 p-3 text-white hover:bg-sky-700 disabled:opacity-50"
                    aria-label="Retry transcoding"
                  >
                    {retryingId === video.id ? (
                      <svg
                        className="h-8 w-8 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {retryingId !== video.id && (<span className="absolute bottom-2 right-2 rounded bg-red-600/90 px-2 py-0.5 text-xs text-white">
                  Failed
                </span>)}
              </>
            )}
            {isTerminated && (
              <>
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 dark:text-zinc-500 opacity-60">
                  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-zinc-600/90 px-2 py-0.5 text-xs text-white">
                  Terminated
                </span>
              </>
            )}
          </div>
        );

        const titleClampStyle: React.CSSProperties = {
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        };
        const title = (
          <div className="min-w-0 overflow-hidden p-3">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100" style={titleClampStyle}>
              {video.title || `Video ${video.id.slice(0, 8)}`}
            </h3>
          </div>
        );

        if (isReady) {
          return (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className={`group ${cardBase} hover:shadow-md`}
            >
              {thumbnail}
              {renderDeleteButton(video, !isPending)}
              <h3
                className="min-w-0 overflow-hidden p-3 font-medium text-zinc-900 dark:text-zinc-100"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {video.title || `Video ${video.id.slice(0, 8)}`}
              </h3>
            </Link>
          );
        }

        return (
          <div
            key={video.id}
            className={`${cardBase} ${isTerminated ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {thumbnail}
            {renderDeleteButton(video, !isPending)}
            {title}
          </div>
        );
      })}
      <div ref={sentinelRef} className="col-span-full flex justify-center py-8" aria-hidden>
        {isLoadingMore && (
          <svg
            className="h-8 w-8 animate-spin text-zinc-400 dark:text-zinc-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>
    </div>
    <ConfirmDialog
      isOpen={confirmDiscardId !== null}
      onClose={() => setConfirmDiscardId(null)}
      title="Discard video?"
      message="This will remove the video from the list and delete its files. This cannot be undone."
      confirmLabel="Discard"
      cancelLabel="Cancel"
      onConfirm={async () => {
        if (confirmDiscardId) await performDiscard(confirmDiscardId);
      }}
      variant="danger"
    />
    </>
  );
}
