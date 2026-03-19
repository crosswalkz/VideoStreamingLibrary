'use client';

import { useState } from 'react';
import SpinnerIcon from '../assets/SpinnerIcon';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  /** 'danger' for destructive actions (red confirm button), 'primary' for default (e.g. violet) */
  variant?: 'danger' | 'primary';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = 'primary',
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmClass =
    variant === 'danger'
      ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
      : 'rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="confirm-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        {message && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={confirmClass}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                …
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </>
  );
}
