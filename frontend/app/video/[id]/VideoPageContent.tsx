'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HlsPlayer from '../../components/HlsPlayer';
import Toast from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TITLE_MAX_LENGTH = 100;

export interface Video {
  id: string;
  title: string | null;
  uploadPath: string;
  streamPath: string | null;
  status: string;
  createdAt: string;
}

interface VideoPageContentProps {
  video: Video | null;
  message?: string | null;
}

export default function VideoPageContent({ video, message: initialMessage }: VideoPageContentProps) {
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setTitleOverride(null);
  }, [video?.id]);

  const displayTitle = titleOverride !== null ? titleOverride : (video?.title ?? null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const canDelete = video && video.status !== 'uploaded' && video.status !== 'processing';

  const startEditTitle = useCallback(() => {
    setEditTitleValue(displayTitle ?? '');
    setIsEditingTitle(true);
  }, [displayTitle]);

  const cancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
    setEditTitleValue('');
  }, []);

  const handleSaveTitle = useCallback(async () => {
    if (!video) return;
    const trimmed = editTitleValue.trim();
    if (trimmed.length > TITLE_MAX_LENGTH) {
      setToast(`Title must be at most ${TITLE_MAX_LENGTH} characters.`);
      return;
    }
    setIsSavingTitle(true);
    try {
      const res = await fetch(`${API_URL}/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setTitleOverride(data.title ?? null);
        setIsEditingTitle(false);
        setEditTitleValue('');
        setToast('Title updated.');
      } else {
        setToast(data.message || data.error || 'Failed to update title');
      }
    } catch {
      setToast('Failed to update title');
    } finally {
      setIsSavingTitle(false);
    }
  }, [video, editTitleValue]);

  const handleDiscard = useCallback(async () => {
    if (!video || !canDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/videos/${video.id}/discard`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.push('/');
      } else {
        setToast(data.message || data.error || 'Failed to discard video');
      }
    } catch {
      setToast('Failed to discard video');
    } finally {
      setIsDeleting(false);
    }
  }, [video, canDelete, router]);

  useEffect(() => {
    if (initialMessage) {
      setToast(initialMessage);
    }
  }, [initialMessage]);

  const streamUrl =
    video?.streamPath && video?.status === 'ready'
      ? `${API_URL}/${video.streamPath}`
      : null;

  if (!video) {
    return (
      <div className="p-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to videos
        </Link>
        <div className="flex aspect-video items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
          <p className="text-red-700 dark:text-red-300">Video not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to videos
        </Link>
        <button
          type="button"
          onClick={() => canDelete && setShowConfirmDiscard(true)}
          disabled={!canDelete || isDeleting}
          title={canDelete ? 'Discard video' : 'Cannot discard while uploading or processing'}
          className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          aria-label={canDelete ? 'Discard video' : 'Cannot discard while uploading or processing'}
        >
          {isDeleting ? 'Deleting…' : 'Discard video'}
        </button>
      </div>
      <ConfirmDialog
        isOpen={showConfirmDiscard}
        onClose={() => setShowConfirmDiscard(false)}
        title="Discard video?"
        message="This will remove the video from the list and delete its files. This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Cancel"
        onConfirm={handleDiscard}
        variant="danger"
      />
      <div className="mb-4">
        {isEditingTitle ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="Video title"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xl font-semibold text-zinc-900 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
              aria-label="Edit video title"
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {editTitleValue.length}/{TITLE_MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveTitle}
                disabled={isSavingTitle}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {isSavingTitle ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEditTitle}
                disabled={isSavingTitle}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {displayTitle || `Video ${video.id.slice(0, 8)}`}
            </h1>
            <button
              type="button"
              onClick={startEditTitle}
              title="Edit title"
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              aria-label="Edit title"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <HlsPlayer
        streamUrl={streamUrl}
        status={video.status}
        onError={showToast}
      />
      {toast && (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
