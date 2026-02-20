/**
 * useSessionForm — Persist form state to sessionStorage across page navigations.
 *
 * Generic hook that saves/restores form field values so users don't lose
 * their input on accidental navigation. Cleared on successful submission.
 */

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Persist a form value to sessionStorage under the given key.
 *
 * @param key - sessionStorage key (should be unique per form field)
 * @param initialValue - default value when nothing is stored
 * @returns [value, setValue, clearValue] tuple
 */
export function useSessionForm<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const keyRef = useRef(key);
  keyRef.current = key;

  const [value, setValueInternal] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Corrupted or unparseable data — fall back to initial
      sessionStorage.removeItem(key);
    }
    return initialValue;
  });

  // Persist to sessionStorage whenever value changes
  useEffect(() => {
    try {
      sessionStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // sessionStorage full or unavailable — silently ignore
    }
  }, [value]);

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueInternal(next);
  }, []);

  const clearValue = useCallback(() => {
    try {
      sessionStorage.removeItem(keyRef.current);
    } catch {
      // Ignore removal failures
    }
    setValueInternal(initialValue);
  }, [initialValue]);

  return [value, setValue, clearValue];
}
