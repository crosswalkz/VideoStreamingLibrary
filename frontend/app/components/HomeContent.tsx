'use client';

import { useState, useCallback } from 'react';
import VideoGrid from './VideoGrid';
import UploadModal from './UploadModal';
import Toast from './Toast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export default function HomeContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const handleUploadSuccess = useCallback(() => {
    setUploadSuccessToast('Video uploaded successfully. It will appear in the list once processing is complete.');
    setRefreshTrigger((c) => c + 1);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-xl flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search videos"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder-zinc-400"
            aria-label="Search videos"
          />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
      </div>
      <VideoGrid refreshTrigger={refreshTrigger} searchQuery={debouncedSearch} />
      <UploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
      {uploadSuccessToast && (
        <Toast
          message={uploadSuccessToast}
          onDismiss={() => setUploadSuccessToast(null)}
          variant="success"
        />
      )}
    </div>
  );
}
