'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of the given value.
 * The debounced value updates only after `delayMs` has passed without the value changing.
 *
 * @param value - The value to debounce (e.g. input state)
 * @param delayMs - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debouncedValue;
}
